import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { ApprovalPendingError } from '@/lib/api-utils'
import type { AuthUser } from '@/types/auth'
import type { Ingredient } from '../types'
import { IngredientsPage } from './ingredients-page'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))
// Signed-in Firebase user the bulk deletion pins when it starts.
const session = vi.hoisted(() => ({ auth: { currentUser: null as { uid: string } | null } }))
vi.mock('@/lib/firebase', () => ({ auth: session.auth, getIdToken: vi.fn() }))

const CONSEQUENCES =
  'Dejarán de estar disponibles en el catálogo. Las dietas que ya los usan y el histórico de los clientes se conservan. No se puede deshacer desde el panel.'

const envelope = (data: unknown) => ({ data: { data } })

const ingredient = (id: string, name: string): Ingredient => ({
  id,
  name,
  icon: null,
  calories_per_100g: 100,
  protein_per_100g: 10,
  carbs_per_100g: 10,
  fat_per_100g: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-03T00:00:00Z',
})

const firstPage = [ingredient('i-1', 'Arroz integral'), ingredient('i-2', 'Pollo'), ingredient('i-3', 'Avena')]
const secondPage = [ingredient('i-11', 'Lentejas')]

function httpError(status: number, message: string) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, {
    status,
    statusText: 'error',
    headers: {},
    config,
    data: { statusCode: status, message, error: 'Error' },
  })
}

function mockGet() {
  api.get.mockImplementation((url: string, options?: { params?: Record<string, unknown> }) => {
    if (url === '/ingredients') {
      const pageNumber = Number(options?.params?.page ?? 1)
      const data = pageNumber === 2 ? secondPage : firstPage
      return Promise.resolve(envelope({ data, total: 13, totalPages: 2, page: pageNumber, limit: 10 }))
    }
    return Promise.resolve(envelope([]))
  })
}

function setRole(role: AuthUser['role']) {
  useAuth.setState({ user: { id: 'u-1', email: 'admin@example.test', role, profile: null } })
}

function Location() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderPage(entry = '/ingredients') {
  mockGet()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <TooltipProvider>
          <IngredientsPage />
        </TooltipProvider>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

async function selectIngredients(...names: string[]) {
  for (const name of names) {
    await user.click(await screen.findByLabelText(`Seleccionar ${name}`))
  }
}

let user: ReturnType<typeof userEvent.setup>

const deletedUrls = () => api.delete.mock.calls.map(([url]) => url)

describe('IngredientsPage bulk delete', { timeout: 15000 }, () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset()
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.info).mockClear()
    vi.mocked(toast.error).mockClear()
    vi.mocked(toast.warning).mockClear()
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
    setRole('SUPER_ADMIN')
    session.auth.currentUser = { uid: 'u-1' }
    user = userEvent.setup({ delay: null })
  })

  it('shows the selection bar with the count and a destructive delete action', async () => {
    renderPage()
    expect(await screen.findByText('Arroz integral')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Acciones de selección de ingredientes' })).not.toBeInTheDocument()

    await selectIngredients('Arroz integral', 'Pollo')

    const bar = screen.getByRole('region', { name: 'Acciones de selección de ingredientes' })
    expect(within(bar).getByText('2 seleccionados')).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Eliminar (2)' })).toBeInTheDocument()
    await user.click(within(bar).getByRole('button', { name: 'Limpiar selección' }))
    expect(screen.queryByRole('region', { name: 'Acciones de selección de ingredientes' })).not.toBeInTheDocument()
  })

  it('deletes every selected ingredient in order, clears the selection and toasts once', async () => {
    api.delete.mockResolvedValue({ data: '', status: 204 })
    renderPage()
    await selectIngredients('Arroz integral', 'Pollo')

    await user.click(screen.getByRole('button', { name: 'Eliminar (2)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 2 ingredientes' })
    expect(within(dialog).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Arroz integral',
      'Pollo',
    ])
    expect(within(dialog).getByText(CONSEQUENCES)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 2 ingredientes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.delete.mock.calls).toEqual([
      ['/ingredients/i-1', { suppressApprovalToast: true }],
      ['/ingredients/i-2', { suppressApprovalToast: true }],
    ])
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('2 ingredientes eliminados')
    expect(screen.queryByRole('button', { name: /^Eliminar \(/ })).not.toBeInTheDocument()
  })

  it('selects the whole page with the header checkbox and deletes it', async () => {
    api.delete.mockResolvedValue({ data: '', status: 204 })
    renderPage()
    await user.click(await screen.findByRole('checkbox', { name: 'Seleccionar página' }))

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 ingredientes' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 3 ingredientes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(deletedUrls()).toEqual(['/ingredients/i-1', '/ingredients/i-2', '/ingredients/i-3'])
  })

  it('keeps only the failed ingredients selected and shows the server reason', async () => {
    api.delete.mockImplementation((url: string) => {
      if (url === '/ingredients/i-2') return Promise.reject(httpError(409, 'El ingrediente está en uso'))
      if (url === '/ingredients/i-3') return Promise.reject(httpError(403, 'No tienes permiso'))
      return Promise.resolve({ data: '', status: 204 })
    })
    renderPage()
    await selectIngredients('Arroz integral', 'Pollo', 'Avena')

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 ingredientes' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 3 ingredientes' }))

    const result = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(deletedUrls()).toEqual(['/ingredients/i-1', '/ingredients/i-2', '/ingredients/i-3'])
    expect(within(result).getByRole('status')).toHaveTextContent('1 eliminado, 2 fallidos.')
    const failed = within(result).getByRole('region', { name: 'Fallidos (2)' })
    expect(failed).toHaveTextContent('Pollo: El ingrediente está en uso')
    expect(failed).toHaveTextContent('Avena: No tienes permiso')
    expect(toast.warning).toHaveBeenCalledTimes(1)
    expect(toast.success).not.toHaveBeenCalled()

    await user.click(within(result).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Eliminar (2)' }))
    const retry = await screen.findByRole('dialog', { name: 'Eliminar 2 ingredientes' })
    expect(within(retry).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Pollo', 'Avena'])
  })

  it('sends ADMIN deletions to approval with a single summary toast', async () => {
    setRole('ADMIN')
    api.delete.mockImplementation((url: string) =>
      Promise.reject(new ApprovalPendingError({ approval_request_id: `req-${url}`, message: 'Pendiente' }))
    )
    renderPage()
    await selectIngredients('Arroz integral', 'Pollo', 'Avena')

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 ingredientes' })
    expect(within(dialog).getByText(/Tu rol necesita aprobación/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Solicitar eliminación' }))

    const result = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(deletedUrls()).toEqual(['/ingredients/i-1', '/ingredients/i-2', '/ingredients/i-3'])
    expect(within(result).getByRole('region', { name: 'Enviados a aprobación (3)' })).toBeInTheDocument()
    expect(toast.info).toHaveBeenCalledTimes(1)
    expect(toast.info).toHaveBeenCalledWith('3 ingredientes enviados a aprobación')
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
    await user.click(within(result).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /^Eliminar \(/ })).not.toBeInTheDocument()
  })

  it('does not call the API when cancelled', async () => {
    renderPage()
    await selectIngredients('Arroz integral')

    await user.click(screen.getByRole('button', { name: 'Eliminar (1)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 1 ingrediente' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.delete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Eliminar (1)' })).toBeInTheDocument()
  })

  it('keeps the selection across pages, lists it by name and returns to page 1 after deleting', async () => {
    api.delete.mockResolvedValue({ data: '', status: 204 })
    renderPage()
    await selectIngredients('Arroz integral')
    await user.click(screen.getByRole('button', { name: /Siguiente/ }))
    await selectIngredients('Lentejas')
    expect(screen.queryByText('Arroz integral')).not.toBeInTheDocument()
    expect(screen.getByTestId('location').textContent).toBe('/ingredients?page=2')

    await user.click(screen.getByRole('button', { name: 'Eliminar (2)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 2 ingredientes' })
    expect(within(dialog).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Arroz integral',
      'Lentejas',
    ])
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 2 ingredientes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Back on page 1: the `page` parameter is dropped and the first page is shown again.
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/ingredients'))
    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument()
  })

  it('clears the selection when the search changes', async () => {
    renderPage()
    await selectIngredients('Arroz integral')
    expect(screen.getByRole('button', { name: 'Eliminar (1)' })).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Buscar por nombre...'), 'po')

    await waitFor(() => expect(screen.queryByRole('button', { name: /^Eliminar \(/ })).not.toBeInTheDocument())
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { ApprovalPendingError } from '@/lib/api-utils'
import type { AuthUser } from '@/types/auth'
import { DietsPage } from './diets-page'

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

const envelope = (data: unknown) => ({ data: { data } })

const diet = (id: string, name: string) => ({
  id,
  name,
  tags: [],
  total_calories: 2000,
  total_protein_g: 150,
  total_carbs_g: 200,
  total_fat_g: 60,
  is_active: true,
  created_by: null,
  created_at: '2026-01-15T12:00:00Z',
  updated_at: '2026-01-15T12:00:00Z',
  group_id: null,
  group: null,
  meals_count: 2,
  meals: [],
})

const firstPage = [diet('d-1', 'Definición A'), diet('d-2', 'Volumen B'), diet('d-3', 'Mantenimiento C')]
const secondPage = [diet('d-11', 'Otra dieta')]

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
    if (url === '/diets') {
      const pageNumber = Number(options?.params?.page ?? 1)
      const data = pageNumber === 2 ? secondPage : firstPage
      return Promise.resolve(envelope({ data, total: 13, totalPages: 2, page: pageNumber, limit: 10 }))
    }
    if (url === '/diets/tags') return Promise.resolve(envelope({ tags: [] }))
    if (url === '/diets/nutritional-badges') return Promise.resolve(envelope({ nutritional_badges: [] }))
    return Promise.resolve(envelope([]))
  })
}

function setRole(role: AuthUser['role']) {
  const user: AuthUser = { id: 'u-1', email: 'admin@example.test', role, profile: null }
  useAuth.setState({ user })
}

function renderPage() {
  mockGet()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/diets']}>
        <TooltipProvider>
          <DietsPage />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

async function selectDiets(...names: string[]) {
  for (const name of names) {
    await user.click(await screen.findByLabelText(`Seleccionar ${name}`))
  }
}

let user: ReturnType<typeof userEvent.setup>

const deletedUrls = () => api.delete.mock.calls.map(([url]) => url)

describe('DietsPage bulk delete', { timeout: 15000 }, () => {
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

  it('deletes every selected diet in order, clears the selection and toasts once', async () => {
    api.delete.mockResolvedValue({ data: '', status: 204 })
    renderPage()
    await selectDiets('Definición A', 'Volumen B')

    await user.click(screen.getByRole('button', { name: 'Eliminar (2)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 2 dietas' })
    expect(within(dialog).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Definición A',
      'Volumen B',
    ])
    expect(
      within(dialog).getByText(
        'Dejarán de estar disponibles para nuevas asignaciones. Las asignaciones y el histórico existentes se conservan. No se puede deshacer desde el panel.'
      )
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 2 dietas' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.delete.mock.calls).toEqual([
      ['/diets/d-1', { suppressApprovalToast: true }],
      ['/diets/d-2', { suppressApprovalToast: true }],
    ])
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('2 dietas eliminadas')
    expect(screen.queryByRole('button', { name: /^Eliminar \(/ })).not.toBeInTheDocument()
  })

  it('keeps only the failed diets selected and shows the server reason', async () => {
    api.delete.mockImplementation((url: string) => {
      if (url === '/diets/d-2') return Promise.reject(httpError(409, 'La dieta está en uso'))
      if (url === '/diets/d-3') return Promise.reject(httpError(403, 'No tienes permiso'))
      return Promise.resolve({ data: '', status: 204 })
    })
    renderPage()
    await selectDiets('Definición A', 'Volumen B', 'Mantenimiento C')

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 dietas' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 3 dietas' }))

    const result = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(deletedUrls()).toEqual(['/diets/d-1', '/diets/d-2', '/diets/d-3'])
    expect(within(result).getByRole('status')).toHaveTextContent('1 eliminada, 2 fallidas.')
    const failed = within(result).getByRole('region', { name: 'Fallidas (2)' })
    expect(failed).toHaveTextContent('Volumen B: La dieta está en uso')
    expect(failed).toHaveTextContent('Mantenimiento C: No tienes permiso')
    expect(toast.warning).toHaveBeenCalledTimes(1)
    expect(toast.success).not.toHaveBeenCalled()

    await user.click(within(result).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Mover a grupo (2)' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Eliminar (2)' }))
    const retry = await screen.findByRole('dialog', { name: 'Eliminar 2 dietas' })
    expect(within(retry).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Volumen B',
      'Mantenimiento C',
    ])
  })

  it('sends ADMIN deletions to approval with a single summary toast', async () => {
    setRole('ADMIN')
    api.delete.mockImplementation((url: string) =>
      Promise.reject(new ApprovalPendingError({ approval_request_id: `req-${url}`, message: 'Pendiente' }))
    )
    renderPage()
    await selectDiets('Definición A', 'Volumen B', 'Mantenimiento C')

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 dietas' })
    expect(within(dialog).getByText(/Tu rol necesita aprobación/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Solicitar eliminación' }))

    const result = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(deletedUrls()).toEqual(['/diets/d-1', '/diets/d-2', '/diets/d-3'])
    expect(within(result).getByRole('region', { name: 'Enviadas a aprobación (3)' })).toBeInTheDocument()
    expect(toast.info).toHaveBeenCalledTimes(1)
    expect(toast.info).toHaveBeenCalledWith('3 dietas enviadas a aprobación')
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
    await user.click(within(result).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /^Eliminar \(/ })).not.toBeInTheDocument()
  })

  it('does not call the API when cancelled', async () => {
    renderPage()
    await selectDiets('Definición A')

    await user.click(screen.getByRole('button', { name: 'Eliminar (1)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 1 dieta' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.delete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Eliminar (1)' })).toBeInTheDocument()
  })

  it('lists by name a diet selected on another page', async () => {
    renderPage()
    await selectDiets('Definición A')
    await user.click(screen.getByRole('button', { name: /Siguiente/ }))
    await selectDiets('Otra dieta')
    expect(screen.queryByText('Definición A')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Eliminar (2)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 2 dietas' })
    expect(within(dialog).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Definición A',
      'Otra dieta',
    ])
  })

  it('clears the selection when the search changes', async () => {
    renderPage()
    await selectDiets('Definición A')
    expect(screen.getByRole('button', { name: 'Eliminar (1)' })).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Buscar por nombre...'), 'vol')

    await waitFor(() => expect(screen.queryByRole('button', { name: /^Eliminar \(/ })).not.toBeInTheDocument())
  })
})

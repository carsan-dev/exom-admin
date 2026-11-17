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
import type { Exercise } from '../types'
import { ExercisesPage } from './exercises-page'

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
  'Dejarán de estar disponibles en el catálogo. Los entrenamientos que ya los usan y el histórico de los clientes se conservan. No se puede deshacer desde el panel.'

const envelope = (data: unknown) => ({ data: { data } })

const exercise = (id: string, name: string): Exercise => ({
  id,
  name,
  muscle_groups: ['Pecho'],
  equipment: [],
  level: 'INTERMEDIO',
  video_url: null,
  video_stream_id: null,
  thumbnail_url: null,
  technique_text: null,
  common_errors_text: null,
  explanation_text: null,
  is_active: true,
  created_at: '',
  updated_at: '',
  training_usage_count: 0,
  is_used_in_training: false,
})

const firstPage = [exercise('e-1', 'Press banca'), exercise('e-2', 'Sentadilla'), exercise('e-3', 'Remo con barra')]
const secondPage = [exercise('e-11', 'Dominadas')]

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
    if (url === '/exercises') {
      const pageNumber = Number(options?.params?.page ?? 1)
      const data = pageNumber === 2 ? secondPage : firstPage
      return Promise.resolve(envelope({ data, total: 13, totalPages: 2, page: pageNumber, limit: 10 }))
    }
    if (url === '/exercises/muscle-groups') return Promise.resolve(envelope({ muscle_groups: [] }))
    if (url === '/exercises/equipment') return Promise.resolve(envelope({ equipment: [] }))
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

function renderPage(entry = '/exercises') {
  mockGet()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        {/* Stand-in for the app shell's <main id="contenido" tabIndex={-1}>. */}
        <main tabIndex={-1} aria-label="Contenido">
          <TooltipProvider>
            <ExercisesPage />
          </TooltipProvider>
        </main>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

async function selectExercises(...names: string[]) {
  for (const name of names) {
    await user.click(await screen.findByLabelText(`Seleccionar ${name}`))
  }
}

let user: ReturnType<typeof userEvent.setup>

const deletedUrls = () => api.delete.mock.calls.map(([url]) => url)

describe('ExercisesPage bulk delete', { timeout: 15000 }, () => {
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
    expect(await screen.findByText('Press banca')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Acciones de selección de ejercicios' })).not.toBeInTheDocument()

    await selectExercises('Press banca', 'Sentadilla')

    const bar = screen.getByRole('region', { name: 'Acciones de selección de ejercicios' })
    expect(within(bar).getByText('2 seleccionados')).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Eliminar (2)' })).toBeInTheDocument()
    await user.click(within(bar).getByRole('button', { name: 'Limpiar selección' }))
    expect(screen.queryByRole('region', { name: 'Acciones de selección de ejercicios' })).not.toBeInTheDocument()
  })

  it('deletes every selected exercise in order, clears the selection and toasts once', async () => {
    api.delete.mockResolvedValue({ data: '', status: 204 })
    renderPage()
    await selectExercises('Press banca', 'Sentadilla')

    await user.click(screen.getByRole('button', { name: 'Eliminar (2)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 2 ejercicios' })
    expect(within(dialog).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Press banca',
      'Sentadilla',
    ])
    expect(within(dialog).getByText(CONSEQUENCES)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 2 ejercicios' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.delete.mock.calls).toEqual([
      ['/exercises/e-1', { suppressApprovalToast: true, deferLoginRedirect: true }],
      ['/exercises/e-2', { suppressApprovalToast: true, deferLoginRedirect: true }],
    ])
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('2 ejercicios eliminados')
    expect(screen.queryByRole('button', { name: /^Eliminar \(/ })).not.toBeInTheDocument()
    // The selection bar that opened the dialog is gone: focus lands on <main>, not on <body>.
    expect(screen.getByRole('main', { name: 'Contenido' })).toHaveFocus()
  })

  it('selects the whole page with the header checkbox and deletes it', async () => {
    api.delete.mockResolvedValue({ data: '', status: 204 })
    renderPage()
    await user.click(await screen.findByRole('checkbox', { name: 'Seleccionar página' }))

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 ejercicios' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 3 ejercicios' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(deletedUrls()).toEqual(['/exercises/e-1', '/exercises/e-2', '/exercises/e-3'])
  })

  it('keeps only the failed exercises selected and shows the server reason', async () => {
    api.delete.mockImplementation((url: string) => {
      if (url === '/exercises/e-2') return Promise.reject(httpError(409, 'El ejercicio está en uso'))
      if (url === '/exercises/e-3') return Promise.reject(httpError(403, 'No tienes permiso'))
      return Promise.resolve({ data: '', status: 204 })
    })
    renderPage()
    await selectExercises('Press banca', 'Sentadilla', 'Remo con barra')

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 ejercicios' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 3 ejercicios' }))

    const result = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(deletedUrls()).toEqual(['/exercises/e-1', '/exercises/e-2', '/exercises/e-3'])
    expect(within(result).getByRole('status')).toHaveTextContent('1 eliminado, 2 fallidos.')
    const failed = within(result).getByRole('region', { name: 'Fallidos (2)' })
    expect(failed).toHaveTextContent('Sentadilla: El ejercicio está en uso')
    expect(failed).toHaveTextContent('Remo con barra: No tienes permiso')
    expect(toast.warning).toHaveBeenCalledTimes(1)
    expect(toast.success).not.toHaveBeenCalled()

    await user.click(within(result).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Eliminar (2)' }))
    const retry = await screen.findByRole('dialog', { name: 'Eliminar 2 ejercicios' })
    expect(within(retry).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Sentadilla',
      'Remo con barra',
    ])
  })

  it('sends ADMIN deletions to approval with a single summary toast', async () => {
    setRole('ADMIN')
    api.delete.mockImplementation((url: string) =>
      Promise.reject(new ApprovalPendingError({ approval_request_id: `req-${url}`, message: 'Pendiente' }))
    )
    renderPage()
    await selectExercises('Press banca', 'Sentadilla', 'Remo con barra')

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 ejercicios' })
    expect(within(dialog).getByText(/Tu rol necesita aprobación/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Solicitar eliminación' }))

    const result = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(deletedUrls()).toEqual(['/exercises/e-1', '/exercises/e-2', '/exercises/e-3'])
    expect(within(result).getByRole('region', { name: 'Enviados a aprobación (3)' })).toBeInTheDocument()
    expect(toast.info).toHaveBeenCalledTimes(1)
    expect(toast.info).toHaveBeenCalledWith('3 ejercicios enviados a aprobación')
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
    await user.click(within(result).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /^Eliminar \(/ })).not.toBeInTheDocument()
  })

  it('does not call the API when cancelled', async () => {
    renderPage()
    await selectExercises('Press banca')

    await user.click(screen.getByRole('button', { name: 'Eliminar (1)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 1 ejercicio' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.delete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Eliminar (1)' })).toHaveFocus()
  })

  it('keeps the selection across pages, lists it by name and returns to page 1 after deleting', async () => {
    api.delete.mockResolvedValue({ data: '', status: 204 })
    renderPage()
    await selectExercises('Press banca')
    await user.click(screen.getByRole('button', { name: /Siguiente/ }))
    await selectExercises('Dominadas')
    expect(screen.queryByText('Press banca')).not.toBeInTheDocument()
    expect(screen.getByTestId('location').textContent).toBe('/exercises?page=2')

    await user.click(screen.getByRole('button', { name: 'Eliminar (2)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 2 ejercicios' })
    expect(within(dialog).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Press banca',
      'Dominadas',
    ])
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 2 ejercicios' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Back on page 1: the `page` parameter is dropped and the first page is shown again.
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/exercises'))
    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument()
  })

  it('clears the selection when the search changes', async () => {
    renderPage()
    await selectExercises('Press banca')
    expect(screen.getByRole('button', { name: 'Eliminar (1)' })).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Buscar por nombre...'), 'rem')

    await waitFor(() => expect(screen.queryByRole('button', { name: /^Eliminar \(/ })).not.toBeInTheDocument())
  })

  it('clears the selection when a filter changes', async () => {
    renderPage()
    await selectExercises('Press banca')
    expect(screen.getByRole('button', { name: 'Eliminar (1)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Filtros/ }))
    await user.click(await screen.findByRole('checkbox', { name: 'Intermedio' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: /^Eliminar \(/ })).not.toBeInTheDocument())
  })

  it('sends every deletion once when the confirmation is double-clicked', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    api.delete.mockImplementation(async () => {
      await gate
      return { data: '', status: 204 }
    })
    renderPage()
    await selectExercises('Press banca', 'Sentadilla')

    await user.click(screen.getByRole('button', { name: 'Eliminar (2)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 2 ejercicios' })
    await user.dblClick(within(dialog).getByRole('button', { name: 'Eliminar 2 ejercicios' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledTimes(1))
    release()

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(deletedUrls()).toEqual(['/exercises/e-1', '/exercises/e-2'])
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('2 ejercicios eliminados')
  })

  it('reports an exercise that no longer exists apart from the deleted ones and drops it from the selection', async () => {
    api.delete.mockImplementation((url: string) =>
      url === '/exercises/e-2'
        ? Promise.reject(httpError(404, 'Ejercicio no encontrado'))
        : Promise.resolve({ data: '', status: 204 })
    )
    renderPage()
    await selectExercises('Press banca', 'Sentadilla', 'Remo con barra')

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 ejercicios' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 3 ejercicios' }))

    const result = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(deletedUrls()).toEqual(['/exercises/e-1', '/exercises/e-2', '/exercises/e-3'])
    expect(within(result).getByRole('status')).toHaveTextContent('2 eliminados, 1 ya no existía.')
    expect(within(result).getByRole('region', { name: 'Eliminados (2)' })).toHaveTextContent('Press bancaRemo con barra')
    expect(within(result).getByRole('region', { name: 'Ya no existía (1)' })).toHaveTextContent('Sentadilla')
    expect(within(result).queryByRole('region', { name: /^Fallid/ })).not.toBeInTheDocument()
    expect(toast.warning).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('2 ejercicios eliminados')

    await user.click(within(result).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Nothing is left to retry: the missing exercise is not kept selected.
    expect(screen.queryByRole('button', { name: /^Eliminar \(/ })).not.toBeInTheDocument()
  })

  it('stops on 401 and lists the remaining exercises as not attempted', async () => {
    api.delete.mockImplementation((url: string) =>
      url === '/exercises/e-2'
        ? Promise.reject(httpError(401, 'Sesión caducada'))
        : Promise.resolve({ data: '', status: 204 })
    )
    renderPage()
    await selectExercises('Press banca', 'Sentadilla', 'Remo con barra')

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 ejercicios' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 3 ejercicios' }))

    const result = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(deletedUrls()).toEqual(['/exercises/e-1', '/exercises/e-2'])
    expect(within(result).getByRole('status')).toHaveTextContent('1 eliminado, 1 fallido, 1 no intentado.')
    expect(within(result).getByRole('region', { name: 'Fallido (1)' })).toHaveTextContent(
      'Sentadilla: Sesión caducada'
    )
    expect(within(result).getByRole('region', { name: 'No intentado (1)' })).toHaveTextContent('Remo con barra')
  })

  it('stops without sending more requests when another user signs in mid-batch', async () => {
    api.delete.mockImplementation((url: string) => {
      // Another tab signs in with a different account while the first request is in flight.
      if (url === '/exercises/e-1') session.auth.currentUser = { uid: 'u-2' }
      return Promise.resolve({ data: '', status: 204 })
    })
    renderPage()
    await selectExercises('Press banca', 'Sentadilla', 'Remo con barra')

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 ejercicios' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 3 ejercicios' }))

    const result = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(deletedUrls()).toEqual(['/exercises/e-1'])
    expect(within(result).getByRole('status')).toHaveTextContent('1 eliminado, 2 no intentados.')
    expect(within(result).getByRole('region', { name: 'No intentados (2)' })).toHaveTextContent(
      'SentadillaRemo con barra'
    )
  })
})

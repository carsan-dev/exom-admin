import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
// The real `api` instance and its interceptors: only the HTTP adapter is replaced.
import { api } from '@/lib/api'
import type { Exercise } from '../types'
import { ExercisesPage } from './exercises-page'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))
const session = vi.hoisted(() => ({ auth: { currentUser: null as { uid: string } | null } }))
vi.mock('@/lib/firebase', () => ({ auth: session.auth, getIdToken: vi.fn(async () => 'test-token') }))

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

const exercises = [exercise('e-1', 'Press banca'), exercise('e-2', 'Sentadilla'), exercise('e-3', 'Remo con barra')]

function ok(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { data: { data }, status, statusText: 'OK', headers: {}, config }
}

function unauthorized(config: InternalAxiosRequestConfig) {
  return new AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', config, undefined, {
    data: { statusCode: 401, message: 'Sesión caducada', error: 'Unauthorized' },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  })
}

/** Fake backend: the session expires while deleting `e-2`; from then on every request is a 401. */
function installBackend() {
  const deleted: string[] = []
  const unauthorizedReads: string[] = []
  let sessionExpired = false
  api.defaults.adapter = async (config) => {
    const url = config.url ?? ''
    if (config.method === 'delete') {
      deleted.push(url)
      if (url === '/exercises/e-2') sessionExpired = true
    }
    if (sessionExpired) {
      if (config.method === 'get') unauthorizedReads.push(url)
      throw unauthorized(config)
    }
    if (config.method === 'delete') return ok(config, null, 204)
    if (url === '/exercises') return ok(config, { data: exercises, total: 3, totalPages: 1, page: 1, limit: 10 })
    if (url === '/exercises/muscle-groups') return ok(config, { muscle_groups: [] })
    if (url === '/exercises/equipment') return ok(config, { equipment: [] })
    return ok(config, [])
  }
  return { deleted, unauthorizedReads }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/exercises']}>
        <main tabIndex={-1} aria-label="Contenido">
          <TooltipProvider>
            <ExercisesPage />
          </TooltipProvider>
        </main>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/**
 * The result appears once the batch's own invalidation has refetched the list. With an expired
 * session that refetch gets 401s and `shouldRetryQuery` retries them with backoff (about 3 s), so
 * the default 1 s of `findBy*` is not enough.
 */
const findResult = () => screen.findByRole('dialog', { name: 'Resultado de la eliminación' }, { timeout: 10000 })

let location: { pathname: string; href: string }
const originalAdapter = api.defaults.adapter

describe('ExercisesPage bulk delete when the session expires (real api interceptors)', { timeout: 15000 }, () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
    useAuth.setState({ user: { id: 'u-1', email: 'admin@example.test', role: 'SUPER_ADMIN', profile: null } })
    session.auth.currentUser = { uid: 'u-1' }
    location = { pathname: '/exercises', href: 'http://localhost/exercises' }
    vi.stubGlobal('location', location)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    api.defaults.adapter = originalAdapter
  })

  it('shows what was deleted before going to /login, and goes there once the result is closed', async () => {
    const { deleted, unauthorizedReads } = installBackend()
    const user = userEvent.setup({ delay: null })
    renderPage()
    for (const name of ['Press banca', 'Sentadilla', 'Remo con barra']) {
      await user.click(await screen.findByLabelText(`Seleccionar ${name}`))
    }

    await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 ejercicios' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 3 ejercicios' }))

    const result = await findResult()
    expect(deleted).toEqual(['/exercises/e-1', '/exercises/e-2'])
    expect(within(result).getByRole('status')).toHaveTextContent('1 eliminado, 1 fallido, 1 no intentado.')
    expect(within(result).getByRole('alert')).toHaveTextContent(
      'Tu sesión ha caducado: se han eliminado 1 de 3 ejercicios y 2 no. Al cerrar tendrás que volver a iniciar sesión.'
    )
    // The refetch after the batch also gets 401s: none of them may navigate away from the result.
    await waitFor(() => expect(unauthorizedReads).toContain('/exercises'))
    expect(location.href).toBe('http://localhost/exercises')

    await user.click(within(result).getByRole('button', { name: 'Cerrar' }))

    expect(location.href).toBe('/login')
  })

  it('goes to /login as soon as the result is dismissed with Escape', async () => {
    installBackend()
    const user = userEvent.setup({ delay: null })
    renderPage()
    await user.click(await screen.findByLabelText('Seleccionar Sentadilla'))
    await user.click(screen.getByRole('button', { name: 'Eliminar (1)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 1 ejercicio' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 1 ejercicio' }))

    const result = await findResult()
    expect(within(result).getByRole('alert')).toHaveTextContent('se han eliminado 0 de 1 ejercicio y 1 no.')
    expect(location.href).toBe('http://localhost/exercises')

    await user.keyboard('{Escape}')

    expect(location.href).toBe('/login')
  })

  it('goes to /login if the page unmounts while the result is open', async () => {
    installBackend()
    const user = userEvent.setup({ delay: null })
    const view = renderPage()
    await user.click(await screen.findByLabelText('Seleccionar Sentadilla'))
    await user.click(screen.getByRole('button', { name: 'Eliminar (1)' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 1 ejercicio' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar 1 ejercicio' }))
    await findResult()
    expect(location.href).toBe('http://localhost/exercises')

    view.unmount()

    expect(location.href).toBe('/login')
  })
})

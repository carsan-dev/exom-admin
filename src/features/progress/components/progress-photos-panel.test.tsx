import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { ProgressPhotosPanel } from './progress-photos-panel'
import type { ProgressPhotoSession, ProgressPhotoView } from '../types'

vi.mock('@/components/uploads/image-upload-field', () => ({
  ImageUploadField: ({ label, onChange }: { label: string; onChange: (url: string, uploadId?: string) => void }) => (
    <button type="button" onClick={() => onChange('https://image.test/new.webp', 'upload-new')}>Simular subida: {label}</button>
  ),
}))

const views: ProgressPhotoView[] = ['FRONT', 'LEFT', 'RIGHT', 'BACK']

function session(date: string, activeViews = views, id = `session-${date}`): ProgressPhotoSession {
  return {
    id,
    session_date: date,
    created_at: `${date}T12:00:00.000Z`,
    updated_at: `${date}T12:00:00.000Z`,
    is_complete: activeViews.length === 4,
    photos: activeViews.map((view) => ({
      id: `${date}-${view}`,
      view,
      state: 'ACTIVE' as const,
      replaces_photo_id: null,
      created_at: `${date}T12:00:00.000Z`,
      image_url: `https://image.test/${date}-${view}.webp`,
      content_type: 'image/webp',
      bytes: 1200,
    })),
  }
}

function history(
  data: ProgressPhotoSession[],
  pagination: Partial<{ page: number; limit: number; total: number; totalPages: number }> = {},
) {
  return {
    data,
    page: pagination.page ?? 1,
    limit: pagination.limit ?? 20,
    total: pagination.total ?? data.length,
    totalPages: pagination.totalPages ?? 1,
  }
}

function envelope<T>(data: T) {
  return { data: { data } } as never
}

function renderPanel(clientId = 'client-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><ProgressPhotosPanel clientId={clientId} /></QueryClientProvider>)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProgressPhotosPanel', () => {
  it('renders four complete views, incomplete sessions, two distinct dates and same-view switching', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(envelope(history([
      session('2026-09-20'),
      session('2026-09-01', ['FRONT', 'LEFT', 'BACK']),
    ])))

    const user = userEvent.setup()
    renderPanel()

    expect(await screen.findByText('Completa · 4 de 4 vistas')).toBeInTheDocument()
    expect(screen.getByText('Incompleta · faltan 1 de 4 vistas')).toBeInTheDocument()
    expect(screen.getByText(/Pendientes: Lateral derecha/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Fecha anterior')).not.toHaveValue((screen.getByLabelText('Fecha posterior') as HTMLSelectElement).value))

    await user.click(screen.getByRole('button', { name: 'Lateral izquierda' }))
    expect(screen.getByRole('button', { name: 'Lateral izquierda' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Frontal' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByAltText(/Lateral izquierda del/)).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Lateral derecha' }))
    expect(screen.getByText('Vista Lateral derecha no disponible en esta fecha.')).toBeInTheDocument()
  })

  it('enlarges an available image and closes the accessible dialog with Escape', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(envelope(history([session('2026-09-20'), session('2026-09-01')])))
    const user = userEvent.setup()
    renderPanel()

    const [enlarge] = await screen.findAllByRole('button', { name: /Ampliar Frontal del/ })
    await user.click(enlarge)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByAltText(/Frontal ampliada del/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows loading, error and empty states without treating missing history as complete', async () => {
    let resolveHistory: ((value: unknown) => void) | undefined
    vi.spyOn(api, 'get').mockImplementation(() => new Promise((resolve) => { resolveHistory = resolve }) as never)
    const loading = renderPanel()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando fotos de progreso')
    loading.unmount()

    vi.restoreAllMocks()
    vi.spyOn(api, 'get').mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { message: 'Acceso denegado' } } })
    const failed = renderPanel()
    expect(await screen.findByRole('alert')).toHaveTextContent('Acceso denegado')
    failed.unmount()

    vi.restoreAllMocks()
    vi.spyOn(api, 'get').mockResolvedValue(envelope(history([])))
    renderPanel()
    expect(await screen.findByText(/Aún no hay sesiones de fotos/)).toBeInTheDocument()
    resolveHistory?.(envelope(history([])))
  })

  it('keeps page one stable when an empty history reports totalPages zero', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(envelope(history([], { totalPages: 0 })))
    renderPanel()

    expect(await screen.findByText(/Aún no hay sesiones de fotos/)).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(get).toHaveBeenCalledWith(
      '/admin/clients/client-1/progress-photos/sessions',
      expect.objectContaining({ params: { page: 1, limit: 20 } }),
    )
    expect(get.mock.calls.some(([, config]) => (config as { params?: { page?: number } } | undefined)?.params?.page === 0)).toBe(false)
  })

  it('replays an unsuccessful session creation with the same operation identity', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(envelope(history([])))
    const retryableConflict = { isAxiosError: true, response: { status: 400, data: { message: 'Fecha inválida' } } }
    const post = vi.spyOn(api, 'post')
      .mockRejectedValueOnce(retryableConflict)
      .mockResolvedValueOnce(envelope(session('2026-09-21', [])))
    const user = userEvent.setup()
    renderPanel()

    await screen.findByText(/Aún no hay sesiones de fotos/)
    await user.clear(screen.getByLabelText('Fecha de nueva sesión'))
    await user.type(screen.getByLabelText('Fecha de nueva sesión'), '2026-09-21')
    await user.click(screen.getByRole('button', { name: 'Crear sesión incompleta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Fecha inválida')
    await user.click(screen.getByRole('button', { name: 'Reintentar crear sesión' }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    const firstPayload = post.mock.calls[0][1] as { operation_id: string }
    const secondPayload = post.mock.calls[1][1] as { operation_id: string }
    expect(firstPayload.operation_id).toBe(secondPayload.operation_id)
  })

  it('uploads into an empty view and retries the same association identity', async () => {
    const incomplete = session('2026-09-20', ['FRONT', 'LEFT', 'BACK'])
    vi.spyOn(api, 'get').mockResolvedValue(envelope(history([incomplete, session('2026-09-01')])))
    const retryableConflict = { isAxiosError: true, response: { status: 400, data: { message: 'Asociación pendiente' } } }
    const post = vi.spyOn(api, 'post')
      .mockRejectedValueOnce(retryableConflict)
      .mockResolvedValueOnce(envelope(incomplete.photos[0]))
    const user = userEvent.setup()
    renderPanel()

    await screen.findByText('Incompleta · faltan 1 de 4 vistas')
    await user.click(screen.getByRole('button', { name: 'Subir Lateral derecha' }))
    await user.click(screen.getByRole('button', { name: 'Simular subida: Nueva imagen Lateral derecha' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Asociación pendiente')
    await user.click(screen.getByRole('button', { name: 'Reintentar asociación' }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    const firstPayload = post.mock.calls[0][1] as { operation_id: string; replaces_photo_id?: string }
    const secondPayload = post.mock.calls[1][1] as { operation_id: string; replaces_photo_id?: string }
    expect(firstPayload).not.toHaveProperty('replaces_photo_id')
    expect(firstPayload.operation_id).toBe(secondPayload.operation_id)
  })

  it('requires replacement confirmation and sends the active photo identity as a precondition', async () => {
    const current = session('2026-09-20')
    vi.spyOn(api, 'get').mockResolvedValue(envelope(history([current, session('2026-09-01')])))
    const post = vi.spyOn(api, 'post').mockResolvedValue(envelope(current.photos[0]))
    const user = userEvent.setup()
    renderPanel()

    await screen.findByText('Comparador')
    await user.click(screen.getByRole('button', { name: 'Reemplazar Frontal' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('identidad de la foto')
    expect(screen.queryByText(/Simular subida/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar reemplazo' }))
    await user.click(screen.getByRole('button', { name: 'Simular subida: Nueva imagen Frontal' }))

    await waitFor(() => expect(post).toHaveBeenCalledWith(
      '/admin/clients/client-1/progress-photos/sessions/session-2026-09-20/photos',
      expect.objectContaining({ upload_id: 'upload-new', view: 'FRONT', replaces_photo_id: '2026-09-20-FRONT' }),
    ))
  })

  it('keeps client-scoped history visible when a late request for another client resolves', async () => {
    let resolveClientOne: ((value: unknown) => void) | undefined
    vi.spyOn(api, 'get').mockImplementation((url: string) => {
      if (url.includes('/client-1/')) {
        return new Promise((resolve) => { resolveClientOne = resolve }) as never
      }
      return Promise.resolve(envelope(history([session('2026-09-20')]))) as never
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const rendered = render(<QueryClientProvider client={queryClient}><ProgressPhotosPanel clientId="client-1" /></QueryClientProvider>)
    rendered.rerender(<QueryClientProvider client={queryClient}><ProgressPhotosPanel clientId="client-2" /></QueryClientProvider>)

    expect((await screen.findAllByText('20 de septiembre de 2026')).length).toBeGreaterThan(0)
    resolveClientOne?.(envelope(history([session('2026-01-01')])))
    await Promise.resolve()
    expect(screen.queryByText('01 de enero de 2026')).not.toBeInTheDocument()
  })

  it('uses session IDs as comparator values and never selects two sessions from the same civil date', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(envelope(history([
      session('2026-09-20', views, 'session-newer'),
      session('2026-09-01', views, 'same-a111'),
      session('2026-09-01', views, 'same-b222'),
    ])))

    renderPanel()

    const older = await screen.findByLabelText('Fecha anterior')
    const newer = screen.getByLabelText('Fecha posterior')
    await waitFor(() => expect(older).toHaveValue('same-a111'))
    expect(newer).toHaveValue('session-newer')
    expect(older).not.toHaveValue((newer as HTMLSelectElement).value)
    expect(within(newer).getByRole('option', { name: /01 de septiembre de 2026 · sesión same-a11/ })).toBeDisabled()
    expect(within(newer).getByRole('option', { name: /01 de septiembre de 2026 · sesión same-b22/ })).toBeDisabled()
  })

  it('requests bounded pages and resets page one when the client changes', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation((url: string, config?: { params?: { page?: number } }) => {
      const clientId = url.includes('/client-2/') ? 'client-2' : 'client-1'
      const page = config?.params?.page ?? 1
      return Promise.resolve(envelope({
        data: [session(clientId === 'client-1' && page === 2 ? '2026-08-01' : '2026-09-20')],
        page,
        limit: 20,
        total: 21,
        totalPages: 2,
      })) as never
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const rendered = render(<QueryClientProvider client={queryClient}><ProgressPhotosPanel clientId="client-1" /></QueryClientProvider>)

    await screen.findByText('Página 1 de 2')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Página 2 de 2')
    expect(get).toHaveBeenLastCalledWith(
      '/admin/clients/client-1/progress-photos/sessions',
      expect.objectContaining({ params: { page: 2, limit: 20 } }),
    )

    rendered.rerender(<QueryClientProvider client={queryClient}><ProgressPhotosPanel clientId="client-2" /></QueryClientProvider>)
    await waitFor(() => expect(get).toHaveBeenLastCalledWith(
      '/admin/clients/client-2/progress-photos/sessions',
      expect.objectContaining({ params: { page: 1, limit: 20 } }),
    ))
    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument()
  })

  it('retains bounded comparison choices across visited pages and rejects duplicate civil dates', async () => {
    vi.spyOn(api, 'get').mockImplementation((_url: string, config?: { params?: { page?: number } }) => {
      const page = config?.params?.page ?? 1
      return Promise.resolve(envelope(history(
        page === 1
          ? [
              session('2026-09-20', views, 'session-newer'),
              session('2026-09-01', views, 'same-a111'),
              session('2026-09-01', views, 'same-b222'),
            ]
          : [session('2026-08-01', views, 'session-older')],
        { page, total: 4, totalPages: 2 },
      ))) as never
    })
    const user = userEvent.setup()
    renderPanel()

    await screen.findByText('Página 1 de 2')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Página 2 de 2')

    const older = screen.getByLabelText('Fecha anterior')
    const newer = screen.getByLabelText('Fecha posterior')
    await waitFor(() => expect(within(newer).getByRole('option', { name: /20 de septiembre de 2026 · sesión session-/ })).toBeInTheDocument())
    await user.selectOptions(older, 'session-older')
    await user.selectOptions(newer, 'same-a111')
    expect(older).toHaveValue('session-older')
    expect(newer).toHaveValue('same-a111')

    expect(within(older).getByRole('option', { name: /01 de septiembre de 2026 · sesión same-b22/ })).toBeDisabled()
    expect((older as HTMLSelectElement).value).toBe('session-older')
    expect((newer as HTMLSelectElement).value).toBe('same-a111')
  })

  it('serializes photo actions so a late association cannot overwrite a newer action', async () => {
    const incomplete = session('2026-09-20', ['FRONT'])
    vi.spyOn(api, 'get').mockResolvedValue(envelope(history([incomplete, session('2026-09-01')])))
    let resolveAssociation: ((value: unknown) => void) | undefined
    vi.spyOn(api, 'post').mockImplementation(() => new Promise((resolve) => { resolveAssociation = resolve }) as never)
    const user = userEvent.setup()
    renderPanel()

    await screen.findByText('Incompleta · faltan 3 de 4 vistas')
    await user.click(screen.getByRole('button', { name: 'Subir Lateral izquierda' }))
    await user.click(screen.getByRole('button', { name: 'Simular subida: Nueva imagen Lateral izquierda' }))
    await waitFor(() => expect(resolveAssociation).toBeTypeOf('function'))
    expect(screen.getByRole('button', { name: 'Subir Lateral derecha' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Subir Espalda' })).toBeDisabled()

    resolveAssociation?.(envelope(incomplete.photos[0]))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Subir Lateral derecha' })).not.toBeDisabled())
  })
})

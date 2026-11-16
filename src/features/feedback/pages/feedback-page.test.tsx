import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
import { FeedbackPage } from './feedback-page'
import type { FeedbackItem } from '../types'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const { toast } = await import('sonner')

function makeItem(id: string, firstName: string, status: 'PENDING' | 'REVIEWED', extra: Partial<FeedbackItem> = {}): FeedbackItem {
  return {
    id,
    client_id: `c-${id}`,
    exercise_id: `e-${id}`,
    training_id: null,
    training_exercise_id: null,
    assignment_date: '2026-11-15T10:00:00.000Z',
    feedback_kind: 'GENERAL',
    media_type: 'VIDEO',
    media_url: `https://media.example.test/${id}.mp4`,
    notes: `Notas de ${firstName}`,
    admin_response: status === 'REVIEWED' ? 'Ya respondido' : null,
    status,
    reviewed_by: null,
    reviewed_at: null,
    media_deleted_at: null,
    created_at: '2026-11-15T10:00:00.000Z',
    updated_at: '2026-11-15T10:00:00.000Z',
    client: { id: `c-${id}`, email: `${id}@example.test`, profile: { first_name: firstName, last_name: 'Test' } },
    exercise: { id: `e-${id}`, name: `Ejercicio ${firstName}` },
    training: null,
    ...extra,
  }
}

const stats = { total: 22, pending: 3, reviewed: 19, avg_review_seconds: 5 * 3600 + 12 * 60, reviewed_in_period: 18 }

let store: FeedbackItem[] = []

function mockApi({ listFails = false, totalPages = 1 }: { listFails?: boolean; totalPages?: number } = {}) {
  api.get.mockImplementation(async (url: string) => {
    if (url === '/feedback') {
      if (listFails) throw Object.assign(new AxiosError('boom'), { response: { status: 404 } })
      return { data: { data: { data: store, total: store.length, page: 1, limit: 20, totalPages } } }
    }
    if (url === '/feedback/stats') return { data: { data: stats } }
    return { data: { data: { data: [], total: 0, page: 1, limit: 200, totalPages: 1 } } }
  })
  api.put.mockImplementation(async (url: string, body: { admin_response: string }) => {
    const id = url.split('/')[2]
    store = store.map((item) =>
      item.id === id ? { ...item, status: 'REVIEWED' as const, admin_response: body.admin_response } : item,
    )
    return { data: { data: store.find((item) => item.id === id) } }
  })
}

// La siguiente llamada a PUT queda en vuelo hasta que el test la resuelva o la rechace.
function deferNextPut() {
  let settle: { resolve: () => void; reject: (error: unknown) => void } | null = null
  api.put.mockImplementationOnce(
    (url: string, body: { admin_response: string }) =>
      new Promise((resolve, reject) => {
        settle = {
          resolve: () => {
            const id = url.split('/')[2]
            store = store.map((item) =>
              item.id === id ? { ...item, status: 'REVIEWED' as const, admin_response: body.admin_response } : item,
            )
            resolve({ data: { data: store.find((item) => item.id === id) } })
          },
          reject,
        }
      }),
  )
  return {
    resolve: () => settle?.resolve(),
    reject: () => settle?.reject(Object.assign(new AxiosError('boom'), { response: { status: 500, data: {} } })),
  }
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderPage(initialEntry = '/feedback') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <FeedbackPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function stubViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }),
  })
}

const listCalls = () => api.get.mock.calls.filter(([path]) => path === '/feedback')

describe('FeedbackPage', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.put.mockReset()
    vi.mocked(toast.info).mockClear()
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
    useUnsavedChangesStore.setState({ dirtyEditors: {}, hasUnsavedChanges: false })
    store = [
      makeItem('f1', 'Ana', 'PENDING', { feedback_kind: 'LAST_SET' }),
      makeItem('f2', 'Beto', 'REVIEWED'),
      makeItem('f3', 'Carla', 'PENDING', { media_type: 'IMAGE' }),
      makeItem('f4', 'Dani', 'PENDING'),
    ]
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  describe('humo', () => {
    it('renders header, figures, rows and pagination', async () => {
      mockApi({ totalPages: 3 })
      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: 'Feedback multimedia' })).toBeInTheDocument()
      expect(await screen.findByText('Ana Test')).toBeInTheDocument()
      expect(screen.getByText('Ejercicio Carla')).toBeInTheDocument()
      expect(screen.getByText('Última serie')).toBeInTheDocument()
      expect(screen.getAllByText('Pendiente')).toHaveLength(3)
      expect(screen.getAllByText('Revisado')).toHaveLength(1)
      expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
      expect(screen.getByText('Selecciona un feedback del listado')).toBeInTheDocument()

      const figures = within(await screen.findByLabelText('Resumen de feedback'))
      expect(figures.getByText('Total feedback').nextElementSibling).toHaveTextContent('22')
      expect(figures.getByText('Pendientes').nextElementSibling).toHaveTextContent('3')
      expect(figures.getByText('5 h 12 min')).toBeInTheDocument()
    })

    it('shows the empty state without filters', async () => {
      store = []
      mockApi()
      renderPage()
      expect(await screen.findByText('No hay feedback disponible')).toBeInTheDocument()
    })

    it('shows the filtered empty state', async () => {
      store = []
      mockApi()
      renderPage('/feedback?status=PENDING')
      expect(await screen.findByText('No hay resultados para los filtros seleccionados')).toBeInTheDocument()
    })

    it('shows the error state with a retry that refetches the list', async () => {
      mockApi({ listFails: true })
      const user = userEvent.setup()
      renderPage()

      expect(await screen.findByText('Error al cargar el feedback. Intenta de nuevo.')).toBeInTheDocument()
      const before = listCalls().length
      await user.click(screen.getByRole('button', { name: 'Reintentar' }))
      await waitFor(() => expect(listCalls().length).toBeGreaterThan(before))
    })

    it('respects clientId, status and page from the URL and keeps them when selecting', async () => {
      mockApi({ totalPages: 4 })
      const user = userEvent.setup()
      renderPage('/feedback?clientId=c-9&status=PENDING&page=2')

      expect(await screen.findByText('Ana Test')).toBeInTheDocument()
      expect(listCalls()[0][1]).toEqual({ params: { page: 2, limit: 20, client_id: 'c-9', status: 'PENDING' } })
      const statsCall = api.get.mock.calls.find(([path]) => path === '/feedback/stats')
      expect(statsCall?.[1].params.client_id).toBe('c-9')
      expect(screen.getByRole('button', { name: 'Pendientes' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Página 2 de 4')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Ana Test/ }))
      expect(screen.getByTestId('location')).toHaveTextContent('/feedback?clientId=c-9&status=PENDING&page=2')
    })

    it('resets the page when the status filter changes', async () => {
      mockApi({ totalPages: 4 })
      const user = userEvent.setup()
      renderPage('/feedback?page=3')

      await screen.findByText('Ana Test')
      await user.click(screen.getByRole('button', { name: 'Revisados' }))
      expect(screen.getByTestId('location')).toHaveTextContent('/feedback?status=REVIEWED')
    })
  })

  describe('P11 en escritorio: tras responder abre el siguiente pendiente', () => {
    async function respondWith(user: ReturnType<typeof userEvent.setup>, text: string) {
      await user.type(screen.getByPlaceholderText('Escribe tu respuesta o comentario...'), text)
      await user.click(screen.getByRole('button', { name: 'Responder' }))
    }

    it('selects the next pending item after the answered one, skipping reviewed ones', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      expect(screen.getByRole('heading', { level: 2, name: 'Ana Test' })).toBeInTheDocument()
      await respondWith(user, '  Buen trabajo  ')

      // f2 está revisado: el siguiente pendiente tras f1 es f3
      expect(await screen.findByRole('heading', { level: 2, name: 'Carla Test' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Carla Test/ })).toHaveAttribute('aria-current', 'true')
      expect(toast.info).not.toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Respuesta enviada correctamente')
    })

    it('sends the same mutation arguments as before', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      await respondWith(user, '  Buen trabajo  ')

      await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
      expect(api.put).toHaveBeenCalledWith('/feedback/f1/respond', { admin_response: 'Buen trabajo' })
    })

    it('wraps to the first remaining pending item when there is none after', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Dani Test/ }))
      await respondWith(user, 'Respuesta')

      expect(await screen.findByRole('heading', { level: 2, name: 'Ana Test' })).toBeInTheDocument()
      expect(toast.info).not.toHaveBeenCalled()
    })

    it('tells the user when no pending items are left and keeps showing the answered one', async () => {
      store = [makeItem('f1', 'Ana', 'PENDING'), makeItem('f2', 'Beto', 'REVIEWED')]
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      await respondWith(user, 'Respuesta')

      await waitFor(() => expect(toast.info).toHaveBeenCalledWith('No quedan feedbacks pendientes en esta lista.'))
      expect(screen.getByRole('heading', { level: 2, name: 'Ana Test' })).toBeInTheDocument()
      expect(await screen.findByText('Respondido')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Responder' })).not.toBeInTheDocument()
    })

    it('still finds the next pending item when the list is filtered to pending and drops the answered one', async () => {
      store = [makeItem('f1', 'Ana', 'PENDING'), makeItem('f3', 'Carla', 'PENDING')]
      api.get.mockImplementation(async (url: string) => {
        if (url === '/feedback') {
          const pending = store.filter((item) => item.status === 'PENDING')
          return { data: { data: { data: pending, total: pending.length, page: 1, limit: 20, totalPages: 1 } } }
        }
        if (url === '/feedback/stats') return { data: { data: stats } }
        return { data: { data: { data: [], total: 0, page: 1, limit: 200, totalPages: 1 } } }
      })
      api.put.mockImplementation(async (url: string, body: { admin_response: string }) => {
        const id = url.split('/')[2]
        store = store.map((item) => (item.id === id ? { ...item, status: 'REVIEWED' as const, admin_response: body.admin_response } : item))
        return { data: { data: store.find((item) => item.id === id) } }
      })
      const user = userEvent.setup()
      renderPage('/feedback?status=PENDING')

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      await respondWith(user, 'Respuesta')

      expect(await screen.findByRole('heading', { level: 2, name: 'Carla Test' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Ana Test/ })).not.toBeInTheDocument()
    })

    it('keeps each item draft when switching selection', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      await user.type(screen.getByPlaceholderText('Escribe tu respuesta o comentario...'), 'Borrador')
      await user.click(screen.getByRole('button', { name: /Carla Test/ }))
      expect(screen.getByPlaceholderText('Escribe tu respuesta o comentario...')).toHaveValue('')
      await user.click(screen.getByRole('button', { name: /Ana Test/ }))
      expect(screen.getByPlaceholderText('Escribe tu respuesta o comentario...')).toHaveValue('Borrador')
    })

    it('keeps the retention notice text when the media was removed', async () => {
      store = [makeItem('f1', 'Ana', 'REVIEWED', { media_url: null, media_deleted_at: '2026-11-01T10:00:00.000Z' })]
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      expect(screen.getByText('El vídeo ya no está disponible')).toBeInTheDocument()
      expect(screen.getByText('Se eliminó automáticamente el 01 de noviembre de 2026 según la política de retención.')).toBeInTheDocument()
    })
  })

  describe('detalle móvil: Anterior y Siguiente', () => {
    it('navigates through the loaded list and disables the buttons at the ends', async () => {
      stubViewport(false)
      mockApi()
      const user = userEvent.setup()
      renderPage('/feedback?status=PENDING&page=1')

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Detalle de feedback' })
      const dialogQueries = within(dialog)
      const previous = () => dialogQueries.getByRole('button', { name: 'Feedback anterior' })
      const next = () => dialogQueries.getByRole('button', { name: 'Feedback siguiente' })

      expect(dialogQueries.getByRole('heading', { level: 3, name: 'Ana Test' })).toBeInTheDocument()
      expect(dialogQueries.getByText('1 de 4')).toBeInTheDocument()
      expect(previous()).toBeDisabled()
      expect(next()).toBeEnabled()

      await user.click(next())
      expect(dialogQueries.getByRole('heading', { level: 3, name: 'Beto Test' })).toBeInTheDocument()
      expect(previous()).toBeEnabled()
      await user.click(next())
      await user.click(next())
      expect(dialogQueries.getByRole('heading', { level: 3, name: 'Dani Test' })).toBeInTheDocument()
      expect(dialogQueries.getByText('4 de 4')).toBeInTheDocument()
      expect(next()).toBeDisabled()

      await user.click(previous())
      expect(dialogQueries.getByRole('heading', { level: 3, name: 'Carla Test' })).toBeInTheDocument()

      // No cambian la página ni la URL
      expect(screen.getByTestId('location')).toHaveTextContent('/feedback?status=PENDING&page=1')
      expect(listCalls()).toHaveLength(1)
    })

    it('opens the next pending item in the dialog after answering', async () => {
      stubViewport(false)
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Detalle de feedback' })
      await user.type(within(dialog).getByPlaceholderText('Escribe tu respuesta o comentario...'), 'Respuesta')
      await user.click(within(dialog).getByRole('button', { name: 'Responder' }))

      expect(await within(dialog).findByRole('heading', { level: 3, name: 'Carla Test' })).toBeInTheDocument()
    })

    it('closes the dialog and warns when no pending items are left', async () => {
      stubViewport(false)
      store = [makeItem('f1', 'Ana', 'PENDING'), makeItem('f2', 'Beto', 'REVIEWED')]
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Detalle de feedback' })
      await user.type(within(dialog).getByPlaceholderText('Escribe tu respuesta o comentario...'), 'Respuesta')
      await user.click(within(dialog).getByRole('button', { name: 'Responder' }))

      await waitFor(() => expect(toast.info).toHaveBeenCalledWith('No quedan feedbacks pendientes en esta lista.'))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })
  })

  describe('respuesta que llega tras cerrar o cambiar el detalle', () => {
    const placeholder = 'Escribe tu respuesta o comentario...'

    it('reports an error that arrives after closing the mobile dialog and keeps the draft', async () => {
      stubViewport(false)
      mockApi()
      const put = deferNextPut()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Detalle de feedback' })
      await user.type(within(dialog).getByPlaceholderText(placeholder), 'Respuesta')
      await user.click(within(dialog).getByRole('button', { name: 'Responder' }))
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      put.reject()
      await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
      expect(toast.success).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: /Ana Test/ }))
      const reopened = await screen.findByRole('dialog', { name: 'Detalle de feedback' })
      expect(within(reopened).getByPlaceholderText(placeholder)).toHaveValue('Respuesta')
      expect(within(reopened).getByRole('button', { name: 'Responder' })).toBeEnabled()
    })

    it('confirms a success that arrives after closing the mobile dialog', async () => {
      stubViewport(false)
      mockApi()
      const put = deferNextPut()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Detalle de feedback' })
      await user.type(within(dialog).getByPlaceholderText(placeholder), 'Respuesta')
      await user.click(within(dialog).getByRole('button', { name: 'Responder' }))
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      put.resolve()
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Respuesta enviada correctamente'))
      // Cerrado por el usuario: no se reabre con el siguiente pendiente.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('reports an error that arrives after changing the desktop filter and keeps the draft', async () => {
      mockApi()
      const put = deferNextPut()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      await user.type(screen.getByPlaceholderText(placeholder), 'Respuesta')
      await user.click(screen.getByRole('button', { name: 'Responder' }))
      await user.click(screen.getByRole('button', { name: 'Pendientes' }))
      expect(await screen.findByText('Selecciona un feedback del listado')).toBeInTheDocument()

      put.reject()
      await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      expect(screen.getByPlaceholderText(placeholder)).toHaveValue('Respuesta')
    })

    it('does not replace a selection made while the answer was in flight', async () => {
      mockApi()
      const put = deferNextPut()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      await user.type(screen.getByPlaceholderText(placeholder), 'Respuesta')
      await user.click(screen.getByRole('button', { name: 'Responder' }))
      // El siguiente pendiente tras Ana sería Carla; el usuario elige Dani.
      await user.click(screen.getByRole('button', { name: /Dani Test/ }))

      put.resolve()
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Respuesta enviada correctamente'))
      await waitFor(() => expect(screen.getByRole('button', { name: /Ana Test/ })).toHaveAccessibleName(/Revisado/))
      expect(screen.getByRole('heading', { level: 2, name: 'Dani Test' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Dani Test/ })).toHaveAttribute('aria-current', 'true')
    })

    it('keeps the answer button of another item usable while one answer is in flight', async () => {
      mockApi()
      deferNextPut()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      await user.type(screen.getByPlaceholderText(placeholder), 'Respuesta')
      await user.click(screen.getByRole('button', { name: 'Responder' }))
      expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: /Dani Test/ }))
      await user.type(screen.getByPlaceholderText(placeholder), 'Otra')
      expect(screen.getByRole('button', { name: 'Responder' })).toBeEnabled()
      expect(screen.queryByRole('button', { name: 'Enviando...' })).not.toBeInTheDocument()
    })
  })

  describe('guarda de cambios sin guardar', () => {
    it('keeps the guard active for an unsent draft of another item', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: /Ana Test/ }))
      await user.type(screen.getByPlaceholderText('Escribe tu respuesta o comentario...'), 'Borrador')
      expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)

      await user.click(screen.getByRole('button', { name: /Carla Test/ }))
      expect(screen.getByPlaceholderText('Escribe tu respuesta o comentario...')).toHaveValue('')
      expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)
    })
  })

  describe('texto accesible de las filas', () => {
    it('names each row with the old column labels, including the media type', async () => {
      mockApi()
      renderPage()

      const ana = await screen.findByRole('button', { name: /Ana Test/ })
      expect(ana).toHaveAccessibleName(/Cliente: Ana Test/)
      expect(ana).toHaveAccessibleName(/Ejercicio: Ejercicio Ana/)
      expect(ana).toHaveAccessibleName(/Tipo: Vídeo/)
      expect(ana).toHaveAccessibleName(/Estado: Pendiente/)
      expect(ana).toHaveAccessibleName(/Fecha: \d{2}\/\d{2}\/\d{4}/)
      expect(screen.getByRole('button', { name: /Carla Test/ })).toHaveAccessibleName(/Tipo: Imagen/)
    })
  })
})

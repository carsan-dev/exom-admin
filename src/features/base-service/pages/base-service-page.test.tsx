import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseServicePage } from './base-service-page'
import {
  BASE_URL,
  axiosError,
  envelope,
  installBackend,
  makeDelivery,
  makeSubscriber,
  routes,
  type FakeBackend,
} from '../test-support'
import type { BaseSubscriber } from '../types'

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

let backend: FakeBackend

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => undefined
  Element.prototype.releasePointerCapture = () => undefined
  Element.prototype.scrollIntoView = () => undefined
})

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset())
  backend = { subscribers: [makeSubscriber()], deliveries: {}, routes }
  installBackend(api, backend)
})

afterEach(() => {
  vi.useRealTimers()
})

function renderPage() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={cache}>
      <MemoryRouter>
        <BaseServicePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function pick(user: UserEvent, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

function listCalls() {
  return api.get.mock.calls.filter(([url]) => url === `${BASE_URL}/subscribers`)
}

function lastListCall() {
  const calls = listCalls()
  return calls[calls.length - 1]
}

describe('Servicio base list', () => {
  it('renders rows with labels and status badges', async () => {
    backend.subscribers = [
      makeSubscriber({ latest_delivery: { id: 'd1', month: 1, status: 'SENT', send_seq: 1 }, last_sent_month: 1, next_month: 2 }),
      makeSubscriber({ id: 's2', order_code: 'EXB-000002', name: 'Luis', email: 'luis@example.com', goal: 'ganar-fuerza', days_per_week: 5 }),
      makeSubscriber({ id: 's3', order_code: 'EXB-000003', name: 'Eva', goal: 'objetivo-raro', latest_delivery: { id: 'd3', month: 1, status: 'FAILED', send_seq: 1 } }),
    ]
    renderPage()
    await screen.findByText('EXB-000001')
    expect(screen.getByText('Servicio base', { selector: 'h1' })).toBeInTheDocument()
    expect(screen.getByText('Perder grasa')).toBeInTheDocument()
    expect(screen.getByText('Ganar fuerza')).toBeInTheDocument()
    expect(screen.getByText('Objetivo raro')).toBeInTheDocument()
    expect(screen.getByText('Enviado')).toBeInTheDocument()
    expect(screen.getByText('Sin envíos')).toBeInTheDocument()
    expect(screen.getByText('Fallido')).toBeInTheDocument()
  })

  it('shows the empty state with a call to create the first subscriber', async () => {
    backend.subscribers = []
    renderPage()
    expect(await screen.findByRole('button', { name: 'Crea el primer suscriptor' })).toBeInTheDocument()
  })

  it('shows a clear notice when the service is not configured', async () => {
    api.get.mockRejectedValue(axiosError(503, { message: 'x', code: 'SOURCE_NOT_CONFIGURED' }))
    renderPage()
    expect(await screen.findByText(/no está configurado en este entorno/)).toBeInTheDocument()
  })

  it('shows the server message on a generic list error', async () => {
    api.get.mockImplementation(async (url: string) => {
      if (url === `${BASE_URL}/routes`) return envelope(routes)
      throw axiosError(400, { message: 'Fallo interno' })
    })
    renderPage()
    expect(await screen.findByText('Fallo interno')).toBeInTheDocument()
  })

  it('sends the debounced search as q and the archive filter as archive', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('EXB-000001')
    expect(listCalls()[0][1]).toEqual({ params: { archive: 'visible', page: 1, limit: 20 } })

    await user.type(screen.getByRole('searchbox', { name: 'Buscar suscriptores' }), 'ana')
    await waitFor(() =>
      expect(lastListCall()?.[1]).toEqual({ params: { archive: 'visible', page: 1, limit: 20, q: 'ana' } }),
    )

    await user.click(screen.getByRole('button', { name: 'Archivados' }))
    await waitFor(() => expect(lastListCall()?.[1]).toEqual({ params: { archive: 'archived', page: 1, limit: 20, q: 'ana' } }))
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    await waitFor(() => expect(lastListCall()?.[1]).toMatchObject({ params: { archive: 'all' } }))
  })
})

describe('Enviar mes button', () => {
  const sendButton = (name: string) => screen.getByRole('button', { name })

  const blockedCases: [string, Partial<BaseSubscriber>, string][] = [
    ['archived', { is_archived: true }, 'El suscriptor está archivado'],
    ['pending', { latest_delivery: { id: 'd', month: 1, status: 'PENDING' as const, send_seq: 1 } }, 'El mes 1 se está enviando'],
    ['failed', { latest_delivery: { id: 'd', month: 1, status: 'FAILED' as const, send_seq: 1 } }, 'Resuelve el mes 1 antes de enviar el siguiente'],
    ['no content', { days_per_week: 4, next_month: 2 }, 'Aún no hay contenido para el mes 2'],
  ]

  it.each(blockedCases)('is disabled and explained when %s', async (_name, overrides, reason) => {
    backend.subscribers = [makeSubscriber(overrides)]
    renderPage()
    if ('is_archived' in overrides) await userEvent.click(await screen.findByRole('button', { name: 'Todos' }))
    await screen.findByText('EXB-000001')
    const button = await screen.findByRole('button', { name: /Enviar mes/ })
    expect(button).toBeDisabled()
    expect(screen.getByText(reason)).toBeInTheDocument()
    expect(button.parentElement).toHaveAccessibleDescription(reason)
    expect(button.parentElement).toHaveAttribute('tabindex', '0')
  })

  it('explains a route that is no longer in the catalogue', async () => {
    backend.subscribers = [makeSubscriber({ goal: 'objetivo-raro' })]
    renderPage()
    expect(await screen.findByText('Esta ruta ya no está en el catálogo. Edita el objetivo o los días.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar mes/ })).toBeDisabled()
  })

  it('is disabled while the catalogue is loading', async () => {
    api.get.mockImplementation((url: string) =>
      url === `${BASE_URL}/routes` ? new Promise(() => undefined) : Promise.resolve(envelope({ data: backend.subscribers, total: 1, page: 1, limit: 20, totalPages: 1 })),
    )
    renderPage()
    expect(await screen.findByText('Comprobando el contenido disponible…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar mes/ })).toBeDisabled()
  })

  it('stays enabled when the catalogue request failed (the server validates)', async () => {
    api.get.mockImplementation(async (url: string) => {
      if (url === `${BASE_URL}/routes`) throw axiosError(400, { message: 'Catálogo no disponible' })
      return envelope({ data: backend.subscribers, total: 1, page: 1, limit: 20, totalPages: 1 })
    })
    renderPage()
    await screen.findByText('EXB-000001')
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(`${BASE_URL}/routes`))
    await waitFor(() => expect(screen.queryByText('Comprobando el contenido disponible…')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Enviar mes 1' })).toBeEnabled()
  })

  it('is enabled when the next month has content', async () => {
    renderPage()
    await screen.findByText('EXB-000001')
    await waitFor(() => expect(sendButton('Enviar mes 1')).toBeEnabled())
  })
})

describe('Send flow', () => {
  async function openSendDialog() {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('EXB-000001')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar mes 1' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Enviar mes 1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Enviar mes 1' })
    return { user, dialog }
  }

  it('describes what is sent and posts the month exactly once on double click', async () => {
    let resolvePost: (value: unknown) => void = () => undefined
    api.post.mockImplementation(() => new Promise((resolve) => { resolvePost = resolve }))
    const { dialog } = await openSendDialog()
    expect(within(dialog).getByText('Ana Pérez (ana@example.com)')).toBeInTheDocument()
    expect(within(dialog).getByText('Perder grasa · 3 días/semana')).toBeInTheDocument()
    expect(within(dialog).getByText('Bloque de entrenamiento del mes 1')).toBeInTheDocument()
    expect(within(dialog).getByText('Guía de nutrición del mes 1')).toBeInTheDocument()
    expect(within(dialog).getByText('Guía de inicio')).toBeInTheDocument()
    expect(within(dialog).getByText(/Confirma que ha pagado este mes/)).toBeInTheDocument()

    const confirmButton = within(dialog).getByRole('button', { name: 'Enviar mes 1' })
    // Both clicks land before React can re-render the button as disabled.
    await act(async () => {
      fireEvent.click(confirmButton)
      fireEvent.click(confirmButton)
    })
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1/deliveries`, { month: 1 })

    backend.subscribers = [makeSubscriber({ latest_delivery: { id: 'd1', month: 1, status: 'PENDING', send_seq: 1 }, next_month: 2 })]
    resolvePost(envelope(makeDelivery({ status: 'PENDING' })))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Enviar mes 1' })).not.toBeInTheDocument())
    expect(await screen.findByText('Enviando…')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it('keeps the dialog open showing the server message on error', async () => {
    api.post.mockRejectedValue(axiosError(409, { message: 'Solo se puede enviar el mes 2 a este suscriptor.', code: 'MONTH_NOT_NEXT' }))
    const { user, dialog } = await openSendDialog()
    const callsBefore = listCalls().length
    await user.click(within(dialog).getByRole('button', { name: 'Enviar mes 1' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Solo se puede enviar el mes 2 a este suscriptor.')
    expect(screen.getByRole('dialog', { name: 'Enviar mes 1' })).toBeInTheDocument()
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(callsBefore))
  })

  it('refreshes the stale row after a failed send so the real state shows', async () => {
    api.post.mockImplementation(async () => {
      // Another staff member already sent month 1 and month 2 is now pending.
      backend.subscribers = [makeSubscriber({ next_month: 3, last_sent_month: 1, latest_delivery: { id: 'd2', month: 2, status: 'PENDING', send_seq: 1 } })]
      throw axiosError(409, { message: 'Solo se puede enviar el mes 3 a este suscriptor.', code: 'PREVIOUS_MONTH_NOT_SENT' })
    })
    const { user, dialog } = await openSendDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Enviar mes 1' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Solo se puede enviar el mes 3')
    await waitFor(() => expect(screen.getByText('Enviando…')).toBeInTheDocument())
  })

  it.each([
    ['EMAIL_NOT_CONFIGURED'],
    ['SOURCE_NOT_CONFIGURED'],
  ])('shows the not-configured notice inside the dialog on 503 %s', async (code) => {
    api.post.mockRejectedValue(axiosError(503, { message: 'raw backend text', code }))
    const { user, dialog } = await openSendDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Enviar mes 1' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('El servicio base no está configurado en este entorno.')
    expect(alert).not.toHaveTextContent('raw backend text')
  })

  it('does not mention the start guide after month 1', async () => {
    backend.subscribers = [makeSubscriber({ next_month: 2, last_sent_month: 1, latest_delivery: { id: 'd', month: 1, status: 'SENT', send_seq: 1 } })]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('EXB-000001')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar mes 2' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Enviar mes 2' }))
    const dialog = await screen.findByRole('dialog', { name: 'Enviar mes 2' })
    expect(within(dialog).queryByText('Guía de inicio')).not.toBeInTheDocument()
  })
})

describe('Create form', () => {
  async function openCreate() {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('EXB-000001')
    await user.click(screen.getByRole('button', { name: 'Nuevo suscriptor' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo suscriptor' })
    await waitFor(() => expect(within(dialog).getByRole('combobox', { name: 'Objetivo' })).toBeEnabled())
    return { user, dialog }
  }

  it('requires fields and a basic email format', async () => {
    const { user, dialog } = await openCreate()
    await user.click(within(dialog).getByRole('button', { name: 'Crear suscriptor' }))
    expect(await within(dialog).findByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(within(dialog).getByText('El email es obligatorio')).toBeInTheDocument()
    expect(within(dialog).getByText('El objetivo es obligatorio')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Email'), 'no-es-email')
    await user.click(within(dialog).getByRole('button', { name: 'Crear suscriptor' }))
    expect(await within(dialog).findByText('Introduce un email válido')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('offers days depending on the goal and resets days that no longer apply', async () => {
    const { user, dialog } = await openCreate()
    expect(within(dialog).getByRole('combobox', { name: 'Días por semana' })).toBeDisabled()
    await pick(user, 'Objetivo', 'Perder grasa')
    await user.click(within(dialog).getByRole('combobox', { name: 'Días por semana' }))
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual(['3 días', '4 días'])
    await user.click(screen.getByRole('option', { name: '3 días' }))
    expect(within(dialog).getByRole('combobox', { name: 'Días por semana' })).toHaveTextContent('3 días')

    await pick(user, 'Objetivo', 'Ganar fuerza')
    expect(within(dialog).getByRole('combobox', { name: 'Días por semana' })).toHaveTextContent('Selecciona los días')
    await user.click(within(dialog).getByRole('combobox', { name: 'Días por semana' }))
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual(['5 días'])
  })

  it('creates a subscriber with the typed payload', async () => {
    api.post.mockResolvedValue(envelope(makeSubscriber({ id: 's9' })))
    const { user, dialog } = await openCreate()
    await user.type(within(dialog).getByLabelText('Nombre'), '  Marta Gil ')
    await user.type(within(dialog).getByLabelText('Email'), 'marta@example.com')
    await pick(user, 'Objetivo', 'Perder grasa')
    await pick(user, 'Días por semana', '4 días')
    await user.type(within(dialog).getByLabelText('Notas (opcional)'), 'Bizum')
    await user.click(within(dialog).getByRole('button', { name: 'Crear suscriptor' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/subscribers`, {
      name: 'Marta Gil',
      email: 'marta@example.com',
      goal: 'perder-grasa',
      days_per_week: 4,
      notes: 'Bizum',
    })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nuevo suscriptor' })).not.toBeInTheDocument())
  })

  it('submits only once when the form is submitted twice before re-render', async () => {
    let resolvePost: (value: unknown) => void = () => undefined
    api.post.mockImplementation(() => new Promise((resolve) => { resolvePost = resolve }))
    const { user, dialog } = await openCreate()
    await user.type(within(dialog).getByLabelText('Nombre'), 'Marta')
    await user.type(within(dialog).getByLabelText('Email'), 'marta@example.com')
    await pick(user, 'Objetivo', 'Ganar fuerza')
    await pick(user, 'Días por semana', '5 días')
    const form = dialog.querySelector('form')
    if (!form) throw new Error('form not found')
    await act(async () => {
      fireEvent.submit(form)
      fireEvent.submit(form)
    })
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    expect(api.post).toHaveBeenCalledTimes(1)
    resolvePost(envelope(makeSubscriber({ id: 's9' })))
  })

  it('shows every message of an array-shaped validation error and keeps the dialog open', async () => {
    api.post.mockRejectedValue(axiosError(400, { message: ['name must be shorter', 'email must be an email'] }))
    const { user, dialog } = await openCreate()
    await user.type(within(dialog).getByLabelText('Nombre'), 'Marta')
    await user.type(within(dialog).getByLabelText('Email'), 'marta@example.com')
    await pick(user, 'Objetivo', 'Ganar fuerza')
    await pick(user, 'Días por semana', '5 días')
    await user.click(within(dialog).getByRole('button', { name: 'Crear suscriptor' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('name must be shorter')
    expect(alert).toHaveTextContent('email must be an email')
  })

  it('shows a string server message such as STAMP_TOO_LONG as returned', async () => {
    api.post.mockRejectedValue(axiosError(400, { message: 'El nombre y el email son demasiado largos.', code: 'STAMP_TOO_LONG' }))
    const { user, dialog } = await openCreate()
    await user.type(within(dialog).getByLabelText('Nombre'), 'Marta')
    await user.type(within(dialog).getByLabelText('Email'), 'marta@example.com')
    await pick(user, 'Objetivo', 'Ganar fuerza')
    await pick(user, 'Días por semana', '5 días')
    await user.click(within(dialog).getByRole('button', { name: 'Crear suscriptor' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El nombre y el email son demasiado largos.')
  })
})

describe('Edit and archive from the detail', () => {
  async function openEdit() {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('EXB-000001')
    await user.click(screen.getByRole('button', { name: /^Ver/ }))
    const detail = await screen.findByRole('dialog', { name: 'Ana Pérez' })
    await user.click(await within(detail).findByRole('button', { name: 'Editar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar suscriptor' })
    await waitFor(() => expect(within(dialog).getByRole('combobox', { name: 'Objetivo' })).toBeEnabled())
    return { user, dialog }
  }

  it('shows the read-only order code and the next-sends note', async () => {
    const { dialog } = await openEdit()
    expect(within(dialog).getByText('EXB-000001')).toBeInTheDocument()
    expect(within(dialog).getByText('Los cambios se aplican a los próximos envíos; los ya enviados no cambian.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Ana Pérez')
  })

  it('sends only the changed fields', async () => {
    api.patch.mockResolvedValue(envelope(makeSubscriber({ name: 'Ana María' })))
    const { user, dialog } = await openEdit()
    await user.clear(within(dialog).getByLabelText('Nombre'))
    await user.type(within(dialog).getByLabelText('Nombre'), 'Ana María')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    expect(api.patch).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1`, { name: 'Ana María' })
  })

  it('does not send an empty PATCH when nothing changed', async () => {
    const { user, dialog } = await openEdit()
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar suscriptor' })).not.toBeInTheDocument())
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('treats NO_CHANGES from the server as nothing to save', async () => {
    api.patch.mockRejectedValue(axiosError(400, { message: 'No hay cambios.', code: 'NO_CHANGES' }))
    const { user, dialog } = await openEdit()
    await user.clear(within(dialog).getByLabelText('Notas (opcional)'))
    await user.type(within(dialog).getByLabelText('Notas (opcional)'), 'x')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar suscriptor' })).not.toBeInTheDocument())
    expect(api.patch).toHaveBeenCalledTimes(1)
  })

  it('archives after confirmation and restores an archived subscriber', async () => {
    api.put.mockResolvedValue(envelope(makeSubscriber({ is_archived: true })))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('EXB-000001')
    await user.click(screen.getByRole('button', { name: /^Ver/ }))
    const detail = await screen.findByRole('dialog', { name: 'Ana Pérez' })
    await user.click(await within(detail).findByRole('button', { name: 'Archivar' }))
    const confirm = await screen.findByRole('dialog', { name: 'Archivar suscriptor' })
    expect(within(confirm).getByText('No recibirá más envíos. Su historial se conserva.')).toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
    await user.click(within(confirm).getByRole('button', { name: 'Archivar' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1/archive`, { is_archived: true }, { timeout: 70000 }))
  })

  it('reactivates an archived subscriber', async () => {
    backend.subscribers = [makeSubscriber({ is_archived: true, archived_at: '2026-11-05T10:00:00.000Z' })]
    api.put.mockResolvedValue(envelope(makeSubscriber()))
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Archivados' }))
    await user.click(await screen.findByRole('button', { name: /^Ver/ }))
    const detail = await screen.findByRole('dialog', { name: 'Ana Pérez' })
    await user.click(await within(detail).findByRole('button', { name: 'Reactivar' }))
    const confirm = await screen.findByRole('dialog', { name: 'Reactivar suscriptor' })
    await user.click(within(confirm).getByRole('button', { name: 'Reactivar' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1/archive`, { is_archived: false }, { timeout: 70000 }))
  })
})

describe('Live status polling', () => {
  it('polls every 5 s while a delivery is PENDING and stops once it is SENT', async () => {
    vi.useFakeTimers()
    backend.subscribers = [makeSubscriber({ latest_delivery: { id: 'd1', month: 1, status: 'PENDING', send_seq: 1 } })]
    renderPage()
    await vi.advanceTimersByTimeAsync(50)
    expect(screen.getByText('Enviando…')).toBeInTheDocument()
    expect(listCalls()).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(5000)
    expect(listCalls()).toHaveLength(2)

    backend.subscribers = [makeSubscriber({ last_sent_month: 1, next_month: 2, latest_delivery: { id: 'd1', month: 1, status: 'SENT', send_seq: 1 } })]
    await vi.advanceTimersByTimeAsync(5000)
    expect(listCalls()).toHaveLength(3)
    expect(screen.getByText('Enviado')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(30000)
    expect(listCalls()).toHaveLength(3)
  })

  it('does not poll when nothing is pending', async () => {
    vi.useFakeTimers()
    renderPage()
    await vi.advanceTimersByTimeAsync(50)
    await vi.advanceTimersByTimeAsync(20000)
    expect(listCalls()).toHaveLength(1)
  })
})

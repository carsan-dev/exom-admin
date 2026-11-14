import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SubscriberDetailDialog } from './subscriber-detail-dialog'
import { toast } from 'sonner'
import { AMBIGUOUS_WARNING } from '../labels'
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

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

let backend: FakeBackend

const sentWithResend = makeDelivery({
  id: 'd1',
  month: 1,
  snapshot_email: 'ana-vieja@example.com',
  send_seq: 2,
  sends: [
    { send_seq: 1, status: 'SENT', requested_by_id: null, requested_at: '2026-11-02T10:00:00.000Z', sent_at: '2026-11-02T10:01:00.000Z', provider_message_id: null, error: null, attempts: 1, snapshot_name: 'Ana Pérez', snapshot_email: 'ana-primera@example.com', possibly_delivered: false },
    { send_seq: 2, status: 'SENT', requested_by_id: null, requested_at: '2026-11-03T10:00:00.000Z', sent_at: '2026-11-03T10:01:00.000Z', provider_message_id: null, error: null, attempts: 1, snapshot_name: 'Ana P. Vieja', snapshot_email: 'ana-vieja@example.com', possibly_delivered: false },
  ],
})
const ambiguousFailed = makeDelivery({ id: 'd2', month: 2, status: 'FAILED', sent_at: null, last_error: 'EMAIL_PROVIDER_UNREACHABLE', possibly_delivered: true, snapshot_goal: 'ganar-fuerza', snapshot_days_per_week: 5 })
const opsFailed = makeDelivery({ id: 'd3', month: 3, status: 'FAILED', sent_at: null, last_error: 'BASE_SOURCE_CHANGED', possibly_delivered: false })
const pendingDelivery = makeDelivery({ id: 'd4', month: 4, status: 'PENDING', sent_at: null })

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset())
  backend = {
    subscribers: [makeSubscriber({ latest_delivery: { id: 'd4', month: 4, status: 'PENDING', send_seq: 1 } })],
    deliveries: { s1: [opsFailed, pendingDelivery, sentWithResend, ambiguousFailed] },
    routes,
  }
  installBackend(api, backend)
})

afterEach(() => {
  vi.useRealTimers()
})

function renderDetail(subscriberId: string | null = 's1') {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={cache}>
      <SubscriberDetailDialog subscriberId={subscriberId} onClose={vi.fn()} onEdit={vi.fn()} />
    </QueryClientProvider>,
  )
}

function detailCalls() {
  return api.get.mock.calls.filter(([url]) => url === `${BASE_URL}/subscribers/s1` || url === `${BASE_URL}/subscribers/s1/deliveries`)
}

async function historyItem(month: number) {
  const detail = await screen.findByRole('dialog', { name: 'Ana Pérez' })
  await screen.findByText('Mes 1')
  const item = within(detail).getByText(`Mes ${month}`).closest('li')
  if (!item) throw new Error(`no history item for month ${month}`)
  return item
}

describe('Subscriber detail history', () => {
  it('lists deliveries ordered by month with differing email/route, files and send history', async () => {
    renderDetail()
    const detail = await screen.findByRole('dialog', { name: 'Ana Pérez' })
    await screen.findByText('Mes 1')
    expect(within(detail).getByText('EXB-000001')).toBeInTheDocument()
    const months = within(detail).getAllByText(/^Mes \d$/).map((node) => node.textContent)
    expect(months).toEqual(['Mes 1', 'Mes 2', 'Mes 3', 'Mes 4'])

    const first = await historyItem(1)
    expect(within(first).getByText('ana-vieja@example.com')).toBeInTheDocument()
    expect(within(first).getByText('A ana-primera@example.com')).toBeInTheDocument()
    expect(within(first).getByText('A ana-vieja@example.com (Ana P. Vieja)')).toBeInTheDocument()
    expect(within(first).getByText('EXOM_Entrenamiento_Bloque-01.pdf')).toBeInTheDocument()
    expect(within(first).getByText('Envío 1')).toBeInTheDocument()
    expect(within(first).getByText('Envío 2')).toBeInTheDocument()

    const second = await historyItem(2)
    expect(within(second).getByText('Ganar fuerza · 5 días/semana')).toBeInTheDocument()
    expect(within(second).queryByText('Historial de envíos')).not.toBeInTheDocument()
  })

  it('shows the ambiguity warning for possibly_delivered=true plus the per-code text and raw code', async () => {
    renderDetail()
    const item = await historyItem(2)
    expect(within(item).getByText(AMBIGUOUS_WARNING)).toBeInTheDocument()
    expect(within(item).getByText('El proveedor de email no respondió con claridad tras varios intentos.')).toBeInTheDocument()
    expect(within(item).getByText('EMAIL_PROVIDER_UNREACHABLE')).toBeInTheDocument()
  })

  it('never shows the ambiguity warning when possibly_delivered=false, whatever the code', async () => {
    renderDetail()
    const item = await historyItem(3)
    expect(within(item).queryByText(AMBIGUOUS_WARNING)).not.toBeInTheDocument()
    expect(within(item).getByText(/problema de configuración o de contenido/)).toBeInTheDocument()
    expect(within(item).getByText('BASE_SOURCE_CHANGED')).toBeInTheDocument()
  })

  it('has no resend on PENDING deliveries', async () => {
    renderDetail()
    const item = await historyItem(4)
    expect(within(item).queryByRole('button', { name: /Reenviar/ })).not.toBeInTheDocument()
  })

  it('hides every resend when the subscriber is archived', async () => {
    backend.subscribers = [makeSubscriber({ is_archived: true })]
    renderDetail()
    await historyItem(1)
    expect(screen.queryByRole('button', { name: /Reenviar/ })).not.toBeInTheDocument()
  })
})

describe('Resend confirmation', () => {
  async function openResend(month: number) {
    const user = userEvent.setup()
    renderDetail()
    const item = await historyItem(month)
    await user.click(within(item).getByRole('button', { name: `Reenviar mes ${month}` }))
    const dialog = await screen.findByRole('dialog', { name: `Reenviar mes ${month}` })
    await waitFor(() => expect(within(dialog).getByRole('button', { name: `Reenviar mes ${month}` })).toBeEnabled())
    return { user, dialog }
  }

  it('SENT, address changed: sends to the current address and mentions the previous one', async () => {
    const { dialog } = await openResend(1)
    expect(within(dialog).getByText('Este mes ya se envió. Se volverá a enviar el mismo material.')).toBeInTheDocument()
    expect(within(dialog).getByText('Se enviará a ana@example.com.')).toBeInTheDocument()
    expect(within(dialog).getByText('La vez anterior se envió a ana-vieja@example.com.')).toBeInTheDocument()
    expect(within(dialog).queryByText(/guardada|almacenad/)).not.toBeInTheDocument()
  })

  it('FAILED possibly_delivered: shows the ambiguity warning', async () => {
    const { dialog } = await openResend(2)
    expect(within(dialog).getByText(AMBIGUOUS_WARNING)).toBeInTheDocument()
  })

  it('FAILED nothing sent, same address: plain retry without the previous-address line', async () => {
    api.post.mockResolvedValue(envelope(makeDelivery({ id: 'd3', month: 3, status: 'PENDING' })))
    const { user, dialog } = await openResend(3)
    expect(within(dialog).getByText('Se volverá a intentar el envío.')).toBeInTheDocument()
    expect(within(dialog).getByText('Se enviará a ana@example.com.')).toBeInTheDocument()
    expect(within(dialog).queryByText(/La vez anterior/)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Reenviar mes 3' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1/deliveries/d3/resend`)
  })

  it('reads fresh subscriber data when the dialog opens (edited email after the detail loaded)', async () => {
    const user = userEvent.setup()
    renderDetail()
    const item = await historyItem(3)
    backend.subscribers = [makeSubscriber({ email: 'ana-nueva@example.com' })]
    await user.click(within(item).getByRole('button', { name: 'Reenviar mes 3' }))
    const dialog = await screen.findByRole('dialog', { name: 'Reenviar mes 3' })
    expect(await within(dialog).findByText('Se enviará a ana-nueva@example.com.')).toBeInTheDocument()
    expect(within(dialog).getByText('La vez anterior se envió a ana@example.com.')).toBeInTheDocument()
  })

  it.each([
    [409, 'SUBSCRIBER_CHANGED', 'El suscriptor se editó mientras se preparaba el reenvío. Reintenta.'],
    [403, 'STAFF_ACCESS_CHANGED', 'Tu acceso ha cambiado.'],
    [409, 'DELIVERY_CHANGED', 'La entrega ha cambiado mientras se preparaba el reenvío. Recarga el historial y comprueba su estado antes de volver a intentarlo.'],
  ])('shows the server message of %s %s and keeps the dialog open', async (status, code, message) => {
    api.post.mockRejectedValue(axiosError(status, { message, code }))
    const { user, dialog } = await openResend(3)
    const callsBefore = api.get.mock.calls.length
    await user.click(within(dialog).getByRole('button', { name: 'Reenviar mes 3' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('dialog', { name: 'Reenviar mes 3' })).toBeInTheDocument()
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(callsBefore))
  })

  it('DELIVERY_CHANGED: refetches the history, shows the new state and re-enables confirm only afterwards', async () => {
    const message = 'La entrega ha cambiado mientras se preparaba el reenvío. Recarga el historial y comprueba su estado antes de volver a intentarlo.'
    api.post.mockImplementation(async () => {
      backend.deliveries = { s1: [makeDelivery({ id: 'd3', month: 3, status: 'SENT', send_seq: 2 }), pendingDelivery] }
      throw axiosError(409, { message, code: 'DELIVERY_CHANGED' })
    })
    const { user, dialog } = await openResend(3)
    await user.click(within(dialog).getByRole('button', { name: 'Reenviar mes 3' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message)
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Reenviar mes 3' })).toBeEnabled())
    expect(api.post).toHaveBeenCalledTimes(1)
    const item = screen.getByText('Mes 3').closest('li')
    if (!item) throw new Error('no history item for month 3')
    expect((await within(item).findAllByText('Enviado')).length).toBeGreaterThan(0)
  })
})

describe('Resend with changed source material', () => {
  const resendUrl = `${BASE_URL}/subscribers/s1/deliveries/d3/resend`
  const changed = () =>
    axiosError(409, { message: 'Los PDF del mes 3 han cambiado. Avisa al equipo técnico.', code: 'SOURCE_CHANGED_SINCE_DELIVERY' })

  beforeEach(() => {
    backend.subscribers = [makeSubscriber()]
    backend.deliveries = { s1: [sentWithResend, opsFailed] }
  })

  async function reachConfirmation() {
    api.post.mockRejectedValueOnce(changed())
    const user = userEvent.setup()
    renderDetail()
    const item = await historyItem(3)
    await user.click(within(item).getByRole('button', { name: 'Reenviar mes 3' }))
    const first = await screen.findByRole('dialog', { name: 'Reenviar mes 3' })
    await waitFor(() => expect(within(first).getByRole('button', { name: 'Reenviar mes 3' })).toBeEnabled())
    await user.click(within(first).getByRole('button', { name: 'Reenviar mes 3' }))
    const dialog = await screen.findByRole('dialog', { name: 'El material de este mes ha cambiado' })
    return { user, dialog }
  }

  it('first attempt carries no flag; the 409 switches to a confirmation without an error', async () => {
    const { dialog } = await reachConfirmation()
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith(resendUrl)
    expect(
      within(dialog).getByText(
        'Los PDF del mes 3 se han actualizado desde el último envío de esta entrega. Si continúas, el cliente recibirá la versión actual.',
      ),
    ).toBeInTheDocument()
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/equipo técnico/)).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Enviar versión actual' })).toBeInTheDocument()
  })

  it('confirming repeats the request with accept_changed_source and follows the success path', async () => {
    const { user, dialog } = await reachConfirmation()
    api.post.mockResolvedValueOnce(envelope(makeDelivery({ id: 'd3', month: 3, status: 'PENDING' })))
    await user.click(within(dialog).getByRole('button', { name: 'Enviar versión actual' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'El material de este mes ha cambiado' })).not.toBeInTheDocument())
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.post).toHaveBeenNthCalledWith(2, resendUrl, { accept_changed_source: true })
    expect(toast.success).toHaveBeenCalledWith('Mes 3 en cola para reenviar')
  })

  it('cancelling closes without a second request and reopening starts clean', async () => {
    const { user, dialog } = await reachConfirmation()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'El material de este mes ha cambiado' })).not.toBeInTheDocument())
    expect(api.post).toHaveBeenCalledTimes(1)
    const item = await historyItem(3)
    await user.click(within(item).getByRole('button', { name: 'Reenviar mes 3' }))
    const reopened = await screen.findByRole('dialog', { name: 'Reenviar mes 3' })
    expect(within(reopened).queryByRole('button', { name: 'Enviar versión actual' })).not.toBeInTheDocument()
    expect(within(reopened).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a second 409 shows the final message and does not loop', async () => {
    const { user, dialog } = await reachConfirmation()
    api.post.mockRejectedValueOnce(changed())
    await user.click(within(dialog).getByRole('button', { name: 'Enviar versión actual' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido reenviar con la versión actual. Inténtalo de nuevo más tarde.')
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('button', { name: 'Enviar versión actual' })).not.toBeInTheDocument()
  })

  it('double click on Enviar versión actual posts once', async () => {
    const { dialog } = await reachConfirmation()
    api.post.mockImplementationOnce(() => new Promise(() => undefined))
    const confirm = within(dialog).getByRole('button', { name: 'Enviar versión actual' })
    await act(async () => {
      fireEvent.click(confirm)
      fireEvent.click(confirm)
    })
    expect(api.post).toHaveBeenCalledTimes(2)
  })

  it('another error on the confirmed attempt returns to the normal dialog and the next attempt has no flag', async () => {
    const { user, dialog } = await reachConfirmation()
    api.post.mockRejectedValueOnce(
      axiosError(409, { message: 'La entrega ha cambiado mientras se preparaba el reenvío.', code: 'DELIVERY_CHANGED' }),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Enviar versión actual' }))
    const normal = await screen.findByRole('dialog', { name: 'Reenviar mes 3' })
    expect(await within(normal).findByRole('alert')).toHaveTextContent('La entrega ha cambiado mientras se preparaba el reenvío.')
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.post).toHaveBeenNthCalledWith(2, resendUrl, { accept_changed_source: true })
    api.post.mockResolvedValueOnce(envelope(makeDelivery({ id: 'd3', month: 3, status: 'PENDING' })))
    const retry = within(normal).getByRole('button', { name: 'Reenviar mes 3' })
    await waitFor(() => expect(retry).toBeEnabled())
    await user.click(retry)
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(3))
    expect(api.post).toHaveBeenNthCalledWith(3, resendUrl)
  })
})

describe('Resend edge cases', () => {
  const stampFailed = makeDelivery({ id: 'd5', month: 5, status: 'FAILED', sent_at: null, last_error: 'BASE_STAMP_TOO_LONG', possibly_delivered: false })
  const rejectedFailed = makeDelivery({ id: 'd6', month: 6, status: 'FAILED', sent_at: null, last_error: 'EMAIL_REQUEST_REJECTED' })

  beforeEach(() => {
    backend.subscribers = [makeSubscriber()]
    backend.deliveries = { s1: [sentWithResend, stampFailed, rejectedFailed] }
  })

  it('explains BASE_STAMP_TOO_LONG and offers the resend again', async () => {
    renderDetail()
    const item = await historyItem(5)
    expect(within(item).getByText('El nombre y el email eran demasiado largos para la línea de licencia. Acórtalos en la ficha y pulsa Reenviar.')).toBeInTheDocument()
    expect(within(item).getByText('BASE_STAMP_TOO_LONG')).toBeInTheDocument()
    expect(within(item).getByRole('button', { name: 'Reenviar mes 5' })).toBeInTheDocument()
  })

  it('EMAIL_REQUEST_REJECTED tells staff to fix the email and resend', async () => {
    renderDetail()
    const item = await historyItem(6)
    expect(within(item).getByText('El proveedor rechazó el envío, normalmente por una dirección de email no válida. Corrige el email en la ficha y pulsa Reenviar.')).toBeInTheDocument()
    expect(within(item).getByRole('button', { name: 'Reenviar mes 6' })).toBeInTheDocument()
  })

  it('warns that a resent SENT month blocks the next month while it is pending', async () => {
    const user = userEvent.setup()
    renderDetail()
    const item = await historyItem(1)
    await user.click(within(item).getByRole('button', { name: 'Reenviar mes 1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Reenviar mes 1' })
    expect(within(dialog).getByText('Mientras se reenvía no podrás enviar el mes siguiente.')).toBeInTheDocument()
  })

  it('posts the resend once when confirmed twice before re-render', async () => {
    api.post.mockImplementation(() => new Promise(() => undefined))
    const user = userEvent.setup()
    renderDetail()
    const item = await historyItem(1)
    await user.click(within(item).getByRole('button', { name: 'Reenviar mes 1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Reenviar mes 1' })
    const confirm = within(dialog).getByRole('button', { name: 'Reenviar mes 1' })
    await waitFor(() => expect(confirm).toBeEnabled())
    await act(async () => {
      fireEvent.click(confirm)
      fireEvent.click(confirm)
    })
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it('shows the not-configured notice inside the resend dialog', async () => {
    api.post.mockRejectedValue(axiosError(503, { message: 'raw backend text', code: 'EMAIL_NOT_CONFIGURED' }))
    const user = userEvent.setup()
    renderDetail()
    const item = await historyItem(1)
    await user.click(within(item).getByRole('button', { name: 'Reenviar mes 1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Reenviar mes 1' })
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Reenviar mes 1' })).toBeEnabled())
    await user.click(within(dialog).getByRole('button', { name: 'Reenviar mes 1' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('El servicio base no está configurado en este entorno.')
    expect(alert).not.toHaveTextContent('raw backend text')
  })
})

describe('Detail polling', () => {
  it('does not fetch or poll while closed', async () => {
    vi.useFakeTimers()
    renderDetail(null)
    await vi.advanceTimersByTimeAsync(20000)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('polls every 5 s while a delivery is PENDING and stops once it is SENT', async () => {
    vi.useFakeTimers()
    backend.subscribers = [makeSubscriber({ latest_delivery: { id: 'd4', month: 4, status: 'PENDING', send_seq: 1 } })]
    backend.deliveries = { s1: [pendingDelivery] }
    renderDetail()
    await vi.advanceTimersByTimeAsync(50)
    const initial = detailCalls().length
    expect(initial).toBe(2)
    await vi.advanceTimersByTimeAsync(5000)
    expect(detailCalls().length).toBe(initial * 2)

    backend.subscribers = [makeSubscriber({ latest_delivery: { id: 'd4', month: 4, status: 'SENT', send_seq: 1 } })]
    backend.deliveries = { s1: [makeDelivery({ id: 'd4', month: 4, status: 'SENT' })] }
    await vi.advanceTimersByTimeAsync(5000)
    const settled = detailCalls().length
    expect(settled).toBe(initial * 3)
    await vi.advanceTimersByTimeAsync(30000)
    expect(detailCalls().length).toBe(settled)
  })
})

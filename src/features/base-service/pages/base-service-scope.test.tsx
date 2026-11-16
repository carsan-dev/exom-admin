import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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

async function openCreate() {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('EXB-000001')
  await user.click(screen.getByRole('button', { name: 'Nuevo suscriptor' }))
  const dialog = await screen.findByRole('dialog', { name: 'Nuevo suscriptor' })
  await waitFor(() => expect(within(dialog).getByRole('combobox', { name: 'Objetivo' })).toBeEnabled())
  return { user, dialog }
}

async function openDetail() {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('EXB-000001')
  await user.click(screen.getByRole('button', { name: /^Ver/ }))
  const detail = await screen.findByRole('dialog', { name: 'Ana Pérez' })
  return { user, detail }
}

async function openEdit() {
  const { user, detail } = await openDetail()
  await user.click(await within(detail).findByRole('button', { name: 'Editar' }))
  const dialog = await screen.findByRole('dialog', { name: 'Editar suscriptor' })
  await waitFor(() => expect(within(dialog).getByRole('combobox', { name: 'Objetivo' })).toBeEnabled())
  return { user, dialog }
}

async function fillRequired(user: UserEvent, dialog: HTMLElement) {
  await user.type(within(dialog).getByLabelText('Nombre'), 'Marta Gil')
  await user.type(within(dialog).getByLabelText('Email'), 'marta@example.com')
  await pick(user, 'Objetivo', 'Perder grasa')
  await pick(user, 'Días de entrenamiento por semana', '4 días')
}

describe('Servicio contratado: create form', () => {
  it('offers the selector labelled and set to both by default', async () => {
    const { user, dialog } = await openCreate()
    const select = within(dialog).getByRole('combobox', { name: 'Servicio contratado' })
    expect(select).toHaveTextContent('Entrenamiento y nutrición')
    await user.click(select)
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
      'Entrenamiento y nutrición',
      'Solo entrenamiento',
      'Solo nutrición',
    ])
  })

  it('omits the scope from the body when BOTH, the API default', async () => {
    api.post.mockResolvedValue(envelope(makeSubscriber({ id: 's9' })))
    const { user, dialog } = await openCreate()
    await fillRequired(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Crear suscriptor' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/subscribers`, {
      name: 'Marta Gil',
      email: 'marta@example.com',
      goal: 'perder-grasa',
      days_per_week: 4,
    })
    const body = api.post.mock.calls[0][1]
    expect(body).not.toHaveProperty('service_scope')
  })

  it.each([
    ['Solo nutrición', 'NUTRITION'],
    ['Solo entrenamiento', 'TRAINING'],
  ])('sends the scope when %s is chosen', async (label, value) => {
    api.post.mockResolvedValue(envelope(makeSubscriber({ id: 's9' })))
    const { user, dialog } = await openCreate()
    await fillRequired(user, dialog)
    await pick(user, 'Servicio contratado', label)
    await user.click(within(dialog).getByRole('button', { name: 'Crear suscriptor' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    expect(api.post).toHaveBeenCalledWith(
      `${BASE_URL}/subscribers`,
      expect.objectContaining({ service_scope: value, days_per_week: 4, goal: 'perder-grasa' }),
    )
  })
})

describe('Servicio contratado: edit form', () => {
  it('shows BOTH for a subscriber whose response has no scope and does not send it when nothing changed', async () => {
    const { user, dialog } = await openEdit()
    expect(within(dialog).getByRole('combobox', { name: 'Servicio contratado' })).toHaveTextContent('Entrenamiento y nutrición')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar suscriptor' })).not.toBeInTheDocument())
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('sends only the scope when only the scope changed', async () => {
    api.patch.mockResolvedValue(envelope(makeSubscriber({ service_scope: 'TRAINING' })))
    const { user, dialog } = await openEdit()
    await pick(user, 'Servicio contratado', 'Solo entrenamiento')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    expect(api.patch).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1`, { service_scope: 'TRAINING' })
  })

  it('sends BOTH explicitly when going back from a narrower scope', async () => {
    backend.subscribers = [makeSubscriber({ service_scope: 'TRAINING' })]
    api.patch.mockResolvedValue(envelope(makeSubscriber()))
    const { user, dialog } = await openEdit()
    await pick(user, 'Servicio contratado', 'Entrenamiento y nutrición')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    expect(api.patch).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1`, { service_scope: 'BOTH' })
  })

  it('omits the scope from the PATCH when another field changes and the scope stays', async () => {
    backend.subscribers = [makeSubscriber({ service_scope: 'NUTRITION' })]
    api.patch.mockResolvedValue(envelope(makeSubscriber({ service_scope: 'NUTRITION', name: 'Ana María' })))
    const { user, dialog } = await openEdit()
    expect(within(dialog).getByRole('combobox', { name: 'Servicio contratado' })).toHaveTextContent('Solo nutrición')
    await user.clear(within(dialog).getByLabelText('Nombre'))
    await user.type(within(dialog).getByLabelText('Nombre'), 'Ana María')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    expect(api.patch).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1`, { name: 'Ana María' })
  })
})

describe('Servicio contratado: list and detail', () => {
  it('shows a readable label per subscriber and treats a missing scope as both', async () => {
    backend.subscribers = [
      makeSubscriber(),
      makeSubscriber({ id: 's2', order_code: 'EXB-000002', name: 'Luis', service_scope: 'TRAINING' }),
      makeSubscriber({ id: 's3', order_code: 'EXB-000003', name: 'Eva', service_scope: 'NUTRITION' }),
    ]
    renderPage()
    await screen.findByText('EXB-000001')
    const rows = screen.getAllByRole('row')
    const rowOf = (code: string) => {
      const row = rows.find((item) => within(item).queryByText(code))
      if (!row) throw new Error(`row ${code} not found`)
      return row
    }
    expect(within(rowOf('EXB-000001')).getByText('Entrenamiento y nutrición')).toBeInTheDocument()
    expect(within(rowOf('EXB-000002')).getByText('Solo entrenamiento')).toBeInTheDocument()
    expect(within(rowOf('EXB-000003')).getByText('Solo nutrición')).toBeInTheDocument()
  })

  it('shows the hired service in the subscriber detail', async () => {
    backend.subscribers = [makeSubscriber({ service_scope: 'NUTRITION' })]
    const { detail } = await openDetail()
    const term = await within(detail).findByText('Servicio contratado')
    expect(term.nextElementSibling).toHaveTextContent('Solo nutrición')
  })

  it('shows the scope each delivery was created with, not the current one', async () => {
    backend.subscribers = [makeSubscriber({ service_scope: 'BOTH' })]
    backend.deliveries = {
      s1: [
        makeDelivery({ id: 'd1', month: 1, snapshot_service_scope: 'TRAINING' }),
        makeDelivery({ id: 'd2', month: 2, snapshot_service_scope: 'NUTRITION' }),
        makeDelivery({ id: 'd3', month: 3 }),
      ],
    }
    const { detail } = await openDetail()
    const terms = await within(detail).findAllByText('Servicio de este envío')
    expect(terms.map((term) => term.nextElementSibling?.textContent)).toEqual([
      'Solo entrenamiento',
      'Solo nutrición',
      'Entrenamiento y nutrición',
    ])
  })
})

describe('Servicio contratado: send month dialog', () => {
  async function openSend() {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('EXB-000001')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar mes 1' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Enviar mes 1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Enviar mes 1' })
    return { user, dialog }
  }

  it('summarises the hired service and only lists the matching attachments', async () => {
    backend.subscribers = [makeSubscriber({ service_scope: 'NUTRITION' })]
    const { dialog } = await openSend()
    const term = within(dialog).getByText('Servicio')
    expect(term.nextElementSibling).toHaveTextContent('Solo nutrición')
    expect(within(dialog).getByText('Guía de nutrición del mes 1')).toBeInTheDocument()
    expect(within(dialog).queryByText('Bloque de entrenamiento del mes 1')).not.toBeInTheDocument()
  })

  it('maps 409 EMPTY_PACKAGE to a clear message and keeps the dialog open', async () => {
    api.post.mockRejectedValue(axiosError(409, { message: 'Paquete vacío', code: 'EMPTY_PACKAGE' }))
    const { user, dialog } = await openSend()
    await user.click(within(dialog).getByRole('button', { name: 'Enviar mes 1' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('No hay material de este mes para el servicio contratado')
    expect(alert).not.toHaveTextContent('Paquete vacío')
    expect(screen.getByRole('dialog', { name: 'Enviar mes 1' })).toBeInTheDocument()
  })
})

describe('Servicio contratado: resend dialog', () => {
  it('maps 409 EMPTY_PACKAGE on resend to the same clear message', async () => {
    backend.deliveries = { s1: [makeDelivery({ id: 'd1', month: 1, status: 'SENT' })] }
    api.post.mockRejectedValue(axiosError(409, { message: 'Paquete vacío', code: 'EMPTY_PACKAGE' }))
    const { user, detail } = await openDetail()
    await user.click(await within(detail).findByRole('button', { name: 'Reenviar mes 1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Reenviar mes 1' })
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Reenviar mes 1' })).toBeEnabled())
    await user.click(within(dialog).getByRole('button', { name: 'Reenviar mes 1' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('No hay material de este mes para el servicio contratado')
    expect(alert).not.toHaveTextContent('Paquete vacío')
  })
})

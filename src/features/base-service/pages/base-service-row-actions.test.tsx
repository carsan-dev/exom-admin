import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseServicePage } from './base-service-page'
import { BASE_URL, axiosError, envelope, installBackend, makeDelivery, makeSubscriber, routes, type FakeBackend } from '../test-support'
import type { BaseSubscriber, DeliveryStatus } from '../types'

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const DAYS_NOTE =
  'El cambio se aplica a partir del próximo mes que envíes. Los meses ya enviados se reenvían con los días que tenían.'

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
  vi.unstubAllGlobals()
})

function renderPage(initialEntry = '/') {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <BaseServicePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function withLatest(status: DeliveryStatus, overrides: Partial<BaseSubscriber> = {}) {
  return makeSubscriber({
    latest_delivery: { id: 'd1', month: 1, status, send_seq: 1 },
    last_sent_month: status === 'SENT' ? 1 : null,
    next_month: 2,
    ...overrides,
  })
}

function stubNarrowScreen() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

describe('Row actions per state', () => {
  it('without deliveries: send, edit and view, no resend', async () => {
    renderPage()
    await screen.findByText('EXB-000001')
    expect(screen.getByRole('button', { name: 'Enviar mes 1' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Editar Ana Pérez' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Ver Ana Pérez' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Reenviar/ })).not.toBeInTheDocument()
  })

  it('SENT: resend for the latest month is available next to the enabled send', async () => {
    backend.subscribers = [withLatest('SENT')]
    renderPage()
    await screen.findByText('EXB-000001')
    expect(screen.getByRole('button', { name: 'Reenviar mes 1 de Ana Pérez' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Enviar mes 2' })).toBeInTheDocument()
  })

  it('FAILED: resend is available while the next month stays blocked', async () => {
    backend.subscribers = [withLatest('FAILED', { last_sent_month: null, next_month: 2 })]
    renderPage()
    await screen.findByText('EXB-000001')
    expect(screen.getByRole('button', { name: 'Reenviar mes 1 de Ana Pérez' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Enviar mes 2' })).toBeDisabled()
  })

  it('PENDING: no resend', async () => {
    backend.subscribers = [withLatest('PENDING')]
    renderPage()
    await screen.findByText('EXB-000001')
    expect(screen.queryByRole('button', { name: /Reenviar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar Ana Pérez' })).toBeEnabled()
  })

  it('archived: no resend, edit and view remain', async () => {
    backend.subscribers = [withLatest('SENT', { is_archived: true, archived_at: '2026-11-10T10:00:00.000Z' })]
    renderPage('/?archive=archived')
    await screen.findByText('EXB-000001')
    expect(screen.queryByRole('button', { name: /Reenviar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar mes 2' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Editar Ana Pérez' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Ver Ana Pérez' })).toBeEnabled()
  })
})

describe('Row actions on narrow screens', () => {
  async function openMenu(user: UserEvent) {
    await screen.findByText('EXB-000001')
    await user.click(screen.getByRole('button', { name: 'Acciones de Ana Pérez' }))
    return screen.findByRole('menu')
  }

  it('collapses into a menu with the same items, all labelled', async () => {
    stubNarrowScreen()
    backend.subscribers = [withLatest('SENT')]
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByRole('button', { name: 'Acciones de Ana Pérez' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar Ana Pérez' })).not.toBeInTheDocument()
    const menu = await openMenu(user)
    expect(within(menu).getByRole('menuitem', { name: 'Enviar mes 2' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Reenviar mes 1 de Ana Pérez' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Editar Ana Pérez' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Ver Ana Pérez' })).toBeInTheDocument()
  })

  it('opens the edit form from the menu', async () => {
    stubNarrowScreen()
    const user = userEvent.setup()
    renderPage()
    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Editar Ana Pérez' }))
    expect(await screen.findByRole('dialog', { name: 'Editar suscriptor' })).toBeInTheDocument()
  })

  it('shows the reason on the disabled send item', async () => {
    stubNarrowScreen()
    backend.subscribers = [withLatest('PENDING')]
    const user = userEvent.setup()
    renderPage()
    const menu = await openMenu(user)
    expect(within(menu).getByRole('menuitem', { name: /Enviar mes 2/ })).toHaveAttribute('aria-disabled', 'true')
    expect(within(menu).getByText('El mes 1 se está enviando')).toBeInTheDocument()
  })
})

describe('Resend from the row', () => {
  it('opens the dialog for the latest delivery and resends exactly that one', async () => {
    backend.subscribers = [
      makeSubscriber({
        email: 'ana-nueva@example.com',
        latest_delivery: { id: 'd2', month: 2, status: 'SENT', send_seq: 1 },
        last_sent_month: 2,
        next_month: 3,
      }),
    ]
    backend.deliveries = {
      s1: [makeDelivery(), makeDelivery({ id: 'd2', month: 2, snapshot_email: 'ana@example.com' })],
    }
    api.post.mockResolvedValue(envelope(makeDelivery({ id: 'd2', month: 2, status: 'PENDING', send_seq: 2 })))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('EXB-000001')
    await user.click(screen.getByRole('button', { name: 'Reenviar mes 2 de Ana Pérez' }))
    const dialog = await screen.findByRole('dialog', { name: 'Reenviar mes 2' })
    expect(within(dialog).getByText(/no le ha llegado o lo ha perdido/)).toBeInTheDocument()
    expect(await within(dialog).findByText('Se enviará a ana-nueva@example.com.')).toBeInTheDocument()
    const confirm = within(dialog).getByRole('button', { name: 'Reenviar mes 2' })
    await waitFor(() => expect(confirm).toBeEnabled())
    await user.click(confirm)
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1/deliveries/d2/resend`)
  })
})

describe('Resend from the row: loading and failures', () => {
  const deliveriesUrl = `${BASE_URL}/subscribers/s1/deliveries`

  function overrideDeliveries(handler: () => Promise<unknown>) {
    const base = api.get.getMockImplementation()
    api.get.mockImplementation(async (url: string, options?: unknown) =>
      url === deliveriesUrl ? handler() : (base as (u: string, o?: unknown) => Promise<unknown>)(url, options),
    )
  }

  async function clickResend(user: UserEvent) {
    await screen.findByText('EXB-000001')
    await user.click(screen.getByRole('button', { name: 'Reenviar mes 1 de Ana Pérez' }))
    return screen.findByRole('dialog', { name: 'Reenviar mes 1' })
  }

  it('opens immediately with a loading state and a disabled confirm', async () => {
    backend.subscribers = [withLatest('SENT')]
    overrideDeliveries(() => new Promise(() => undefined))
    const user = userEvent.setup()
    renderPage()
    const dialog = await clickResend(user)
    expect(dialog.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Reenviar mes 1' })).toBeDisabled()
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Reenviar mes 1' })).not.toBeInTheDocument())
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows an error with retry; retrying succeeds and allows the resend', async () => {
    backend.subscribers = [withLatest('SENT')]
    backend.deliveries = { s1: [makeDelivery()] }
    api.post.mockResolvedValue(envelope(makeDelivery({ status: 'PENDING', send_seq: 2 })))
    let fail = true
    overrideDeliveries(async () => {
      if (fail) throw axiosError(404, { message: 'boom' })
      return envelope(backend.deliveries.s1)
    })
    const user = userEvent.setup()
    renderPage()
    const dialog = await clickResend(user)
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No se ha podido cargar el envío. Inténtalo de nuevo.')
    expect(within(dialog).queryByRole('button', { name: 'Reenviar mes 1' })).not.toBeInTheDocument()
    fail = false
    await user.click(within(dialog).getByRole('button', { name: 'Reintentar' }))
    const confirm = await screen.findByRole('button', { name: 'Reenviar mes 1' })
    await waitFor(() => expect(confirm).toBeEnabled())
    await user.click(confirm)
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1/deliveries/d1/resend`))
  })

  it('shows the error state when the latest delivery is not in the list, and Cerrar closes', async () => {
    backend.subscribers = [withLatest('SENT')]
    backend.deliveries = { s1: [makeDelivery({ id: 'other', month: 7 })] }
    const user = userEvent.setup()
    renderPage()
    const dialog = await clickResend(user)
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No se ha podido cargar el envío')
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Reenviar mes 1' })).not.toBeInTheDocument())
  })
})

describe('Resend from the row: fresh data and focus', () => {
  const subscriberUrl = `${BASE_URL}/subscribers/s1`

  function override(url: string, handler: () => unknown) {
    const base = api.get.getMockImplementation() as (u: string, o?: unknown) => Promise<unknown>
    api.get.mockImplementation(async (u: string, options?: unknown) => (u === url ? handler() : base(u, options)))
  }

  async function openRowResend(user: UserEvent) {
    await screen.findByText('EXB-000001')
    await user.click(screen.getByRole('button', { name: 'Reenviar mes 1 de Ana Pérez' }))
    return screen.findByRole('dialog', { name: 'Reenviar mes 1' })
  }

  it('blocks a stale SENT row whose fresh delivery is PENDING: no confirm, no POST', async () => {
    backend.subscribers = [withLatest('SENT')]
    backend.deliveries = { s1: [makeDelivery({ status: 'PENDING', send_seq: 2 })] }
    const user = userEvent.setup()
    renderPage()
    const dialog = await openRowResend(user)
    expect((await within(dialog).findAllByText('Este envío ya está en curso.')).length).toBeGreaterThan(0)
    expect(within(dialog).queryByRole('button', { name: 'Reenviar mes 1' })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(api.post).not.toHaveBeenCalled()
  })

  it('blocks when the fresh subscriber is archived although the row is not', async () => {
    backend.subscribers = [withLatest('SENT')]
    backend.deliveries = { s1: [makeDelivery()] }
    override(subscriberUrl, () =>
      envelope(withLatest('SENT', { is_archived: true, archived_at: '2026-11-10T10:00:00.000Z' })),
    )
    const user = userEvent.setup()
    renderPage()
    const dialog = await openRowResend(user)
    expect((await within(dialog).findAllByText('El suscriptor está archivado.')).length).toBeGreaterThan(0)
    expect(within(dialog).queryByRole('button', { name: 'Reenviar mes 1' })).not.toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('sends one POST when the confirm is pressed twice', async () => {
    backend.subscribers = [withLatest('SENT')]
    backend.deliveries = { s1: [makeDelivery()] }
    api.post.mockImplementation(() => new Promise(() => undefined))
    const user = userEvent.setup()
    renderPage()
    const dialog = await openRowResend(user)
    const confirm = within(dialog).getByRole('button', { name: 'Reenviar mes 1' })
    await waitFor(() => expect(confirm).toBeEnabled())
    await act(async () => {
      fireEvent.click(confirm)
      fireEvent.click(confirm)
    })
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it('treats a paused (offline) request as the error state with Reintentar', async () => {
    backend.subscribers = [withLatest('SENT')]
    backend.deliveries = { s1: [makeDelivery()] }
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('EXB-000001')
    onlineManager.setOnline(false)
    try {
      await user.click(screen.getByRole('button', { name: 'Reenviar mes 1 de Ana Pérez' }))
      const dialog = await screen.findByRole('dialog', { name: 'Reenviar mes 1' })
      expect(await within(dialog).findByRole('alert')).toHaveTextContent('No se ha podido cargar el envío')
      expect(within(dialog).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    } finally {
      onlineManager.setOnline(true)
    }
  })

  it('returns focus to the row resend button after closing', async () => {
    backend.subscribers = [withLatest('SENT')]
    backend.deliveries = { s1: [makeDelivery()] }
    const user = userEvent.setup()
    renderPage()
    const dialog = await openRowResend(user)
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reenviar mes 1 de Ana Pérez' })).toHaveFocus())
  })

  it('returns focus to the row anchor when the resend button disappears', async () => {
    backend.subscribers = [withLatest('SENT')]
    backend.deliveries = { s1: [makeDelivery()] }
    const user = userEvent.setup()
    renderPage()
    const dialog = await openRowResend(user)
    backend.subscribers = [withLatest('PENDING')]
    api.post.mockResolvedValue(envelope(makeDelivery({ status: 'PENDING', send_seq: 2 })))
    const confirm = within(dialog).getByRole('button', { name: 'Reenviar mes 1' })
    await waitFor(() => expect(confirm).toBeEnabled())
    await user.click(confirm)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.queryByRole('button', { name: /Reenviar mes 1 de/ })).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Editar Ana Pérez' })).toHaveFocus())
  })
})

describe('Narrow menu actions fire', () => {
  async function openMenu(user: UserEvent) {
    await screen.findByText('EXB-000001')
    await user.click(screen.getByRole('button', { name: 'Acciones de Ana Pérez' }))
    return screen.findByRole('menu')
  }

  it('Reenviar from the menu opens the resend dialog and focus returns to the menu trigger', async () => {
    stubNarrowScreen()
    backend.subscribers = [withLatest('SENT')]
    backend.deliveries = { s1: [makeDelivery()] }
    const user = userEvent.setup()
    renderPage()
    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Reenviar mes 1 de Ana Pérez' }))
    const dialog = await screen.findByRole('dialog', { name: 'Reenviar mes 1' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Acciones de Ana Pérez' })).toHaveFocus())
  })

  it('Enviar from the menu opens the send dialog', async () => {
    stubNarrowScreen()
    const user = userEvent.setup()
    renderPage()
    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Enviar mes 1' }))
    expect(await screen.findByRole('dialog', { name: 'Enviar mes 1' })).toBeInTheDocument()
  })

  it('a disabled Enviar item does not open anything', async () => {
    stubNarrowScreen()
    backend.subscribers = [withLatest('PENDING')]
    const user = userEvent.setup()
    renderPage()
    const menu = await openMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: /Enviar mes 2/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })
})

describe('Edit days from the row', () => {
  async function openEdit(user: UserEvent) {
    await screen.findByText('EXB-000001')
    await user.click(screen.getByRole('button', { name: 'Editar Ana Pérez' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar suscriptor' })
    await waitFor(() => expect(within(dialog).getByRole('combobox', { name: 'Objetivo' })).toBeEnabled())
    return dialog
  }

  it('preselects the current days and offers every valid day for the goal', async () => {
    const user = userEvent.setup()
    renderPage()
    const dialog = await openEdit(user)
    const days = within(dialog).getByRole('combobox', { name: 'Días de entrenamiento por semana' })
    expect(days).toBeEnabled()
    expect(days).toHaveTextContent('3 días')
    await user.click(days)
    expect(await screen.findByRole('option', { name: '3 días' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '4 días' })).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('sends only days_per_week and shows the note when deliveries exist', async () => {
    backend.subscribers = [withLatest('SENT')]
    api.patch.mockResolvedValue(envelope(makeSubscriber({ days_per_week: 4 })))
    const user = userEvent.setup()
    renderPage()
    const dialog = await openEdit(user)
    expect(within(dialog).queryByText(DAYS_NOTE)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('combobox', { name: 'Días de entrenamiento por semana' }))
    await user.click(await screen.findByRole('option', { name: '4 días' }))
    expect(within(dialog).getByText(DAYS_NOTE)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    expect(api.patch).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1`, { days_per_week: 4 })
  })

  it('does not show the note when the subscriber has no deliveries', async () => {
    const user = userEvent.setup()
    renderPage()
    const dialog = await openEdit(user)
    await user.click(within(dialog).getByRole('combobox', { name: 'Días de entrenamiento por semana' }))
    await user.click(await screen.findByRole('option', { name: '4 días' }))
    expect(within(dialog).queryByText(DAYS_NOTE)).not.toBeInTheDocument()
  })

  it('hides the note again when the value goes back to the saved one', async () => {
    backend.subscribers = [withLatest('SENT')]
    const user = userEvent.setup()
    renderPage()
    const dialog = await openEdit(user)
    const days = within(dialog).getByRole('combobox', { name: 'Días de entrenamiento por semana' })
    await user.click(days)
    await user.click(await screen.findByRole('option', { name: '4 días' }))
    expect(within(dialog).getByText(DAYS_NOTE)).toBeInTheDocument()
    await user.click(days)
    await user.click(await screen.findByRole('option', { name: '3 días' }))
    expect(within(dialog).queryByText(DAYS_NOTE)).not.toBeInTheDocument()
  })
})

describe('Change route from the detail', () => {
  it('opens the edit form from the Cambiar link next to the route', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('EXB-000001')
    await user.click(screen.getByRole('button', { name: 'Ver Ana Pérez' }))
    const detail = await screen.findByRole('dialog', { name: 'Ana Pérez' })
    expect(await within(detail).findByText('Perder grasa · 3 días/semana')).toBeInTheDocument()
    await user.click(within(detail).getByRole('button', { name: 'Cambiar días por semana' }))
    const form = await screen.findByRole('dialog', { name: 'Editar suscriptor' })
    expect(within(form).getByRole('combobox', { name: 'Días de entrenamiento por semana' })).toHaveTextContent('3 días')
  })
})

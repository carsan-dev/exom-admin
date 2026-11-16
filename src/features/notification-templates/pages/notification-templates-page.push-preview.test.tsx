import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import type { NotificationTemplate } from '../types'
import { NotificationTemplatesPage } from './notification-templates-page'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'super' } })) }
})

const template: NotificationTemplate = {
  key: 'manual-aviso',
  name: 'Aviso puntual',
  description: 'Plantilla manual sintética',
  category: 'General',
  title: 'Título manual',
  body: 'Cuerpo manual',
  route: '/recap',
  enabled: true,
  variables: [],
  variable_help: {},
  delivery_info: { type: 'manual', label: 'Manual', description: 'Se envía desde el historial' },
  customized: false,
  is_system: false,
  updated_at: null,
}

const envelope = (data: unknown) => ({ data: { data } })

beforeEach(() => {
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset(); api.patch.mockReset(); api.delete.mockReset()
  useAuth.setState({ user: { id: 'super', email: 'super@example.invalid', role: 'SUPER_ADMIN', profile: null } })
  api.get.mockResolvedValue(envelope([template]))
  api.patch.mockResolvedValue(envelope(template))
})

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <NotificationTemplatesPage />
    </QueryClientProvider>,
  )
}

describe('NotificationTemplatesPage push preview and counters (P9)', () => {
  it('shows the current title and body in the push-style preview and keeps the route line', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')

    const preview = screen.getByTestId('push-preview')
    expect(within(preview).getByText('Título manual')).toBeInTheDocument()
    expect(within(preview).getByText('Cuerpo manual')).toBeInTheDocument()
    expect(screen.getByText('/recap')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Título'))
    await user.type(screen.getByLabelText('Título'), 'Nuevo título')
    await user.clear(screen.getByLabelText('Cuerpo'))
    await user.type(screen.getByLabelText('Cuerpo'), 'Nuevo cuerpo')

    expect(within(preview).getByText('Nuevo título')).toBeInTheDocument()
    expect(within(preview).getByText('Nuevo cuerpo')).toBeInTheDocument()
  })

  it('uses the template fallbacks when title or body are empty', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')

    await user.clear(screen.getByLabelText('Título'))
    await user.clear(screen.getByLabelText('Cuerpo'))

    const preview = screen.getByTestId('push-preview')
    expect(within(preview).getByText('Sin título')).toBeInTheDocument()
    expect(within(preview).getByText('Sin cuerpo')).toBeInTheDocument()
  })

  it('updates the title n/120 and body n/500 counters while typing', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')

    expect(screen.getByTestId('counter-título')).toHaveTextContent('13/120')
    expect(screen.getByTestId('counter-cuerpo')).toHaveTextContent('13/500 caracteres')

    await user.type(screen.getByLabelText('Título'), 'abc')
    await user.type(screen.getByLabelText('Cuerpo'), 'xy')

    expect(screen.getByTestId('counter-título')).toHaveTextContent('16/120')
    expect(screen.getByTestId('counter-cuerpo')).toHaveTextContent('15/500 caracteres')
  })

  it('announces when the title nears its limit', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')

    await user.clear(screen.getByLabelText('Título'))
    await user.click(screen.getByLabelText('Título'))
    await user.paste('a'.repeat(110))

    expect(screen.getByTestId('counter-título')).toHaveTextContent('110/120')
    expect(screen.getByTestId('counter-status-título')).toHaveTextContent('Quedan 10 caracteres')
  })

  it('still saves the same trimmed payload; counters and preview do not change what is sent', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')

    await user.clear(screen.getByLabelText('Título'))
    await user.type(screen.getByLabelText('Título'), '  Nuevo título  ')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    expect(api.patch).toHaveBeenCalledWith('/notifications/templates/manual-aviso', {
      title: 'Nuevo título',
      body: 'Cuerpo manual',
      route: '/recap',
      enabled: true,
    })
  })
})

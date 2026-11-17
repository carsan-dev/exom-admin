import { render, screen, waitFor } from '@testing-library/react'
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

const manualTemplate: NotificationTemplate = {
  key: 'manual-aviso',
  name: 'Aviso "puntual"',
  description: 'Plantilla manual sintética',
  category: 'General',
  title: 'Título manual',
  body: 'Cuerpo manual',
  route: null,
  enabled: true,
  variables: [],
  variable_help: {},
  delivery_info: { type: 'manual', label: 'Manual', description: 'Se envía desde el historial' },
  customized: false,
  is_system: false,
  updated_at: null,
}

const systemTemplate: NotificationTemplate = {
  ...manualTemplate,
  key: 'system-recordatorio',
  name: 'Recordatorio',
  description: 'Plantilla automática sintética',
  title: 'Título editado',
  body: 'Cuerpo editado',
  delivery_info: { type: 'event', label: 'Evento', description: 'Al ocurrir un evento' },
  customized: true,
  is_system: true,
}

const DELETE_QUESTION = '¿Eliminar la plantilla manual "Aviso "puntual""?'
const RESTORE_QUESTION = '¿Restaurar "Recordatorio" a su texto por defecto?'

const envelope = (data: unknown) => ({ data: { data } })

beforeEach(() => {
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset(); api.patch.mockReset(); api.delete.mockReset()
  useAuth.setState({ user: { id: 'super', email: 'super@example.invalid', role: 'SUPER_ADMIN', profile: null } })
  api.get.mockResolvedValue(envelope([manualTemplate, systemTemplate]))
})

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <NotificationTemplatesPage />
    </QueryClientProvider>,
  )
}

describe('NotificationTemplatesPage reset/delete confirmation', () => {
  it('deletes a manual template only after accepting the exact, destructive question', async () => {
    api.delete.mockResolvedValue(envelope({ key: manualTemplate.key, deleted: true }))
    const user = userEvent.setup()
    mount()

    await user.click(await screen.findByRole('button', { name: 'Eliminar plantilla' }))
    expect(screen.getByRole('alertdialog', { name: DELETE_QUESTION })).toBeInTheDocument()
    const confirmButton = screen.getByRole('button', { name: 'Eliminar' })
    expect(confirmButton).toHaveClass('bg-destructive')
    expect(api.delete).not.toHaveBeenCalled()

    await user.click(confirmButton)

    await waitFor(() => expect(api.delete).toHaveBeenCalledTimes(1))
    expect(api.delete).toHaveBeenCalledWith('/notifications/templates/manual-aviso')
  })

  it('cancelling the deletion calls nothing', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(await screen.findByRole('button', { name: 'Eliminar plantilla' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.delete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Eliminar plantilla' })).toBeInTheDocument()
  })

  it('restores a system template only after accepting the exact question', async () => {
    api.delete.mockResolvedValue(envelope({ ...systemTemplate, customized: false }))
    const user = userEvent.setup()
    mount()

    await user.click(await screen.findByRole('button', { name: /Recordatorio/ }))
    await user.click(await screen.findByRole('button', { name: 'Restaurar defecto' }))
    expect(screen.getByRole('alertdialog', { name: RESTORE_QUESTION })).toBeInTheDocument()
    const confirmButton = screen.getByRole('button', { name: 'Aceptar' })
    expect(confirmButton).not.toHaveClass('bg-destructive')

    await user.click(confirmButton)

    await waitFor(() => expect(api.delete).toHaveBeenCalledTimes(1))
    expect(api.delete).toHaveBeenCalledWith('/notifications/templates/system-recordatorio')
  })

  it('cancelling the restore with Escape calls nothing', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(await screen.findByRole('button', { name: /Recordatorio/ }))
    await user.click(await screen.findByRole('button', { name: 'Restaurar defecto' }))
    expect(screen.getByRole('alertdialog', { name: RESTORE_QUESTION })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('a second trigger while the question is open does not start a second deletion', async () => {
    api.delete.mockResolvedValue(envelope({ key: manualTemplate.key, deleted: true }))
    const user = userEvent.setup()
    mount()

    const trigger = await screen.findByRole('button', { name: 'Eliminar plantilla' })
    await user.click(trigger)
    trigger.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(api.delete).toHaveBeenCalledTimes(1)
  })
})

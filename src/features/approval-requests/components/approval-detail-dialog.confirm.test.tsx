import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import type { SuperAdminApprovalRequestDetail } from '../types'
import { ApprovalDetailDialog } from './approval-detail-dialog'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'super' } })) }
})

const QUESTION = '¿Seguro que quieres ejecutar esta acción aprobada?'

const request: SuperAdminApprovalRequestDetail = {
  id: 'req-1',
  requester_id: 'admin-1',
  reviewer_id: null,
  action_type: 'training.update',
  resource_type: 'training',
  resource_id: 'training-1',
  request_reason: null,
  status: 'PENDING',
  rejection_reason: null,
  failure_reason: null,
  resolved_at: null,
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  requester: { id: 'admin-1', email: 'admin@example.invalid', profile: { first_name: 'Ada', last_name: 'Admin' } },
  reviewer: null,
  resource_name: 'Entreno sintético',
  resource_deleted: false,
  payload: { name: 'Nuevo nombre' },
  current_resource: { name: 'Nombre actual' },
}

const envelope = (data: unknown) => ({ data: { data } })

beforeEach(() => {
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset(); api.delete.mockReset()
  useAuth.setState({ user: { id: 'super', email: 'super@example.invalid', role: 'SUPER_ADMIN', profile: null } })
  api.get.mockResolvedValue(envelope(request))
  api.put.mockResolvedValue(envelope({ ...request, status: 'APPROVED' }))
})

function mount() {
  const onOpenChange = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ApprovalDetailDialog requestId="req-1" open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  )
  return { onOpenChange }
}

async function openConfirmation(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Aprobar y ejecutar' }))
  return screen.getByRole('alertdialog', { name: QUESTION })
}

describe('ApprovalDetailDialog approval confirmation', () => {
  it('shows the exact question and resolves only after acceptance', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = mount()

    await openConfirmation(user)
    expect(api.put).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Aceptar' }))

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
    expect(api.put).toHaveBeenCalledWith('/approval-requests/req-1/resolve', { action: 'approve' })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('does nothing when cancelled and keeps the detail dialog open', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = mount()

    await openConfirmation(user)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.put).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Detalle de solicitud' })).toBeInTheDocument()
  })

  it('Escape closes only the confirmation and does nothing', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = mount()

    await openConfirmation(user)
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.put).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Detalle de solicitud' })).toBeInTheDocument()
  })

  it('a second trigger while the question is open does not start a second flow', async () => {
    const user = userEvent.setup()
    mount()

    await openConfirmation(user)
    const approve = screen.getByRole('button', { name: 'Aprobar y ejecutar', hidden: true })
    act(() => { approve.click() })
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Aceptar' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(api.put).toHaveBeenCalledTimes(1)
  })
})

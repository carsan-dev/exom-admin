import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AchievementUsersDrawer } from './achievement-users-drawer'
import type { AchievementListItem } from '../types'

const get = vi.fn()
const post = vi.fn()
const del = vi.fn()
vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const achievement: AchievementListItem = {
  id: 'ach-1',
  name: 'Racha de hierro',
  description: 'Mantén una racha de 21 días seguidos.',
  icon_url: null,
  criteria_type: 'STREAK_DAYS',
  criteria_value: 21,
  rule_config: null,
  created_at: '',
  unlocked_count: 2,
}

const detail = {
  ...achievement,
  users: {
    data: [
      {
        id: 'row-1',
        user_id: 'user-1',
        unlocked_at: '2026-01-10T10:00:00.000Z',
        user: { id: 'user-1', email: 'ana@example.test', profile: { first_name: 'Ana', last_name: 'Ruiz', avatar_url: null } },
      },
      {
        id: 'row-2',
        user_id: 'user-2',
        unlocked_at: '2026-01-11T10:00:00.000Z',
        user: { id: 'user-2', email: 'luis@example.test', profile: null },
      },
    ],
    total: 2,
    page: 1,
    limit: 8,
    totalPages: 1,
  },
  unlocked_count: 2,
}

function renderDrawer(item: AchievementListItem = achievement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AchievementUsersDrawer achievement={item} open onOpenChange={() => undefined} />
    </QueryClientProvider>,
  )
}

async function openedDrawer(item?: AchievementListItem) {
  renderDrawer(item)
  await screen.findByText('Ana Ruiz')
  return userEvent.setup()
}

describe('AchievementUsersDrawer confirmations', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    del.mockReset()
    get.mockImplementation(async () => ({ data: { data: detail } }))
    post.mockResolvedValue({ data: { data: { granted: 1, revoked: 0 } } })
    del.mockResolvedValue({ data: { data: { message: 'ok' } } })
  })

  it('asks before revoking and does not call the API on cancel, Escape or close', async () => {
    const user = await openedDrawer()
    const revokeButtons = screen.getAllByRole('button', { name: 'Revocar' })

    await user.click(revokeButtons[0])
    let dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('¿Revocar el logro «Racha de hierro» a Ana Ruiz?')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    await user.click(screen.getAllByRole('button', { name: 'Revocar' })[0])
    dialog = await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    expect(del).not.toHaveBeenCalled()
  })

  it('revokes once with the same arguments after confirming', async () => {
    const user = await openedDrawer()

    await user.click(screen.getAllByRole('button', { name: 'Revocar' })[1])
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('¿Revocar el logro «Racha de hierro» a luis@example.test?')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Revocar' }))

    await waitFor(() => expect(del).toHaveBeenCalledTimes(1))
    expect(del).toHaveBeenCalledWith('/achievements/ach-1/revoke', { data: { user_id: 'user-2' } })
  })

  it('asks before recomputing visible clients and only calls the API after confirming', async () => {
    const user = await openedDrawer()

    await user.click(screen.getByRole('button', { name: 'Recalcular visibles' }))
    let dialog = await screen.findByRole('alertdialog')
    expect(
      within(dialog).getByText('¿Recalcular el logro «Racha de hierro» para toda la cartera visible?'),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(post).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Recalcular visibles' }))
    dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Recalcular' }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post).toHaveBeenCalledWith('/achievements/recompute', {
      achievement_ids: ['ach-1'],
      apply_to_all_visible_clients: true,
    })
  })

  it('asks before recomputing the selection and only calls the API after confirming', async () => {
    const user = await openedDrawer()

    await user.click(screen.getAllByRole('button', { name: 'Seleccionar' })[0])
    await user.click(screen.getAllByRole('button', { name: 'Seleccionar' })[0])
    await user.click(screen.getByRole('button', { name: 'Recalcular selección (2)' }))
    let dialog = await screen.findByRole('alertdialog')
    expect(
      within(dialog).getByText('¿Recalcular el logro «Racha de hierro» para 2 clientes seleccionados?'),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(post).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Recalcular selección (2)' }))
    dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Recalcular' }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post).toHaveBeenCalledWith('/achievements/recompute', {
      achievement_ids: ['ach-1'],
      user_ids: ['user-1', 'user-2'],
    })
  })
})

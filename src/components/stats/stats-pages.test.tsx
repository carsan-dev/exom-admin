import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'
import { resolvePeriod, todayUtc } from '@/components/period'
import { FeedbackPage } from '@/features/feedback/pages/feedback-page'
import { RecapsPage } from '@/features/recaps/pages/recaps-page'
import { NotificationsPage } from '@/features/notifications/pages/notifications-page'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'staff' } })) }
})
vi.mock('@/components/period', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/period')>()),
  PeriodSelector: ({ onChange }: { onChange: (p: '7d' | 'all') => void }) => (
    <div>
      <button onClick={() => onChange('all')}>set-all</button>
      <button onClick={() => onChange('7d')}>set-7d</button>
    </div>
  ),
}))
vi.mock('@/features/feedback/components/feedback-filters', () => ({ FeedbackFilters: () => null }))
vi.mock('@/features/feedback/components/feedback-list', () => ({ FeedbackList: () => null }))
vi.mock('@/features/feedback/components/feedback-detail-dialog', () => ({ FeedbackDetailDialog: () => null }))
vi.mock('@/features/recaps/components/recaps-filters', () => ({ RecapsFilters: () => null }))
vi.mock('@/features/recaps/components/recaps-list', () => ({ RecapsList: () => null }))
vi.mock('@/features/notifications/components/notifications-filters', () => ({ NotificationsFilters: () => null }))
vi.mock('@/features/notifications/components/notifications-list', () => ({ NotificationsList: () => null }))
vi.mock('@/features/notifications/components/send-notification-dialog', () => ({ SendNotificationDialog: () => null }))

const statsBody = {
  total: 5, pending: 2, reviewed: 3, submitted: 2, archived: 1, today: 1, failed: 0,
  avg_review_seconds: 5 * 3600 + 12 * 60, reviewed_in_period: 1,
}
beforeEach(() => {
  window.localStorage.clear()
  api.get.mockReset()
  api.get.mockResolvedValue({ data: { data: statsBody } })
})

function Probe() {
  const { search } = useLocation()
  return <output data-testid="search">{search}</output>
}
function renderAt(url: string, page: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        {page}
        <Probe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const statsCalls = (path: string) => api.get.mock.calls.filter(([p]) => p === path)
const last = (path: string) => statsCalls(path).slice(-1)[0]?.[1] as { params: Record<string, string> }

const cases = [
  { name: 'feedback', path: '/feedback/stats', page: <FeedbackPage />, idQuery: 'clientId', idParam: 'client_id' },
  { name: 'recaps', path: '/recaps/stats', page: <RecapsPage />, idQuery: 'clientId', idParam: 'client_id' },
  { name: 'notifications', path: '/notifications/stats', page: <NotificationsPage />, idQuery: 'recipientId', idParam: 'recipient_id' },
]

for (const c of cases) {
  it(`${c.name}: sends the default 30d UTC range and no id when unfiltered`, async () => {
    renderAt(`/x`, c.page)
    const expected = resolvePeriod('30d', {}, todayUtc())
    await waitFor(() => expect(statsCalls(c.path)).toHaveLength(1))
    expect(last(c.path).params).toEqual({ from: expected.from, to: expected.to })
    expect(screen.getByText(/Resumen · Últimos 30 días/)).toBeTruthy()
  })

  it(`${c.name}: forwards the list filter and keeps list params when the period changes`, async () => {
    renderAt(`/x?${c.idQuery}=abc&status=${c.name === 'notifications' ? 'SENT' : 'REVIEWED'}&page=3`, c.page)
    await waitFor(() => expect(statsCalls(c.path)).toHaveLength(1))
    expect(last(c.path).params[c.idParam]).toBe('abc')
    fireEvent.click(screen.getByText('set-all'))
    await waitFor(() => expect(last(c.path).params.from).toBeUndefined())
    expect(last(c.path).params[c.idParam]).toBe('abc')
    const search = new URLSearchParams(screen.getByTestId('search').textContent ?? '')
    expect(search.get('stats_period')).toBe('all')
    expect(search.get(c.idQuery)).toBe('abc')
    expect(search.get('page')).toBe('3')
    expect(search.get('status')).not.toBeNull()
  })
}

it('feedback and recaps show the average review time card, with a dash for null', async () => {
  renderAt('/x', <RecapsPage />)
  expect(await screen.findByText('5 h 12 min')).toBeTruthy()
  expect(screen.getByText('1 revisión en el periodo')).toBeTruthy()
})

it('shows a dash, never 0, when there are no reviews', async () => {
  api.get.mockResolvedValue({ data: { data: { ...statsBody, avg_review_seconds: null, reviewed_in_period: 0 } } })
  renderAt('/x', <FeedbackPage />)
  expect(await screen.findByText('—')).toBeTruthy()
  expect(screen.getByText('0 revisiones en el periodo')).toBeTruthy()
})

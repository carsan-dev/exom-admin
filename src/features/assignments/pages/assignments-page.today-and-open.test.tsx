import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { AssignmentsPage } from './assignments-page'

// RDS-F4-09 (P5): "Hoy" button, non-chromatic mark of the current day and
// double click / Enter on a day to open the editor for that day.

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

const envelope = (data: unknown) => ({ data: { data } })

const clients = [
  { id: 'c-1', email: 'ana@example.test', profile: { first_name: 'Ana', last_name: 'García', avatar_url: null } },
]

function training(date: string) {
  return {
    id: `t-${date}`,
    name: `Entreno ${date}`,
    type: 'FUERZA',
    level: 'PRINCIPIANTE',
    estimated_duration_min: 45,
    estimated_calories: 300,
    is_active: true,
    types: ['FUERZA'],
    accentColor: null,
    exercises_count: 4,
  }
}

function buildDays(dates: string[]) {
  return dates.map((date) => ({
    id: `a-${date}`,
    client_id: 'c-1',
    date,
    is_rest_day: false,
    training: training(date),
    trainings: [training(date)],
    training_ids: [`t-${date}`],
    diet: null,
  }))
}

function datesFrom(start: string, count: number) {
  const first = new Date(`${start}T00:00:00Z`)
  return Array.from({ length: count }, (_, index) => {
    const next = new Date(first)
    next.setUTCDate(first.getUTCDate() + index)
    return next.toISOString().slice(0, 10)
  })
}

// Monday 2026-03-02 .. Sunday 2026-03-08 (today = Wednesday 2026-03-04).
const weekOfToday = datesFrom('2026-03-02', 7)
const marchDates = datesFrom('2026-03-01', 31)
const aprilDates = datesFrom('2026-04-01', 30)

function mockApi() {
  api.get.mockImplementation((url: string, config?: { params?: Record<string, string | number> }) => {
    if (url === '/assignments/client-options') return Promise.resolve(envelope(clients))
    if (url === '/assignments/week') {
      const weekStart = String(config?.params?.week_start ?? '2026-03-02')
      const dates = datesFrom(weekStart, 7)
      return Promise.resolve(
        envelope({ client_id: 'c-1', week_start: dates[0], week_end: dates[6], days: buildDays(dates) }),
      )
    }
    if (url === '/assignments/month') {
      const april = Number(config?.params?.month) === 4
      const dates = april ? aprilDates : marchDates
      return Promise.resolve(
        envelope({
          client_id: 'c-1',
          year: 2026,
          month: april ? 4 : 3,
          month_start: dates[0],
          month_end: dates[dates.length - 1],
          days: buildDays(dates),
        }),
      )
    }
    if (url === '/assignments/catalog-options') return Promise.resolve(envelope({ trainings: [], diets: [] }))
    if (url === '/assignments/auto-rules/active') return Promise.resolve(envelope(null))
    if (url === '/assignments/clients/c-1/rir-cycle') {
      return Promise.resolve(envelope({ revision: 1, versions: [], dates: [] }))
    }
    return Promise.resolve(envelope([]))
  })
}

function Location() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderPage(entry: string) {
  mockApi()
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={[entry]}>
        <TooltipProvider>
          <AssignmentsPage />
        </TooltipProvider>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const dayButton = (date: string) => screen.findByRole('button', { name: new RegExp(`Entreno ${date}`) })

// Distinct yyyy-MM-dd values the editor shows as text: exactly the days it is editing.
function datesShownIn(dialog: HTMLElement) {
  const found = within(dialog).queryAllByText(/^\d{4}-\d{2}-\d{2}$/)
  return [...new Set(found.map((node) => node.textContent))]
}

function searchParams() {
  return new URLSearchParams(screen.getByTestId('location').textContent?.split('?')[1] ?? '')
}

describe('AssignmentsPage today button, current-day mark and direct editing', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset()
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-04T10:00:00Z'))
    useAuth.setState({
      user: { id: 'u1', email: 'admin@example.test', role: 'ADMIN', profile: null },
    } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Hoy button', () => {
    it('writes today into the date param and keeps clientId and view in week view', async () => {
      renderPage('/assignments?clientId=c-1&view=week&date=2026-03-23')
      await dayButton('2026-03-23')
      await userEvent.click(screen.getByRole('button', { name: 'Hoy' }))

      await waitFor(() => expect(searchParams().get('date')).toBe('2026-03-04'))
      expect(searchParams().get('clientId')).toBe('c-1')
      expect(searchParams().get('view')).toBe('week')
      await dayButton('2026-03-04')
    })

    it('writes today into the date param and keeps clientId and view in month view', async () => {
      renderPage('/assignments?clientId=c-1&view=month&date=2026-04-15')
      await dayButton('2026-04-15')
      await userEvent.click(screen.getByRole('button', { name: 'Hoy' }))

      await waitFor(() => expect(searchParams().get('date')).toBe('2026-03-04'))
      expect(searchParams().get('clientId')).toBe('c-1')
      expect(searchParams().get('view')).toBe('month')
      await dayButton('2026-03-31')
    })

    it('uses the same date format as Anterior and Siguiente', async () => {
      renderPage('/assignments?clientId=c-1&view=week&date=2026-03-04')
      await dayButton('2026-03-04')
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
      await waitFor(() => expect(searchParams().get('date')).toBe('2026-03-11'))
      await userEvent.click(screen.getByRole('button', { name: 'Hoy' }))
      await waitFor(() => expect(searchParams().get('date')).toBe('2026-03-04'))
    })

    it('is disabled while no client is selected', async () => {
      renderPage('/assignments?view=week&date=2026-03-04')
      await screen.findByText('Selecciona un cliente para empezar')
      expect(screen.getByRole('button', { name: 'Hoy' })).toBeDisabled()
    })
  })

  describe('current day mark', () => {
    it('marks only today in the week view with aria-current and a visible Hoy label', async () => {
      renderPage('/assignments?clientId=c-1&view=week&date=2026-03-02')
      for (const date of weekOfToday) await dayButton(date)

      const current = document.querySelectorAll('[aria-current="date"]')
      expect(current).toHaveLength(1)
      const today = await dayButton('2026-03-04')
      expect(today).toHaveAttribute('aria-current', 'date')
      expect(within(today).getByText('Hoy')).toBeVisible()
      expect(within(await dayButton('2026-03-05')).queryByText('Hoy')).toBeNull()
    })

    it('marks only today in the month view with aria-current and a visible Hoy label', async () => {
      renderPage('/assignments?clientId=c-1&view=month&date=2026-03-20')
      await dayButton('2026-03-31')

      expect(document.querySelectorAll('[aria-current="date"]')).toHaveLength(1)
      const today = await dayButton('2026-03-04')
      expect(today).toHaveAttribute('aria-current', 'date')
      expect(within(today).getByText('Hoy')).toBeVisible()
    })

    it('does not mark any day when today is outside the visible period', async () => {
      renderPage('/assignments?clientId=c-1&view=week&date=2026-03-23')
      await dayButton('2026-03-23')
      expect(document.querySelectorAll('[aria-current]')).toHaveLength(0)
      expect(screen.queryByText('Hoy', { selector: 'span' })).toBeNull()
    })

    it('does not mark any day in a month that does not contain today', async () => {
      renderPage('/assignments?clientId=c-1&view=month&date=2026-04-15')
      await dayButton('2026-04-15')
      expect(document.querySelectorAll('[aria-current]')).toHaveLength(0)
    })
  })

  describe('direct editing of a day', () => {
    it('keeps the single click as a multiple selection toggle and does not open the editor', async () => {
      renderPage('/assignments?clientId=c-1&view=week&date=2026-03-04')
      const user = userEvent.setup()
      await user.click(await dayButton('2026-03-03'))
      await user.click(await dayButton('2026-03-05'))

      await screen.findByText('2 seleccionados')
      expect(await dayButton('2026-03-03')).toHaveAttribute('aria-pressed', 'true')
      expect(await dayButton('2026-03-05')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('opens the editor for exactly that day on double click in week view', async () => {
      renderPage('/assignments?clientId=c-1&view=week&date=2026-03-04')
      const user = userEvent.setup()
      await user.dblClick(await dayButton('2026-03-06'))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('Editar día')).toBeInTheDocument()
      expect(datesShownIn(dialog)).toEqual(['2026-03-06'])
    })

    it('opens the editor for that day on double click in month view, replacing a prior selection', async () => {
      renderPage('/assignments?clientId=c-1&view=month&date=2026-03-04')
      const user = userEvent.setup()
      await user.click(await dayButton('2026-03-10'))
      await user.dblClick(await dayButton('2026-03-12'))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('Editar día')).toBeInTheDocument()
      expect(datesShownIn(dialog)).toEqual(['2026-03-12'])
    })

    it('opens the editor for that day on Enter without toggling the selection', async () => {
      renderPage('/assignments?clientId=c-1&view=week&date=2026-03-04')
      const user = userEvent.setup()
      const button = await dayButton('2026-03-05')
      button.focus()
      await user.keyboard('{Enter}')

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('Editar día')).toBeInTheDocument()
      expect(datesShownIn(dialog)).toEqual(['2026-03-05'])
    })

    it('keeps Space as the keyboard way to select a day', async () => {
      renderPage('/assignments?clientId=c-1&view=week&date=2026-03-04')
      const user = userEvent.setup()
      const button = await dayButton('2026-03-05')
      button.focus()
      await user.keyboard(' ')

      await screen.findByText('1 seleccionados')
      expect(button).toHaveAttribute('aria-pressed', 'true')
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('offers a visible hint describing the day gestures and links it to the day buttons', async () => {
      renderPage('/assignments?clientId=c-1&view=week&date=2026-03-04')
      const hint = await screen.findByText(/doble clic o Intro/i)
      expect(hint).toBeVisible()
      const button = await dayButton('2026-03-05')
      expect(button.getAttribute('aria-describedby')).toBe(hint.id)
    })
  })
})

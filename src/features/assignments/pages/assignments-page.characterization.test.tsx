import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AssignmentsPage } from './assignments-page'

// Characterization of the Assignments page DOM (toolbar, week and month calendars,
// empty/error/loading states and the dialogs opened from it). The snapshots were
// recorded before extracting the view into components and must not change afterwards.

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

type Mode = 'data' | 'empty-week' | 'loading-clients' | 'error-clients' | 'no-clients' | 'error-week'

const envelope = (data: unknown) => ({ data: { data } })

const clients = [
  {
    id: 'c-1',
    email: 'ana@example.test',
    profile: { first_name: 'Ana', last_name: 'García', avatar_url: null },
  },
  {
    id: 'c-2',
    email: 'luis@example.test',
    profile: { first_name: 'Luis', last_name: 'Pérez', avatar_url: null },
  },
]

const trainingOption = (id: string, name: string) => ({
  id,
  name,
  type: 'FUERZA',
  level: 'PRINCIPIANTE',
  estimated_duration_min: 45,
  estimated_calories: 300,
  is_active: true,
  types: ['FUERZA'],
  accentColor: null,
  exercises_count: 4,
})
const dietOption = (id: string, name: string) => ({
  id,
  name,
  total_calories: 2000,
  total_protein_g: 150,
  total_carbs_g: 200,
  total_fat_g: 60,
  tags: [],
  meals_count: 4,
})

const catalogs = {
  trainings: [trainingOption('t-1', 'Fuerza A'), trainingOption('t-2', 'Cardio B')],
  diets: [dietOption('d-1', 'Definición 2000')],
}

function buildDays(dates: string[], planned: boolean) {
  return dates.map((date, index) => {
    const base = {
      id: null as string | null,
      client_id: 'c-1',
      date,
      is_rest_day: false,
      training: null as unknown,
      trainings: [] as unknown[],
      training_ids: [] as string[],
      diet: null as unknown,
    }
    if (!planned) return base
    if (index === 0) {
      return {
        ...base,
        id: `a-${index}`,
        training: trainingOption('t-1', 'Fuerza A'),
        trainings: [trainingOption('t-1', 'Fuerza A')],
        training_ids: ['t-1'],
        diet: dietOption('d-1', 'Definición 2000'),
      }
    }
    if (index === 1) {
      return {
        ...base,
        id: `a-${index}`,
        training: trainingOption('t-2', 'Cardio B'),
        trainings: [trainingOption('t-2', 'Cardio B')],
        training_ids: ['t-2'],
      }
    }
    if (index === 2) return { ...base, id: `a-${index}`, is_rest_day: true }
    return base
  })
}

const weekDates = [
  '2026-03-02',
  '2026-03-03',
  '2026-03-04',
  '2026-03-05',
  '2026-03-06',
  '2026-03-07',
  '2026-03-08',
]
const monthDates = Array.from({ length: 31 }, (_, index) =>
  `2026-03-${String(index + 1).padStart(2, '0')}`
)

const autoRule = {
  id: 'rule-1',
  client_id: 'c-1',
  admin_id: null,
  source_week_start: '2026-03-02',
  starts_on: '2026-03-09',
  ends_on: null,
  is_active: true,
  deactivated_at: null,
  days: [
    {
      id: 'rd-1',
      weekday: 1,
      training_id: 't-1',
      training_ids: ['t-1'],
      diet_id: null,
      is_rest_day: false,
      training: trainingOption('t-1', 'Fuerza A'),
      trainings: [trainingOption('t-1', 'Fuerza A')],
      diet: null,
    },
  ],
}

interface Setup {
  mode?: Mode
  withRule?: boolean
}

function mockApi({ mode = 'data', withRule = true }: Setup = {}) {
  api.get.mockImplementation((url: string) => {
    const notFound = () =>
      Promise.reject(Object.assign(new AxiosError('boom'), { response: { status: 404 } }))
    if (url === '/assignments/client-options') {
      if (mode === 'loading-clients') return new Promise(() => undefined)
      if (mode === 'error-clients') return notFound()
      if (mode === 'no-clients') return Promise.resolve(envelope([]))
      return Promise.resolve(envelope(clients))
    }
    if (url === '/assignments/week') {
      if (mode === 'error-week') return notFound()
      return Promise.resolve(
        envelope({
          client_id: 'c-1',
          week_start: '2026-03-02',
          week_end: '2026-03-08',
          days: buildDays(weekDates, mode !== 'empty-week'),
        })
      )
    }
    if (url === '/assignments/month') {
      return Promise.resolve(
        envelope({
          client_id: 'c-1',
          year: 2026,
          month: 3,
          month_start: '2026-03-01',
          month_end: '2026-03-31',
          days: buildDays(monthDates, mode !== 'empty-week'),
        })
      )
    }
    if (url === '/assignments/catalog-options') return Promise.resolve(envelope(catalogs))
    if (url === '/assignments/auto-rules/active') {
      return Promise.resolve(envelope(withRule ? autoRule : null))
    }
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

function normalize(html: string) {
  return html
    .replace(/radix-[^"\s]*/g, 'radix-ID')
    .replace(/ style="(animation-duration: 0s;)?"/g, '')
    .replace(/[«:]r[0-9a-z]+[»:]|_r_[0-9a-z]+_/g, 'ID')
    .replace(/></g, '>\n<')
}

function renderPage(entry = '/assignments?clientId=c-1&date=2026-03-04', setup: Setup = {}) {
  mockApi(setup)
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={[entry]}>
        <TooltipProvider>
          <AssignmentsPage />
        </TooltipProvider>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const snap = (container: HTMLElement) => normalize(container.innerHTML)
const snapBody = () => normalize(document.body.innerHTML)

async function selectFirstDay() {
  const user = userEvent.setup()
  const [card] = await screen.findAllByRole('button', { name: /Fuerza A/ })
  await user.click(card)
  await screen.findByText('1 seleccionados')
  return user
}

describe('AssignmentsPage characterization', () => {
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

  it('shows the loading skeleton while the clients load', async () => {
    const { container } = renderPage(undefined, { mode: 'loading-clients' })
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/assignments/client-options'))
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the loading skeleton in month view', async () => {
    const { container } = renderPage('/assignments?view=month&date=2026-03-04', {
      mode: 'loading-clients',
    })
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/assignments/client-options'))
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the clients error card for an admin', async () => {
    const { container } = renderPage(undefined, { mode: 'error-clients' })
    await screen.findByText('No se ha podido cargar la cartera')
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the clients error card for a super admin', async () => {
    useAuth.setState({
      user: { id: 'u2', email: 'super@example.test', role: 'SUPER_ADMIN', profile: null },
    } as never)
    const { container } = renderPage(undefined, { mode: 'error-clients' })
    await screen.findByText('No se ha podido cargar el listado de clientes')
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the empty portfolio for an admin', async () => {
    const { container } = renderPage(undefined, { mode: 'no-clients' })
    await screen.findByText('Todavía no tienes clientes asignados')
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the empty portfolio for a super admin', async () => {
    useAuth.setState({
      user: { id: 'u2', email: 'super@example.test', role: 'SUPER_ADMIN', profile: null },
    } as never)
    const { container } = renderPage(undefined, { mode: 'no-clients' })
    await screen.findByText('Todavía no hay clientes registrados')
    expect(snap(container)).toMatchSnapshot()
  })

  it('asks to pick a client when none is selected', async () => {
    const { container } = renderPage('/assignments?date=2026-03-04')
    await screen.findByText('Selecciona un cliente para empezar')
    expect(snap(container)).toMatchSnapshot()
    await userEvent.click(screen.getByRole('button', { name: 'Cargar primer cliente' }))
    await screen.findAllByRole('button', { name: /Fuerza A/ })
    expect(screen.getByTestId('location')).toHaveTextContent('clientId=c-1')
  })

  it('renders the week view with data and an active auto rule', async () => {
    const { container } = renderPage()
    await screen.findAllByRole('button', { name: /Fuerza A/ })
    await screen.findByText(/Autoasignación activa desde 2026-03-09/)
    await screen.findByText('Mesociclo de RIR')
    await waitFor(() => expect(screen.queryByText('Cargando objetivos…')).toBeNull())
    expect(snap(container)).toMatchSnapshot()
  })

  it('renders the empty week without planning', async () => {
    const { container } = renderPage(undefined, { mode: 'empty-week', withRule: false })
    await screen.findByText('Semana sin planificación')
    await waitFor(() => expect(screen.queryByText('Cargando autoasignación')).toBeNull())
    await waitFor(() => expect(screen.queryByText('Cargando objetivos…')).toBeNull())
    expect(snap(container)).toMatchSnapshot()
  })

  it('renders the week error card and retries', async () => {
    const { container } = renderPage(undefined, { mode: 'error-week' })
    await screen.findByText('No se ha podido cargar la semana')
    await waitFor(() => expect(screen.queryByText('Cargando autoasignación')).toBeNull())
    expect(snap(container)).toMatchSnapshot()
  })

  it('renders the month view with data', async () => {
    const { container } = renderPage('/assignments?clientId=c-1&view=month&date=2026-03-04')
    await screen.findAllByRole('button', { name: /Fuerza A/ })
    await screen.findByText(/Autoasignación activa desde 2026-03-09/)
    await screen.findByText('Mesociclo de RIR')
    await waitFor(() => expect(screen.queryByText('Cargando objetivos…')).toBeNull())
    expect(snap(container)).toMatchSnapshot()
  })

  it('renders the empty month without planning', async () => {
    const { container } = renderPage('/assignments?clientId=c-1&view=month&date=2026-03-04', {
      mode: 'empty-week',
      withRule: false,
    })
    await screen.findByText('Mes sin planificación')
    await waitFor(() => expect(screen.queryByText('Cargando autoasignación')).toBeNull())
    await waitFor(() => expect(screen.queryByText('Cargando objetivos…')).toBeNull())
    expect(snap(container)).toMatchSnapshot()
  })

  it('switches between week and month through the URL', async () => {
    renderPage()
    await screen.findAllByRole('button', { name: /Fuerza A/ })
    await userEvent.click(screen.getByRole('button', { name: 'Mensual' }))
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('view=month')
    )
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('date=2026-04-04')
    )
  })

  it('shows the selection state in the toolbar and the week grid', async () => {
    const { container } = renderPage()
    await selectFirstDay()
    await screen.findByRole('button', { name: 'Editar día' })
    await screen.findByText(/Autoasignación activa desde 2026-03-09/)
    await waitFor(() => expect(screen.queryByText('Cargando objetivos…')).toBeNull())
    expect(snap(container)).toMatchSnapshot()
  })

  it('opens the delete selection dialog', async () => {
    renderPage()
    const user = await selectFirstDay()
    await user.click(screen.getByRole('button', { name: 'Limpiar día' }))
    await screen.findByText('Limpiar días seleccionados')
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the copy selection dialog', async () => {
    renderPage()
    const user = await selectFirstDay()
    await user.click(screen.getByRole('button', { name: 'Copiar selección' }))
    await screen.findByText('Fecha destino inicial')
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the deactivate auto rule dialog', async () => {
    renderPage()
    await screen.findByText(/Autoasignación activa desde 2026-03-09/)
    const user = userEvent.setup()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Desactivar autoasignación' })).toBeEnabled()
    )
    await user.click(screen.getByRole('button', { name: 'Desactivar autoasignación' }))
    await screen.findByText('Desactivar autoasignación semanal')
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the copy week dialog', async () => {
    renderPage()
    await screen.findAllByRole('button', { name: /Fuerza A/ })
    const user = userEvent.setup()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copiar semana' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Copiar semana' }))
    await screen.findByRole('dialog')
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the editor for the selected day', async () => {
    renderPage()
    const user = await selectFirstDay()
    await user.click(screen.getByRole('button', { name: 'Editar día' }))
    await screen.findByRole('dialog')
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/assignments/catalog-options')
    )
    await waitFor(() => expect(screen.queryByText(/Cargando/)).toBeNull())
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the editor in auto-rule mode', async () => {
    renderPage()
    await screen.findByText(/Autoasignación activa desde 2026-03-09/)
    const user = userEvent.setup()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Editar autoasignación' })).toBeEnabled()
    )
    await user.click(screen.getByRole('button', { name: 'Editar autoasignación' }))
    await screen.findByRole('dialog')
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/assignments/catalog-options')
    )
    await waitFor(() => expect(screen.queryByText(/Cargando/)).toBeNull())
    expect(snapBody()).toMatchSnapshot()
  })
})

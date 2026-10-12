import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/types/auth'
import type { AdherenceReport, ComponentAdherence, AdherenceConfig } from '../adherence.types'
import { ClientAdherenceTab } from './client-adherence-tab'

const shared = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: shared }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create<Session>(() => ({ user: null, isAuthenticated: false, isLoading: false })) }
})
import { useAuth } from '@/hooks/use-auth'
interface Session { user: AuthUser | null; isAuthenticated: boolean; isLoading: boolean }
const actor: AuthUser = { id: 'staff-a', email: 'synthetic@example.invalid', role: 'ADMIN', profile: null }
const component = (ratio: number | null = 1): ComponentAdherence => ({
  status: ratio === null ? 'insufficient' : 'evaluable', numerator: ratio === null ? 0 : 1,
  denominator: ratio === null ? 0 : 1, ratio, caveats: [],
})
export function report(): AdherenceReport {
  const global = { ...component(0.37), source: 'both' as const }
  return {
    version: 1, start: '2020-01-01', end: '2020-01-05', today: '2020-01-04', evaluated_at: '2020-01-04T12:00:00Z',
    aggregate: { training: component(0.6), nutrition: component(0.14), global },
    days: [{
      date: '2020-01-01', revision: 3, basis: 'original', calendar: 'partial',
      schedule: { training: 'assigned', nutrition: 'assigned' },
      configuration: { known: true, version: 2, low_global_percent: 80 },
      evaluation: { date: '2020-01-01', period: 'closed', includeInClosedAggregate: true,
        training: component(), nutrition: component(), global: { ...component(1), source: 'both' } },
      targets: { calories: 2000, protein_g: 100 }, intake: { estimated_calories: 1800, estimated_protein_g: 90 },
      indicators: { calories: { status: 'met' }, protein: { status: 'met' }, weeklySteps: { status: 'met' } },
    }],
    weeks: [{ start: '2019-12-30', average_daily_steps: 6000, weeklySteps: { status: 'met', threshold: 5285.714285714285 },
      aggregate: { training: component(0.6), nutrition: component(0.14), global },
      dailyTargets: Array.from({ length: 7 }, (_, index) => ({
        date: new Date(Date.UTC(2019, 11, 30 + index)).toISOString().slice(0, 10), goal: index < 2 ? 1000 : 7000,
        steps_min_percent: 100, version: 2, effective_date: '2019-12-30', status: 'met',
      })),
    }],
  }
}
const config: AdherenceConfig = { version: 2, known: true, source: 'revision', effective_date: '2020-01-01',
  steps_goal: null, calorie_lower_percent: 10, calorie_upper_percent: 10, protein_min_percent: 90,
  steps_min_percent: 100, low_global_percent: 80 }
const envelope = <T,>(data: T) => ({ data: { success: true, data, timestamp: '2020-01-01T00:00:00Z' } })
const CUSTOM = '/?adherence_period=custom&adherence_start=2020-01-01&adherence_end=2020-01-05'
const calls = () => shared.get.mock.calls.filter(([url]) => !String(url).endsWith('/config')) as Array<[string, { params: { start: string; end: string } }]>
function LocationProbe() { return <output data-testid="location">{useLocation().search}</output> }
function mount(clientId = 'client-a', queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }), url = '/') {
  const tree = (id: string) => <QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[url]}><LocationProbe /><ClientAdherenceTab clientId={id} /></MemoryRouter></QueryClientProvider>
  const view = render(tree(clientId))
  return { ...view, queryClient, changeClient: (id: string) => view.rerender(tree(id)) }
}
function setCustom(from: string, to: string) {
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: from } })
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: to } })
}
beforeEach(() => {
  // jsdom has no layout observer; data semantics are verified via the table.
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  // Radix Select needs these in jsdom.
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => undefined
  Element.prototype.releasePointerCapture = () => undefined
  Element.prototype.scrollIntoView = () => undefined
  window.localStorage.clear()
  shared.get.mockReset(); shared.put.mockReset()
  useAuth.setState({ user: actor, isAuthenticated: true, isLoading: false })
  shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : report())))
})
describe('Adherencia visual', () => {
  it('selecciona un día sin consultar ni escribir y separa evolución del veredicto', async () => {
    const data = report()
    data.days.push({ ...data.days[0], date: '2020-01-02', calendar: 'insufficient', evaluation: { ...data.days[0].evaluation, global: { ...component(null), source: 'none' } } })
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : data)))
    mount()
    const calendar = await screen.findByRole('region', { name: 'Calendario de adherencia' })
    const count = shared.get.mock.calls.length
    const day = within(calendar).getByRole('button', { name: /2020-01-02 · Información insuficiente/ })
    day.focus()
    await userEvent.keyboard('{Enter}')
    expect(day).toHaveFocus()
    expect(day).toHaveClass('motion-reduce:transition-none')
    expect(day).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('article', { name: 'Día 2020-01-02' })).toHaveTextContent('Información insuficiente')
    expect(screen.queryByRole('article', { name: 'Día 2020-01-01' })).not.toBeInTheDocument()
    const evolution = screen.getByRole('region', { name: 'Evolución diaria del periodo seleccionado' })
    expect(evolution).toHaveTextContent('Sin dato evaluable')
    expect(evolution).not.toHaveTextContent('Baja adherencia global')
    expect(shared.get).toHaveBeenCalledTimes(count)
    expect(shared.put).not.toHaveBeenCalled()
  })
  it('la tabla conserva cero medido y huecos para datos insuficientes, neutrales y no cerrados', async () => {
    const data = report()
    const base = data.days[0]
    data.days = [
      { ...base, evaluation: { ...base.evaluation, global: { ...component(0), source: 'both' } } },
      { ...base, date: '2020-01-02', evaluation: { ...base.evaluation, global: { ...component(null), source: 'none' } } },
      { ...base, date: '2020-01-03', evaluation: { ...base.evaluation, global: { ...component(null), status: 'not_applicable', source: 'none' } } },
      { ...base, date: '2020-01-04', evaluation: { ...base.evaluation, period: 'provisional', global: { ...component(1), source: 'both' } } },
      { ...base, date: '2020-01-05', evaluation: { ...base.evaluation, period: 'future', global: { ...component(1), source: 'both' } } },
    ]
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : data)))
    mount()
    await screen.findByRole('region', { name: 'Periodo cerrado' })
    fireEvent.click(screen.getByText('Ver valores diarios en tabla'))
    const table = screen.getByRole('table', { name: 'Porcentajes diarios cerrados del periodo seleccionado' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(within(rows[0]).getAllByRole('cell')[0]).toHaveTextContent('0 %')
    for (const row of rows.slice(1)) {
      expect(within(row).getAllByRole('cell')[0]).toHaveTextContent('Sin dato evaluable')
      expect(within(row).getAllByRole('cell')[0]).not.toHaveTextContent('0 %')
    }
    expect(screen.getByText(/Una observación global/)).toBeInTheDocument()
  })
  it('mantiene configuración y pasos como detalles secundarios', async () => {
    mount()
    await screen.findByRole('region', { name: 'Periodo cerrado' })
    expect(screen.getByText('Configuración de adherencia').closest('details')).not.toHaveAttribute('open')
    expect(screen.getByText('Pasos y detalle semanal').closest('details')).not.toHaveAttribute('open')
  })
})
describe('Adherencia canónica en el detalle', () => {
  it('consulta cliente/rango y consume ratios cerrados sin promediar días; pasos una vez con siete objetivos', async () => {
    mount('client-a', undefined, CUSTOM)
    const summary = await screen.findByRole('region', { name: 'Periodo cerrado' })
    expect(within(summary).getByText('37 %')).toBeInTheDocument()
    expect(shared.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start: '2020-01-01', end: '2020-01-05' } }))
    fireEvent.click(screen.getByText('Pasos y detalle semanal'))
    const weekly = screen.getByRole('region', { name: 'Pasos semanales 2019-12-30' })
    expect(within(weekly).getByText('6000')).toBeInTheDocument()
    expect(within(weekly).getAllByRole('listitem')).toHaveLength(7)
    expect(within(weekly).getByText(/2019-12-30: 1000/)).toBeInTheDocument()
    expect(screen.getAllByText('Media de pasos del recap')).toHaveLength(1)
    expect(screen.getByText(/Revisión 3/)).toBeInTheDocument()
    expect(screen.getByText(/1800 kcal estimadas/)).toBeInTheDocument()
    expect(within(summary).queryByText(/Baja adherencia/)).not.toBeInTheDocument()
  })
  it.each([['2020-02-30', '2020-03-01'], ['2020-02-02', '2020-02-01'], ['2020-01-01', '2020-02-01']])('no solicita fechas inválidas %s..%s', async (start, end) => {
    mount('client-a', undefined, CUSTOM); await screen.findByRole('region', { name: 'Periodo cerrado' })
    const count = shared.get.mock.calls.length
    setCustom(start, end)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(shared.get).toHaveBeenCalledTimes(count)
  })
  it('un periodo personalizado de más de 31 días muestra error y no consulta', async () => {
    mount('client-a', undefined, CUSTOM); await screen.findByRole('region', { name: 'Periodo cerrado' })
    const count = shared.get.mock.calls.length
    setCustom('2020-01-01', '2020-02-01')
    expect(screen.getByRole('alert')).toHaveTextContent(/31/)
    expect(shared.get).toHaveBeenCalledTimes(count)
  })
  it('diferencia insuficiente, provisional, futuro, descanso y sin asignación sin convertirlos en cero', async () => {
    const data = report()
    const day = data.days[0]
    data.days = [
      { ...day, date: '2020-01-01', basis: 'unknown', calendar: 'insufficient', evaluation: { ...day.evaluation, global: { ...component(null), source: 'none' } } },
      { ...day, date: '2020-01-02', calendar: 'rest', schedule: { training: 'rest', nutrition: 'not_assigned' } },
      { ...day, date: '2020-01-03', calendar: 'not_assigned' },
      { ...day, date: '2020-01-04', basis: 'current_provisional', revision: null, evaluation: { ...day.evaluation, period: 'provisional', includeInClosedAggregate: false } },
      { ...day, date: '2020-01-05', calendar: 'future', evaluation: { ...day.evaluation, period: 'future', includeInClosedAggregate: false, global: { ...component(null), status: 'neutral', source: 'none' } } },
    ]
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : data)))
    mount('client-a', undefined, CUSTOM)
    expect(await screen.findByText('Descanso')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2020-01-03 · Sin asignación/ })).toBeInTheDocument()
    expect(screen.getByText('Futuro')).toBeInTheDocument()
    expect(screen.getAllByText(/Información insuficiente/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Pauta original desconocida/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /2020-01-04.*Provisional/ }))
    expect(screen.getByText(/Provisional · no incluido/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /2020-01-05.*Futuro/ }))
    expect(screen.getByText(/Fecha futura · no penaliza/)).toBeInTheDocument()
  })
  it('conserva metadata histórica diaria sin clasificar baja adherencia por día', async () => {
    const data = report(); data.days[0].evaluation.global = { ...component(0.37), source: 'nutrition_only' }
    data.days[0].configuration.low_global_percent = 40
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : data)))
    mount('client-a', undefined, CUSTOM)
    expect(await screen.findByText(/Configuración versión 2 · política global de siete días 40 %/)).toBeInTheDocument()
    expect(screen.queryByText(/Baja adherencia · menos del/)).not.toBeInTheDocument()
    expect(screen.getByText('Solo nutrición')).toBeInTheDocument()
  })
  it('fallo HTTP es error y no UNKNOWN; permite actualización explícita de revisiones', async () => {
    shared.get.mockImplementation((url: string) => url.endsWith('/config') ? Promise.resolve(envelope(config)) : Promise.reject(new Error('offline')))
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la adherencia')
    expect(screen.queryByText('Pauta original desconocida')).not.toBeInTheDocument()
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : report())))
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar evaluaciones' }))
    expect(await screen.findByText(/Revisión 3/)).toBeInTheDocument()
  })
  it('no expone respuestas tardías de otro cliente ni de otra sesión del mismo actor', async () => {
    let resolveOld: (value: ReturnType<typeof envelope<AdherenceReport>>) => void = () => undefined
    shared.get.mockImplementation((url: string) => url.endsWith('/config') ? Promise.resolve(envelope(config)) : new Promise((resolve) => { resolveOld = resolve }))
    const view = mount()
    expect(screen.getByText('Cargando adherencia…')).toBeInTheDocument()
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : { ...report(), aggregate: { ...report().aggregate, global: { ...component(0.73), source: 'both' } } })))
    view.changeClient('client-b')
    await screen.findByText('73 %')
    await act(async () => resolveOld(envelope(report())))
    expect(within(screen.getByRole('region', { name: 'Periodo cerrado' })).queryByText('37 %')).not.toBeInTheDocument()
    act(() => useAuth.setState({ user: null, isAuthenticated: false }))
    expect(screen.queryByText('73 %')).not.toBeInTheDocument()
    shared.get.mockImplementation((url: string) => url.endsWith('/config') ? Promise.resolve(envelope(config)) : new Promise(() => undefined))
    act(() => useAuth.setState({ user: { ...actor }, isAuthenticated: true }))
    expect(screen.queryByText('73 %')).not.toBeInTheDocument()
  })
  it('por defecto consulta los últimos 30 días UTC y el periodo anterior equivalente', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-12T10:00:00Z'))
    try {
      mount(); await screen.findByRole('region', { name: 'Periodo cerrado' })
      await waitFor(() => expect(calls()).toHaveLength(2))
      expect(calls().map(([, config]) => config.params)).toEqual(expect.arrayContaining([
        { start: '2026-09-13', end: '2026-10-12' }, { start: '2026-08-14', end: '2026-09-12' },
      ]))
    } finally { vi.useRealTimers() }
  })
  it('un enlace antiguo con solo adherence_start/end carga como personalizado', async () => {
    mount('client-a', undefined, '/?adherence_start=2020-01-01&adherence_end=2020-01-05')
    await screen.findByRole('region', { name: 'Periodo cerrado' })
    expect(screen.getByRole('combobox', { name: 'Periodo' })).toHaveTextContent('Personalizado')
    expect(calls().map(([, config]) => config.params)).toContainEqual({ start: '2020-01-01', end: '2020-01-05' })
  })
  it('cambiar el preset actualiza la URL y consulta el nuevo rango', async () => {
    mount(); await screen.findByRole('region', { name: 'Periodo cerrado' })
    await userEvent.click(screen.getByRole('combobox', { name: 'Periodo' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Últimos 7 días' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('adherence_period=7d'))
    await waitFor(() => expect(calls().some(([, config]) => {
      const days = (Date.parse(config.params.end) - Date.parse(config.params.start)) / 86_400_000 + 1
      return days === 7
    })).toBe(true))
  })
  it('admite ventanas personalizadas de 1 y 31 días', async () => {
    mount('client-a', undefined, CUSTOM); await screen.findByRole('region', { name: 'Periodo cerrado' })
    for (const end of ['2020-01-01', '2020-01-31']) {
      setCustom('2020-01-01', end)
      await waitFor(() => expect(calls().map(([, config]) => config.params)).toContainEqual({ start: '2020-01-01', end }))
    }
  })
  const previousStart = '2019-12-27'
  const route = (previous: () => unknown) => (url: string, config: { params: { start: string } }) => url.endsWith('/config')
    ? Promise.resolve(envelope(config)) : config.params.start === previousStart ? previous() : Promise.resolve(envelope(report()))
  it('muestra deltas en puntos porcentuales frente al periodo anterior', async () => {
    const previous = report()
    previous.aggregate = { training: component(0.5), nutrition: component(0.2), global: { ...component(0.3), source: 'both' } }
    shared.get.mockImplementation(route(() => Promise.resolve(envelope(previous))))
    mount('client-a', undefined, CUSTOM)
    const summary = await screen.findByRole('region', { name: 'Periodo cerrado' })
    await waitFor(() => expect(within(summary).getAllByTestId('delta-badge')).toHaveLength(3))
    const labels = within(summary).getAllByTestId('delta-badge').map((badge) => badge.textContent)
    expect(labels).toEqual(expect.arrayContaining(['+10 p. p.', '−6 p. p.', '+7 p. p.']))
  })
  it('un ratio previo nulo muestra Sin datos previos, nunca cero', async () => {
    const previous = report()
    previous.aggregate = { training: component(null), nutrition: component(0.2), global: { ...component(null), source: 'none' } }
    shared.get.mockImplementation(route(() => Promise.resolve(envelope(previous))))
    mount('client-a', undefined, CUSTOM)
    const summary = await screen.findByRole('region', { name: 'Periodo cerrado' })
    await waitFor(() => expect(within(summary).getAllByText('Sin datos previos')).toHaveLength(2))
  })
  it('si falla la consulta anterior el informe principal sigue y los deltas indican Sin datos previos', async () => {
    shared.get.mockImplementation(route(() => Promise.reject(new Error('offline'))))
    mount('client-a', undefined, CUSTOM)
    const summary = await screen.findByRole('region', { name: 'Periodo cerrado' })
    await waitFor(() => expect(within(summary).getAllByText('Sin datos previos')).toHaveLength(3))
    expect(within(summary).getByText('37 %')).toBeInTheDocument()
  })
  it('Actualizar evaluaciones vuelve a consultar ambos periodos', async () => {
    mount('client-a', undefined, CUSTOM); await screen.findByRole('region', { name: 'Periodo cerrado' })
    await waitFor(() => expect(calls()).toHaveLength(2))
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar evaluaciones' }))
    await waitFor(() => expect(calls()).toHaveLength(4))
  })
  it('la respuesta en vuelo del actor anterior nunca aparece para un nuevo actor en el mismo cliente', async () => {
    let finish: (value: ReturnType<typeof envelope<AdherenceReport>>) => void = () => undefined
    shared.get.mockImplementation((url: string) => url.endsWith('/config') ? Promise.resolve(envelope(config)) : new Promise((resolve) => { finish = resolve }))
    mount()
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : { ...report(), aggregate: { ...report().aggregate, global: { ...component(0.73), source: 'both' } } })))
    act(() => useAuth.setState({ user: { ...actor, id: 'staff-b', role: 'SUPER_ADMIN' } }))
    await screen.findByText('73 %')
    await act(async () => finish(envelope(report())))
    expect(within(screen.getByRole('region', { name: 'Periodo cerrado' })).queryByText('37 %')).not.toBeInTheDocument()
  })
  it('no consulta durante la validación de sesión ni expone datos cacheados', () => {
    useAuth.setState({ isLoading: true })
    mount()
    expect(shared.get).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Periodo cerrado' })).not.toBeInTheDocument()
  })
  it('no solicita ni muestra datos sin sesión autorizada', () => {
    useAuth.setState({ user: null, isAuthenticated: false })
    mount()
    expect(shared.get).not.toHaveBeenCalled()
    expect(screen.getByText('Sesión de administrador requerida')).toBeInTheDocument()
  })
})
describe('Últimos siete días cerrados del servidor', () => {
  function recent(ratio = 1 / 7, status = 'low') {
    return {
      start: '2019-12-28', end: '2020-01-03', anchor: 'selected_end_or_last_closed_utc', provisional: false,
      aggregate: { training: component(1), nutrition: component(0), global: { ...component(ratio), source: 'both' } },
      configuration: { known: true, version: 5, effective_date: '2019-12-01', low_global_percent: 80 },
      coverage: { expected: 7, available: 7, evaluable: 7, not_applicable: 0, insufficient: 0 }, status,
    }
  }
  function serve(window: ReturnType<typeof recent> | undefined) {
    const data = report()
    data.aggregate.global.ratio = 0.75
    data.days[0].evaluation.global.ratio = 0
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? { ...config, low_global_percent: 99 } : { ...data, recentClosed: window })))
    mount()
  }
  it('separa mensual 75 % de global 1/7 y muestra ventana, anclaje y política fechada', async () => {
    serve(recent())
    const region = await screen.findByRole('region', { name: 'Últimos siete días cerrados' })
    expect(within(region).getByText('14,29 %')).toBeInTheDocument()
    expect(within(region).getByText('Baja adherencia global')).toBeInTheDocument()
    expect(region).toHaveTextContent('2019-12-28 — 2020-01-03 · UTC')
    expect(region).toHaveTextContent('final seleccionado o último día cerrado UTC')
    expect(region).toHaveTextContent('versión 5 · vigencia 2019-12-01')
    expect(region).toHaveTextContent('Umbral global de siete días: 80 %')
    expect(region).toHaveTextContent('7 / 7 días disponibles')
    expect(within(screen.getByRole('region', { name: 'Periodo cerrado' })).getByText('75 %')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Día 2020-01-01' })).queryByText(/Baja adherencia/)).not.toBeInTheDocument()
  })
  it.each([0.8, 0.25])('respeta not_low del servidor incluso con diario cero y ratio %s', async (ratio) => {
    serve(recent(ratio, 'not_low'))
    const region = await screen.findByRole('region', { name: 'Últimos siete días cerrados' })
    expect(within(region).getByText('Sin baja adherencia global')).toBeInTheDocument()
    expect(within(region).queryByText('Baja adherencia global')).not.toBeInTheDocument()
    expect(region).toHaveTextContent(ratio === 0.8 ? '80 %' : '25 %')
  })
  it('payload ausente no reconstruye ventana desde días, mensual ni configuración actual', async () => {
    serve(undefined)
    const region = await screen.findByRole('region', { name: 'Últimos siete días cerrados' })
    expect(region).toHaveTextContent('Resultado de siete días no disponible')
    expect(screen.queryByText('Baja adherencia global')).not.toBeInTheDocument()
    expect(within(region).queryByText(/75 %|0 %|99 %/)).not.toBeInTheDocument()
  })
  it('cobertura y política desconocidas conservan ratio parcial sin veredicto bajo', async () => {
    const window = recent(0.25, 'insufficient')
    const unknown = { ...window, configuration: { known: false, version: null, effective_date: null, low_global_percent: null }, coverage: { ...window.coverage, available: 6, insufficient: 1 } }
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : { ...report(), recentClosed: unknown })))
    mount()
    const region = await screen.findByRole('region', { name: 'Últimos siete días cerrados' })
    expect(region).toHaveTextContent('Información insuficiente para clasificar')
    expect(region).toHaveTextContent('Configuración desconocida')
    expect(region).toHaveTextContent('6 / 7 días disponibles')
    expect(region).toHaveTextContent('1 insuficientes')
    expect(within(region).queryByText('Baja adherencia global')).not.toBeInTheDocument()
  })
  it('versión y vigencia nulas no se atribuyen a la configuración futura', async () => {
    const window = recent()
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : { ...report(), recentClosed: { ...window, configuration: { ...window.configuration, version: null, effective_date: null } } })))
    mount()
    const region = await screen.findByRole('region', { name: 'Últimos siete días cerrados' })
    expect(region).toHaveTextContent('versión desconocida · vigencia desconocida')
  })
  it('sin componentes aplicables es neutral, no éxito al 80 %', async () => {
    const window = recent(0, 'not_applicable')
    const noComponent = { ...component(null), status: 'not_applicable', caveats: [] }
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : { ...report(), recentClosed: { ...window, aggregate: { training: noComponent, nutrition: noComponent, global: { ...noComponent, source: 'none' } }, coverage: { ...window.coverage, evaluable: 0, not_applicable: 7 } } })))
    mount()
    const region = await screen.findByRole('region', { name: 'Últimos siete días cerrados' })
    expect(region).toHaveTextContent('No aplicable: sin componentes evaluables')
    expect(within(region).queryByText('Sin baja adherencia global')).not.toBeInTheDocument()
    expect(within(region).queryByText('0 %')).not.toBeInTheDocument()
  })
})
describe('Configuración futura versionada', () => {
  function mountSettings() {
    const view = mount()
    fireEvent.click(screen.getByText('Configuración de adherencia'))
    return view
  }
  function draft() {
    fireEvent.change(screen.getByLabelText('Vigencia desde (UTC)'), { target: { value: '2099-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cargar configuración de la fecha' }))
  }
  it('PUT exacto, pendiente deshabilitado, éxito con vigencia e invalidación de todos los periodos del cliente', async () => {
    const view = mountSettings(); await screen.findByLabelText('Objetivo de pasos')
    draft(); await screen.findByDisplayValue('80')
    view.queryClient.setQueryData(['client-adherence', 'client-a', 'old-period'], report())
    const invalidate = vi.spyOn(view.queryClient, 'invalidateQueries')
    let finish: (value: ReturnType<typeof envelope<AdherenceConfig>>) => void = () => undefined
    shared.put.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    fireEvent.change(screen.getByLabelText('Baja adherencia global (%)'), { target: { value: '70' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración futura' }))
    await waitFor(() => expect(shared.put).toHaveBeenCalledWith('/admin/clients/client-a/adherence/config', { ...configValues(), effective_date: '2099-01-01', expected_version: 2, low_global_percent: 70 }))
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    await act(async () => finish(envelope({ ...config, version: 3, effective_date: '2099-01-01', low_global_percent: 70 })))
    expect(await screen.findByText(/Guardada · vigente desde 2099-01-01/)).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['client-adherence', 'client-a'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['client-adherence-config', 'client-a'] })
  })
  it('409 conserva borrador; recarga versión sin sobrescribir campos, reintento manual', async () => {
    mountSettings(); await screen.findByLabelText('Objetivo de pasos'); draft()
    await screen.findByLabelText('Baja adherencia global (%)')
    fireEvent.change(screen.getByLabelText('Baja adherencia global (%)'), { target: { value: '65' } })
    shared.put.mockRejectedValue({ isAxiosError: true, response: { status: 409 } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración futura' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Conflicto/)
    expect(screen.getByLabelText('Baja adherencia global (%)')).toHaveValue(65)
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? { ...config, version: 4 } : report())))
    fireEvent.click(screen.getByRole('button', { name: 'Recargar versión conservando borrador' }))
    await screen.findByText('Versión de escritura: 4')
    expect(screen.getByLabelText('Baja adherencia global (%)')).toHaveValue(65)
    expect(shared.put).toHaveBeenCalledTimes(1)
    shared.put.mockResolvedValue(envelope({ ...config, version: 5, effective_date: '2099-01-01' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración futura' }))
    await waitFor(() => expect(shared.put).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ expected_version: 4, low_global_percent: 65 })))
  })
  it.each([
    ['Objetivo de pasos', '0'], ['Objetivo de pasos', '1.5'], ['Margen inferior de calorías (%)', '101'],
    ['Margen superior de calorías (%)', '-1'], ['Proteína mínima (%)', '201'], ['Pasos mínimos (%)', '201'],
    ['Baja adherencia global (%)', '101'],
  ])('bloquea fuera de los límites del DTO: %s=%s', async (label, value) => {
    mountSettings(); await screen.findByLabelText('Objetivo de pasos')
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
    expect(screen.getByRole('button', { name: 'Guardar configuración futura' })).toBeDisabled()
    expect(shared.put).not.toHaveBeenCalled()
  })
  it('bloquea vigencia pasada y versión desconocida', async () => {
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? { ...config, version: NaN } : report())))
    mountSettings(); await screen.findByLabelText('Objetivo de pasos')
    expect(screen.getByText('Versión de escritura: desconocida')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Vigencia desde (UTC)'), { target: { value: '2020-01-01' } })
    expect(screen.getByRole('alert')).toHaveTextContent('La vigencia debe ser una fecha futura UTC válida.')
    expect(screen.getByRole('button', { name: 'Guardar configuración futura' })).toBeDisabled()
    expect(shared.put).not.toHaveBeenCalled()
  })
  it('fallo al guardar conserva valores sin afirmar éxito ni vigencia', async () => {
    mountSettings(); await screen.findByLabelText('Objetivo de pasos')
    shared.put.mockRejectedValue(new Error('offline'))
    fireEvent.change(screen.getByLabelText('Baja adherencia global (%)'), { target: { value: '65' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración futura' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar la configuración')
    expect(screen.getByLabelText('Baja adherencia global (%)')).toHaveValue(65)
    expect(screen.queryByText(/Guardada · vigente/)).not.toBeInTheDocument()
  })
  it('recarga fallida tras conflicto conserva el borrador editable', async () => {
    mountSettings(); await screen.findByLabelText('Objetivo de pasos')
    fireEvent.change(screen.getByLabelText('Baja adherencia global (%)'), { target: { value: '65' } })
    shared.put.mockRejectedValue({ isAxiosError: true, response: { status: 409 } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración futura' }))
    await screen.findByRole('alert')
    shared.get.mockRejectedValue(new Error('offline'))
    fireEvent.click(screen.getByRole('button', { name: 'Recargar versión conservando borrador' }))
    await screen.findByText('No se pudo recargar la versión. Borrador conservado.')
    expect(screen.getByLabelText('Baja adherencia global (%)')).toHaveValue(65)
    expect(shared.put).toHaveBeenCalledTimes(1)
  })
  it('configuración desconocida no inventa defaults históricos y bloquea campos incompletos', async () => {
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? { known: false, version: 0, source: 'uncaptured', effective_date: null } : report())))
    mountSettings()
    expect(await screen.findByText(/Configuración desconocida/)).toBeInTheDocument()
    expect(screen.getByLabelText('Baja adherencia global (%)')).toHaveValue(null)
    expect(screen.getByRole('button', { name: 'Guardar configuración futura' })).toBeDisabled()
    expect(shared.put).not.toHaveBeenCalled()
  })
})
function configValues() {
  return { steps_goal: null, calorie_lower_percent: 10, calorie_upper_percent: 10, protein_min_percent: 90, steps_min_percent: 100 }
}

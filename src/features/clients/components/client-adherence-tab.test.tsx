import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
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
function mount(clientId = 'client-a', queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
  const view = render(<QueryClientProvider client={queryClient}><MemoryRouter><ClientAdherenceTab clientId={clientId} /></MemoryRouter></QueryClientProvider>)
  return { ...view, queryClient, changeClient: (id: string) => view.rerender(<QueryClientProvider client={queryClient}><MemoryRouter><ClientAdherenceTab clientId={id} /></MemoryRouter></QueryClientProvider>) }
}
function selectRange() {
  fireEvent.change(screen.getByLabelText('Desde (UTC)'), { target: { value: '2020-01-01' } })
  fireEvent.change(screen.getByLabelText('Hasta (UTC)'), { target: { value: '2020-01-05' } })
  fireEvent.click(screen.getByRole('button', { name: 'Consultar periodo' }))
}
beforeEach(() => {
  shared.get.mockReset(); shared.put.mockReset()
  useAuth.setState({ user: actor, isAuthenticated: true, isLoading: false })
  shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : report())))
})
describe('Adherencia canónica en el detalle', () => {
  it('consulta cliente/rango y consume ratios cerrados sin promediar días; pasos una vez con siete objetivos', async () => {
    mount(); selectRange()
    const summary = await screen.findByRole('region', { name: 'Periodo cerrado' })
    expect(within(summary).getByText('37 %')).toBeInTheDocument()
    expect(shared.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start: '2020-01-01', end: '2020-01-05' } }))
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
    mount(); await screen.findByRole('region', { name: 'Periodo cerrado' })
    const count = shared.get.mock.calls.length
    fireEvent.change(screen.getByLabelText('Desde (UTC)'), { target: { value: start } })
    fireEvent.change(screen.getByLabelText('Hasta (UTC)'), { target: { value: end } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar periodo' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/1 a 31 días/)
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
    mount()
    expect(await screen.findByText('Descanso')).toBeInTheDocument()
    expect(screen.getByText('Sin asignación')).toBeInTheDocument()
    expect(screen.getByText(/Provisional · no incluido/)).toBeInTheDocument()
    expect(screen.getByText('Futuro')).toBeInTheDocument()
    expect(screen.getAllByText(/Información insuficiente/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Pauta original desconocida/)).toBeInTheDocument()
  })
  it('muestra umbral propio del día y compara el ratio servidor, no contadores ni configuración actual', async () => {
    const data = report(); data.days[0].evaluation.global = { ...component(0.37), source: 'nutrition_only' }
    data.days[0].configuration.low_global_percent = 40
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? config : data)))
    mount()
    expect(await screen.findByText(/Baja adherencia · menos del 40 %/)).toBeInTheDocument()
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
  it('selecciones semanal/mensual UTC incluyen límites de mes y admite ventanas de 1 y 31 días', async () => {
    mount(); await screen.findByRole('region', { name: 'Periodo cerrado' })
    fireEvent.change(screen.getByLabelText('Desde (UTC)'), { target: { value: '2020-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Semana de la fecha inicial' }))
    await waitFor(() => expect(shared.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start: '2019-12-30', end: '2020-01-05' } })))
    fireEvent.change(screen.getByLabelText('Desde (UTC)'), { target: { value: '2020-02-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mes de la fecha inicial' }))
    await waitFor(() => expect(shared.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start: '2020-02-01', end: '2020-02-29' } })))
    for (const end of ['2020-01-01', '2020-01-31']) {
      fireEvent.change(screen.getByLabelText('Desde (UTC)'), { target: { value: '2020-01-01' } })
      fireEvent.change(screen.getByLabelText('Hasta (UTC)'), { target: { value: end } })
      fireEvent.click(screen.getByRole('button', { name: 'Consultar periodo' }))
      await waitFor(() => expect(shared.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start: '2020-01-01', end } })))
    }
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
describe('Configuración futura versionada', () => {
  function draft() {
    fireEvent.change(screen.getByLabelText('Vigencia desde (UTC)'), { target: { value: '2099-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cargar configuración de la fecha' }))
  }
  it('PUT exacto, pendiente deshabilitado, éxito con vigencia e invalidación de todos los periodos del cliente', async () => {
    const view = mount(); await screen.findByLabelText('Objetivo de pasos')
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
    mount(); await screen.findByLabelText('Objetivo de pasos'); draft()
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
    mount(); await screen.findByLabelText('Objetivo de pasos')
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
    expect(screen.getByRole('button', { name: 'Guardar configuración futura' })).toBeDisabled()
    expect(shared.put).not.toHaveBeenCalled()
  })
  it('bloquea vigencia pasada y versión desconocida', async () => {
    shared.get.mockImplementation((url: string) => Promise.resolve(envelope(url.endsWith('/config') ? { ...config, version: NaN } : report())))
    mount(); await screen.findByLabelText('Objetivo de pasos')
    expect(screen.getByText('Versión de escritura: desconocida')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Vigencia desde (UTC)'), { target: { value: '2020-01-01' } })
    expect(screen.getByRole('alert')).toHaveTextContent('La vigencia debe ser una fecha futura UTC válida.')
    expect(screen.getByRole('button', { name: 'Guardar configuración futura' })).toBeDisabled()
    expect(shared.put).not.toHaveBeenCalled()
  })
  it('fallo al guardar conserva valores sin afirmar éxito ni vigencia', async () => {
    mount(); await screen.findByLabelText('Objetivo de pasos')
    shared.put.mockRejectedValue(new Error('offline'))
    fireEvent.change(screen.getByLabelText('Baja adherencia global (%)'), { target: { value: '65' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración futura' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar la configuración')
    expect(screen.getByLabelText('Baja adherencia global (%)')).toHaveValue(65)
    expect(screen.queryByText(/Guardada · vigente/)).not.toBeInTheDocument()
  })
  it('recarga fallida tras conflicto conserva el borrador editable', async () => {
    mount(); await screen.findByLabelText('Objetivo de pasos')
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
    mount()
    expect(await screen.findByText(/Configuración desconocida/)).toBeInTheDocument()
    expect(screen.getByLabelText('Baja adherencia global (%)')).toHaveValue(null)
    expect(screen.getByRole('button', { name: 'Guardar configuración futura' })).toBeDisabled()
    expect(shared.put).not.toHaveBeenCalled()
  })
})
function configValues() {
  return { steps_goal: null, calorie_lower_percent: 10, calorie_upper_percent: 10, protein_min_percent: 90, steps_min_percent: 100 }
}

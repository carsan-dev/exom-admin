import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useSearchParams } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/types/auth'
import { answerConfirmDialog, findConfirmDialog } from '@/test/confirm-dialog'
import { fixtureAssignee, fixturePage, fixtureSummary, fixtureTask } from '../follow-up-tasks/fixtures'
import { ProgressPage } from './progress-page'

// Characterization of the page shell (RDS-F4-E0): header, client selector and section tabs.
// Written against the shell before its restyle; it must pass unchanged afterwards.
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({
    user: { id: 'synthetic-staff', email: 'staff@example.invalid', role: 'ADMIN', profile: null } satisfies AuthUser,
    isAuthenticated: true, isLoading: false,
  })) }
})
vi.mock('../../clients/api', () => ({ useClientProfile: () => ({ data: undefined, isLoading: false }) }))
vi.mock('../api', () => ({
  useClientCalendarMonth: () => ({ data: undefined, isLoading: false }),
  useClientDayProgress: () => ({ data: undefined, isLoading: false }),
  useClientWeekSummary: () => ({ data: undefined, isLoading: false }),
}))
vi.mock('../components/client-selector', () => ({
  ClientSelector: ({ selectedClientId, onSelect }: { selectedClientId: string; onSelect: (id: string) => void }) => (
    <button onClick={() => onSelect('client-b')}>Seleccionar cliente B ({selectedClientId || 'ninguno'})</button>
  ),
  EmptyClientState: () => <p>Selecciona un cliente</p>,
}))
vi.mock('../components/progress-dashboard', () => ({ ProgressDashboard: () => <p>Dashboard existente</p> }))
vi.mock('../components/progress-overview-cards', () => ({ ProgressOverviewCards: () => <p>Resumen existente</p> }))
vi.mock('../components/progress-calendar', () => ({ ProgressCalendar: () => null }))
vi.mock('../components/day-progress-detail', () => ({ DayProgressDetail: () => null }))
vi.mock('../components/metrics-overview', () => ({ MetricsOverviewPanel: () => <p>Métricas existentes</p> }))
vi.mock('../components/metrics-table', () => ({ MetricsTable: () => null }))
vi.mock('../components/training-progress-panel', () => ({ TrainingProgressPanel: () => <p>Entrenamiento existente</p> }))
vi.mock('../components/streak-section', () => ({ StreakSection: () => <p>Racha existente</p> }))
vi.mock('../components/progress-photos-panel', () => ({ ProgressPhotosPanel: () => <p>Fotos existentes</p> }))
vi.mock('../../clients/components/client-adherence-tab', () => ({ ClientAdherenceTab: () => <p>Adherencia existente</p> }))

const DIRTY = '¿Descartar los cambios de esta tarea sin guardar?'
const TAB_NAMES = ['Dashboard', 'Resumen', 'Métricas', 'Fotos', 'Entrenamiento', 'Adherencia', 'Racha', 'Seguimiento']
const envelope = (data: unknown) => ({ data: { success: true, data, timestamp: '2026-10-05T00:00:00Z' } })

function RouteProbe() {
  const [params] = useSearchParams()
  return <output aria-label="Ruta actual">{params.toString()}</output>
}
function mount(query: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/progress${query ? `?${query}` : ''}`]}><ProgressPage /><RouteProbe /></MemoryRouter>
    </QueryClientProvider>,
  )
}
function params() {
  return new URLSearchParams(screen.getByLabelText('Ruta actual').textContent ?? '')
}
function openTab(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false })
}

beforeEach(() => {
  window.localStorage.clear()
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset()
  api.get.mockImplementation((url: string) => Promise.resolve(envelope(
    url.endsWith('/follow-up-tasks/summary') ? fixtureSummary : url.endsWith('/follow-up-tasks/assignees') ? fixturePage([fixtureAssignee]) : fixturePage([fixtureTask]),
  )))
})

describe('Progreso (carcasa): cabecera, cliente y pestañas', () => {
  it('muestra el título «Progreso» como único h1 y el selector de cliente', () => {
    mount('clientId=client-a&section=metricas')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Progreso' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Seleccionar cliente B \(client-a\)/ })).toBeInTheDocument()
  })

  it('ofrece las ocho secciones en orden dentro de «Secciones de progreso»', () => {
    mount('clientId=client-a&section=metricas')
    const list = screen.getByRole('tablist', { name: 'Secciones de progreso' })
    expect(within(list).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(TAB_NAMES)
    for (const tab of within(list).getAllByRole('tab')) expect(tab).toBeEnabled()
  })

  it.each([
    ['dashboard', 'Dashboard', 'Dashboard existente'],
    ['resumen', 'Resumen', 'Resumen existente'],
    ['metricas', 'Métricas', 'Métricas existentes'],
    ['fotos', 'Fotos', 'Fotos existentes'],
    ['entrenamiento', 'Entrenamiento', 'Entrenamiento existente'],
    ['adherencia', 'Adherencia', 'Adherencia existente'],
    ['racha', 'Racha', 'Racha existente'],
  ])('enlace profundo section=%s selecciona «%s» y monta su contenido', (section, tab, content) => {
    mount(`clientId=client-a&section=${section}`)
    expect(screen.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(content)).toBeInTheDocument()
    expect(screen.getAllByRole('tab', { selected: true })).toHaveLength(1)
  })

  it('section=seguimiento selecciona Seguimiento y monta el panel de tareas', async () => {
    mount('clientId=client-a&section=seguimiento')
    expect(screen.getByRole('tab', { name: 'Seguimiento' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('button', { name: 'Nueva tarea' })).toBeInTheDocument()
  })

  it('sin section abre Dashboard y no escribe section en la URL', () => {
    mount('clientId=client-a')
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'true')
    expect(params().get('section')).toBeNull()
    expect(params().get('clientId')).toBe('client-a')
  })

  it('un section desconocido cae en Métricas sin reescribir la URL', () => {
    mount('clientId=client-a&section=inventada&period=90d')
    expect(screen.getByRole('tab', { name: 'Métricas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Métricas existentes')).toBeInTheDocument()
    expect(params().get('section')).toBe('inventada')
    expect(params().get('period')).toBe('90d')
  })

  it('el cambio de pestaña escribe section y conserva el resto de parámetros, incluida la adherencia', () => {
    mount('clientId=client-a&section=metricas&date=2020-01-03&period=30d&historyPage=2&adherence_period=custom&adherence_start=2020-01-01&adherence_end=2020-01-10')
    openTab('Adherencia')
    expect(screen.getByRole('tab', { name: 'Adherencia' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Adherencia existente')).toBeInTheDocument()
    expect(Object.fromEntries(params())).toEqual({
      clientId: 'client-a', section: 'adherencia', date: '2020-01-03', period: '30d', historyPage: '2',
      adherence_period: 'custom', adherence_start: '2020-01-01', adherence_end: '2020-01-10',
    })
    openTab('Racha')
    expect(Object.fromEntries(params())).toMatchObject({
      section: 'racha', adherence_period: 'custom', adherence_start: '2020-01-01', adherence_end: '2020-01-10',
    })
  })

  it('el selector de periodo solo aparece en Métricas y Entrenamiento', () => {
    mount('clientId=client-a&section=metricas')
    expect(screen.getByRole('combobox', { name: 'Periodo de métricas y entrenamiento' })).toBeInTheDocument()
    expect(screen.getByText(/Se aplica a Métricas y Entrenamiento/)).toBeInTheDocument()
    openTab('Entrenamiento')
    expect(screen.getByRole('combobox', { name: 'Periodo de métricas y entrenamiento' })).toBeInTheDocument()
    openTab('Fotos')
    expect(screen.queryByRole('combobox', { name: 'Periodo de métricas y entrenamiento' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Se aplica a Métricas y Entrenamiento/)).not.toBeInTheDocument()
  })

  it('el selector de cliente reinicia fecha, paginación y ventana, y conserva la sección y el resto', () => {
    mount('clientId=client-a&section=racha&date=2020-01-03&period=90d&historyPage=4&trainingWindow=2&adherence_period=7d')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar cliente B/ }))
    const next = Object.fromEntries(params())
    expect(next).toMatchObject({ clientId: 'client-b', section: 'racha', historyPage: '1', trainingWindow: '0', period: '90d', adherence_period: '7d' })
    expect(next.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(next.date).not.toBe('2020-01-03')
  })
})

describe('Progreso (carcasa): sin cliente', () => {
  it('muestra el estado vacío, sin pestañas ni selector de periodo, y mantiene cabecera y selector', () => {
    mount('section=metricas')
    expect(screen.getByRole('heading', { level: 1, name: 'Progreso' })).toBeInTheDocument()
    expect(screen.getByText('Selecciona un cliente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Seleccionar cliente B \(ninguno\)/ })).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Periodo de métricas y entrenamiento' })).not.toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('elegir un cliente desde el estado vacío monta las pestañas', () => {
    mount('')
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar cliente B/ }))
    expect(params().get('clientId')).toBe('client-b')
    expect(screen.getByRole('tablist', { name: 'Secciones de progreso' })).toBeInTheDocument()
    expect(screen.queryByText('Selecciona un cliente')).not.toBeInTheDocument()
  })
})

describe('Progreso (carcasa): confirmación con una tarea en edición', () => {
  async function openDraft() {
    await screen.findByRole('button', { name: fixtureTask.title })
    fireEvent.click(screen.getByRole('button', { name: 'Nueva tarea' }))
    await screen.findByRole('option', { name: fixtureAssignee.display_name ?? '' })
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Borrador' } })
  }

  it('cancelar conserva pestaña, URL y borrador; aceptar cambia la pestaña y descarta el borrador', async () => {
    mount('clientId=client-a&section=seguimiento&period=30d')
    await openDraft()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Resumen', hidden: true }), { button: 0, ctrlKey: false })
    expect(await findConfirmDialog()).toHaveAccessibleName(DIRTY)
    await answerConfirmDialog('Cancelar')
    expect(params().get('section')).toBe('seguimiento')
    expect(screen.getByRole('tab', { name: 'Seguimiento', hidden: true })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Título')).toHaveValue('Borrador')

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Resumen', hidden: true }), { button: 0, ctrlKey: false })
    expect(await findConfirmDialog()).toHaveAccessibleName(DIRTY)
    await answerConfirmDialog('Aceptar')
    await waitFor(() => expect(params().get('section')).toBe('resumen'))
    expect(params().get('period')).toBe('30d')
    expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('el cambio de cliente con un borrador pide la misma confirmación', async () => {
    mount('clientId=client-a&section=seguimiento')
    await openDraft()
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar cliente B/, hidden: true }))
    expect(await findConfirmDialog()).toHaveAccessibleName(DIRTY)
    await answerConfirmDialog('Cancelar')
    expect(params().get('clientId')).toBe('client-a')
  })

  it('sin borrador la pestaña cambia al instante y sin pregunta', async () => {
    mount('clientId=client-a&section=seguimiento')
    await screen.findByRole('button', { name: 'Nueva tarea' })
    openTab('Racha')
    expect(params().get('section')).toBe('racha')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

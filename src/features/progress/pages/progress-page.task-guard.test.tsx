import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation, useSearchParams } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { answerConfirmDialog, findConfirmDialog } from '@/test/confirm-dialog'
import type { AuthUser } from '@/types/auth'
import { fixtureAssignee, fixturePage, fixtureSummary, fixtureTask } from '../follow-up-tasks/fixtures'
import { ProgressPage } from './progress-page'

// Regressions for the follow-up task editor's navigation guard (RDS-F2-U11 part D): the question is
// asked through ConfirmDialog, and every blocked navigation ends proceeding or reset, never pending.
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
  ClientSelector: ({ onSelect }: { onSelect: (id: string) => void }) => <button onClick={() => onSelect('client-b')}>Seleccionar cliente B</button>,
  EmptyClientState: () => <p>Selecciona un cliente</p>,
}))
vi.mock('../components/progress-dashboard', () => ({ ProgressDashboard: () => <p>Dashboard existente</p> }))
vi.mock('../components/progress-overview-cards', () => ({ ProgressOverviewCards: () => null }))
vi.mock('../components/progress-calendar', () => ({ ProgressCalendar: () => null }))
vi.mock('../components/day-progress-detail', () => ({ DayProgressDetail: () => null }))
vi.mock('../components/metrics-overview', () => ({ MetricsOverviewPanel: () => <p>Métricas existentes</p> }))
vi.mock('../components/metrics-table', () => ({ MetricsTable: () => null }))
vi.mock('../components/training-progress-panel', () => ({ TrainingProgressPanel: () => null }))
vi.mock('../components/streak-section', () => ({ StreakSection: () => null }))
vi.mock('../components/progress-photos-panel', () => ({ ProgressPhotosPanel: () => null }))
vi.mock('../../clients/components/client-adherence-tab', () => ({ ClientAdherenceTab: () => null }))

const DIRTY = '¿Descartar los cambios de esta tarea sin guardar?'
const FROZEN = 'El resultado del guardado es incierto. ¿Cerrar el borrador? Comprueba el listado antes de crear otra tarea.'
const staff: AuthUser = { id: 'synthetic-staff', email: 'staff@example.invalid', role: 'ADMIN', profile: null }
const envelope = (data: unknown) => ({ data: { success: true, data, timestamp: '2026-10-05T00:00:00Z' } })
/** Network failure without a response: the save result is uncertain and the editor freezes. */
const networkFailure = { isAxiosError: true, response: undefined }
const visited: string[] = []

function RouteProbe() {
  const [params] = useSearchParams()
  return <output aria-label="Ruta actual">{params.toString()}</output>
}
/** Records every committed location, to prove that an accepted change happens exactly once. */
function LocationLog() {
  const location = useLocation()
  useEffect(() => { visited.push(location.search) }, [location])
  return null
}
function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}
type Router = ReturnType<typeof createMemoryRouter>
function mountDataRouter(query: string) {
  const router = createMemoryRouter([
    { path: '/progress', element: <><ProgressPage /><RouteProbe /></> },
    { path: '/otra', element: <p>Otra página</p> },
  ], { initialEntries: [`/progress?${query}`] })
  render(<QueryClientProvider client={client()}><RouterProvider router={router} /></QueryClientProvider>)
  return router
}
function mountWithoutDataRouter(query: string) {
  render(<QueryClientProvider client={client()}><MemoryRouter initialEntries={[`/progress?${query}`]}>
    <ProgressPage /><RouteProbe /><LocationLog />
  </MemoryRouter></QueryClientProvider>)
}
function params() {
  return new URLSearchParams(screen.getByLabelText('Ruta actual').textContent ?? '')
}
/** No blocker is left `blocked` (pending) or `proceeding`. */
function settled(router: Router) {
  return [...router.state.blockers.values()].every((blocker) => blocker.state === 'unblocked')
}
async function navigate(router: Router, to: string) {
  await act(async () => { await router.navigate(to) })
}
async function openNewTask() {
  await screen.findByRole('button', { name: fixtureTask.title })
  fireEvent.click(screen.getByRole('button', { name: 'Nueva tarea' }))
  await screen.findByRole('option', { name: fixtureAssignee.display_name ?? '' })
  return screen.getByLabelText('Título')
}
async function openDraft() {
  const title = await openNewTask()
  fireEvent.change(title, { target: { value: 'Draft A' } })
  return title
}
async function openCompleteDraft() {
  const title = await openDraft()
  fireEvent.change(screen.getByLabelText('Responsable'), { target: { value: fixtureAssignee.id } })
  fireEvent.change(screen.getByLabelText('Fecha límite · UTC'), { target: { value: '2026-10-05' } })
  return title
}

beforeEach(() => {
  visited.length = 0
  useAuth.setState({ user: staff })
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset()
  api.get.mockImplementation((url: string) => Promise.resolve(envelope(
    url.endsWith('/follow-up-tasks/summary') ? fixtureSummary : url.endsWith('/follow-up-tasks/assignees') ? fixturePage([fixtureAssignee]) : fixturePage([fixtureTask]),
  )))
  api.post.mockResolvedValue(envelope(fixtureTask))
})

describe('Seguimiento: guarda de navegación con router de datos', () => {
  it('borrador sin guardar: pregunta y no navega; cancelar conserva ubicación, borrador y foco y la siguiente vuelve a preguntar', async () => {
    const router = mountDataRouter('clientId=client-a&section=seguimiento')
    const title = await openDraft()
    title.focus()
    await navigate(router, '/otra')
    expect(await findConfirmDialog()).toHaveAccessibleName(DIRTY)
    expect(router.state.location.pathname).toBe('/progress')
    expect(screen.getByLabelText('Título')).toHaveValue('Draft A')
    await answerConfirmDialog('Cancelar')
    expect(router.state.location.pathname).toBe('/progress')
    expect(params().get('clientId')).toBe('client-a')
    expect(params().get('section')).toBe('seguimiento')
    expect(screen.getByLabelText('Título')).toBe(title)
    expect(title).toHaveValue('Draft A')
    expect(title).toHaveFocus()
    expect(settled(router)).toBe(true)
    await navigate(router, '/otra')
    expect(await findConfirmDialog()).toHaveAccessibleName(DIRTY)
    expect(router.state.location.pathname).toBe('/progress')
  })

  it('aceptar completa la navegación bloqueada y el borrador se descarta como antes', async () => {
    const router = mountDataRouter('clientId=client-a&section=seguimiento')
    await openDraft()
    await navigate(router, '/otra')
    expect(await findConfirmDialog()).toHaveAccessibleName(DIRTY)
    await answerConfirmDialog('Aceptar')
    await waitFor(() => expect(router.state.location.pathname).toBe('/otra'))
    expect(screen.getByText('Otra página')).toBeInTheDocument()
    expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
    expect(settled(router)).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('editor limpio o cerrado: la navegación es inmediata y no hay pregunta', async () => {
    const router = mountDataRouter('clientId=client-a&section=seguimiento')
    await openNewTask()
    await navigate(router, '/progress?clientId=client-b&section=seguimiento')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(params().get('clientId')).toBe('client-b')
    await navigate(router, '/otra')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/otra')
    expect(settled(router)).toBe(true)
  })

  it('resultado incierto: pregunta con el texto de borrador congelado y no reenvía el guardado', async () => {
    api.post.mockRejectedValueOnce(networkFailure)
    const router = mountDataRouter('clientId=client-a&section=seguimiento')
    await openCompleteDraft()
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
    await screen.findByRole('button', { name: 'Reintentar mismo guardado' })
    await navigate(router, '/otra')
    expect(await findConfirmDialog()).toHaveAccessibleName(FROZEN)
    await answerConfirmDialog('Cancelar')
    expect(router.state.location.pathname).toBe('/progress')
    expect(screen.getByRole('button', { name: 'Reintentar mismo guardado' })).toBeInTheDocument()
    expect(settled(router)).toBe(true)
    await navigate(router, '/otra')
    expect(await findConfirmDialog()).toHaveAccessibleName(FROZEN)
    await answerConfirmDialog('Aceptar')
    await waitFor(() => expect(router.state.location.pathname).toBe('/otra'))
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it.each(['Aceptar', 'Cancelar'] as const)('dos navegaciones con la pregunta abierta: una sola pregunta y resultado coherente (%s)', async (answer) => {
    const router = mountDataRouter('clientId=client-a&section=seguimiento')
    await openDraft()
    await navigate(router, '/otra')
    await findConfirmDialog()
    await navigate(router, '/progress?clientId=client-b&section=seguimiento')
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(DIRTY)
    expect(router.state.location.pathname).toBe('/progress')
    expect(params().get('clientId')).toBe('client-a')
    await answerConfirmDialog(answer)
    if (answer === 'Aceptar') {
      // Like the app-wide UnsavedChangesGuard, the answer applies to the latest blocked navigation.
      await waitFor(() => expect(params().get('clientId')).toBe('client-b'))
      expect(router.state.location.pathname).toBe('/progress')
      expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
    } else {
      expect(params().get('clientId')).toBe('client-a')
      expect(screen.getByLabelText('Título')).toHaveValue('Draft A')
    }
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(settled(router)).toBe(true)
  })

  it('una respuesta que llega antes de que React confirme un cambio del router no lanza ni deja el bloqueo pendiente', async () => {
    const router = mountDataRouter('clientId=client-a&section=seguimiento')
    await openDraft()
    await navigate(router, '/otra')
    await findConfirmDialog()
    await act(async () => {
      // Inside one act scope React does not commit the router update, so the guard still renders
      // the blocked blocker while the router has already completed a non-leaving navigation and
      // returned every blocker to unblocked. The answer arrives in that window.
      await router.navigate('/progress?clientId=client-a&section=seguimiento&vista=lista')
      expect(settled(router)).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
      await new Promise<void>((resolve) => { setTimeout(resolve, 0) })
    })
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    // The navigation the question was about was already dropped by the router: nothing proceeds.
    expect(router.state.location.pathname).toBe('/progress')
    expect(params().get('vista')).toBe('lista')
    expect(settled(router)).toBe(true)
    await navigate(router, '/otra')
    expect(await findConfirmDialog()).toHaveAccessibleName(DIRTY)
    await answerConfirmDialog('Aceptar')
    await waitFor(() => expect(router.state.location.pathname).toBe('/otra'))
    expect(settled(router)).toBe(true)
  })

  it('editor desmontado con la pregunta abierta: la navegación se cancela y el bloqueo no queda pendiente', async () => {
    const router = mountDataRouter('clientId=client-a&section=seguimiento')
    await openDraft()
    await navigate(router, '/otra')
    await findConfirmDialog()
    act(() => { useAuth.setState({ user: { ...staff, id: 'other-staff' } }) })
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => expect(settled(router)).toBe(true))
    expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/progress')
    await navigate(router, '/otra')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/otra')
  })

  it('si empieza un guardado con la pregunta abierta, aceptar no navega y el bloqueo se resetea', async () => {
    let finish: (value: unknown) => void = () => undefined
    api.post.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const router = mountDataRouter('clientId=client-a&section=seguimiento')
    await openCompleteDraft()
    await navigate(router, '/otra')
    await findConfirmDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea', hidden: true }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    await answerConfirmDialog('Aceptar')
    expect(router.state.location.pathname).toBe('/progress')
    expect(settled(router)).toBe(true)
    await act(async () => { finish(envelope(fixtureTask)) })
    await waitFor(() => expect(screen.queryByLabelText('Título')).not.toBeInTheDocument())
    await navigate(router, '/otra')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/otra')
  })

  it('con un guardado en curso la navegación se rechaza sin pregunta, como antes', async () => {
    let finish: (value: unknown) => void = () => undefined
    api.post.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const router = mountDataRouter('clientId=client-a&section=seguimiento')
    await openCompleteDraft()
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    await navigate(router, '/otra')
    await waitFor(() => expect(settled(router)).toBe(true))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/progress')
    await act(async () => { finish(envelope(fixtureTask)) })
    await waitFor(() => expect(screen.queryByLabelText('Título')).not.toBeInTheDocument())
  })

  it('con la pregunta de cierre abierta, una navegación no apila otra pregunta ni queda bloqueada', async () => {
    const router = mountDataRouter('clientId=client-a&section=seguimiento')
    await openDraft()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
    expect(await findConfirmDialog()).toHaveAccessibleName('¿Descartar los cambios sin guardar?')
    await navigate(router, '/otra')
    await waitFor(() => expect(settled(router)).toBe(true))
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('¿Descartar los cambios sin guardar?')
    expect(router.state.location.pathname).toBe('/progress')
    await answerConfirmDialog('Cancelar')
    expect(screen.getByLabelText('Título')).toHaveValue('Draft A')
  })
})

describe('Seguimiento: guarda de controles de la página sin router de datos', () => {
  it('cambio de cliente: cancelar conserva cliente y borrador; aceptar cambia una sola vez', async () => {
    mountWithoutDataRouter('clientId=client-a&section=seguimiento')
    await openDraft()
    fireEvent.click(screen.getByText('Seleccionar cliente B'))
    expect(await findConfirmDialog()).toHaveAccessibleName(DIRTY)
    await answerConfirmDialog('Cancelar')
    expect(params().get('clientId')).toBe('client-a')
    expect(screen.getByLabelText('Título')).toHaveValue('Draft A')
    expect(visited).toHaveLength(1)
    fireEvent.click(screen.getByText('Seleccionar cliente B'))
    expect(await findConfirmDialog()).toHaveAccessibleName(DIRTY)
    await answerConfirmDialog('Aceptar')
    await waitFor(() => expect(params().get('clientId')).toBe('client-b'))
    expect(visited).toHaveLength(2)
    expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
    expect(params().get('section')).toBe('seguimiento')
  })

  it('cambio de sección: cancelar conserva la pestaña y el borrador; aceptar cambia una sola vez', async () => {
    mountWithoutDataRouter('clientId=client-a&section=seguimiento')
    await openDraft()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Resumen', hidden: true }), { button: 0, ctrlKey: false })
    expect(await findConfirmDialog()).toHaveAccessibleName(DIRTY)
    await answerConfirmDialog('Cancelar')
    expect(params().get('section')).toBe('seguimiento')
    expect(screen.getByRole('tab', { name: 'Seguimiento', hidden: true })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Título')).toHaveValue('Draft A')
    expect(visited).toHaveLength(1)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Resumen', hidden: true }), { button: 0, ctrlKey: false })
    expect(await findConfirmDialog()).toHaveAccessibleName(DIRTY)
    await answerConfirmDialog('Aceptar')
    await waitFor(() => expect(params().get('section')).toBe('resumen'))
    expect(visited).toHaveLength(2)
    expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
  })

  it('sin borrador, cliente y sección cambian en el mismo tick y sin pregunta', async () => {
    mountWithoutDataRouter('clientId=client-a&section=seguimiento')
    await openNewTask()
    fireEvent.click(screen.getByText('Seleccionar cliente B'))
    expect(params().get('clientId')).toBe('client-b')
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Resumen' }), { button: 0, ctrlKey: false })
    expect(params().get('section')).toBe('resumen')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(visited).toHaveLength(3)
  })
})

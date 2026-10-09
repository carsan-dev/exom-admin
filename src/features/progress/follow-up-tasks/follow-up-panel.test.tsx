import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { RecapsList } from '@/features/recaps/components/recaps-list'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { FollowUpPanel } from './follow-up-panel'
import { taskBase, taskError, taskKeys } from './api'
import { FIXTURE_IDS as ids, fixtureAssignee, fixturePage, fixtureSummary, fixtureTask } from './fixtures'
import { validCivilDate, type Task } from './types'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: '33333333-3333-4333-8333-333333333333' } })) }
})
const envelope = (data: unknown) => ({ data: { success: true, data, timestamp: '2026-10-05T00:00:00Z' } })
const failure = (status?: number, message = 'Server error') => ({ isAxiosError: true, response: status ? { status, data: { message } } : undefined })
let listed: Task[]
let client: QueryClient
const onGuard = vi.fn()
function mount(clientId: string = ids.client) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const node = (id: string) => <QueryClientProvider client={client}><MemoryRouter initialEntries={[`/progress?clientId=${id}&section=follow-up`]}><FollowUpPanel clientId={id} onGuard={onGuard} /></MemoryRouter></QueryClientProvider>
  const result = render(node(clientId))
  return { ...result, changeClient: (id: string) => result.rerender(node(id)) }
}
async function openNew() {
  await screen.findByRole('button', { name: fixtureTask.title })
  fireEvent.click(screen.getByRole('button', { name: 'Nueva tarea' }))
  await screen.findByRole('option', { name: fixtureAssignee.display_name ?? '' })
}
function fillNew() {
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Llamada sintética' } })
  fireEvent.change(screen.getByLabelText('Responsable'), { target: { value: ids.staff } })
  fireEvent.change(screen.getByLabelText('Fecha límite · UTC'), { target: { value: '2026-10-05' } })
}
async function openExisting() {
  fireEvent.click(await screen.findByRole('button', { name: listed[0].title }))
  await screen.findByRole('dialog')
}
beforeEach(() => {
  listed = [{ ...fixtureTask }]
  api.get.mockReset(); api.post.mockReset(); api.put.mockReset(); onGuard.mockReset()
  useAuth.setState({ user: { id: ids.staff, email: 'staff@example.invalid', role: 'ADMIN', profile: null } })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  api.get.mockImplementation((url: string, options?: { params?: { page?: number; view?: string } }) => {
    if (url.endsWith('/summary')) return Promise.resolve(envelope(fixtureSummary))
    if (url.endsWith('/assignees')) return Promise.resolve(envelope(fixturePage([fixtureAssignee], options?.params?.page ?? 1)))
    if (url.endsWith(ids.task)) return Promise.resolve(envelope({ ...fixtureTask, due_date: `${fixtureTask.due_date}T00:00:00.000Z`, version: 4, title: 'Título actual del servidor' }))
    return Promise.resolve(envelope(fixturePage(listed, options?.params?.page ?? 1, 21)))
  })
  api.post.mockResolvedValue(envelope(fixtureTask))
  api.put.mockResolvedValue(envelope(fixtureTask))
})

describe('Seguimiento: contratos y presentación', () => {
  it('consume envelope, resumen canónico independiente y fecha UTC del servidor; pagina sin fanout', async () => {
    mount()
    expect(await screen.findByText('Próxima tarea canónica, fuera de esta página · 2026-10-04 · Alta · Vencida')).toBeInTheDocument()
    expect(screen.getByText('Revisión canónica · 2026-10-05 · Alta')).toBeInTheDocument()
    expect(screen.getByText('Vencida')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith(taskBase(ids.client), expect.objectContaining({ params: { page: 1, view: 'active', limit: 20 } }))
    expect(api.get).toHaveBeenCalledWith(`${taskBase(ids.client)}/summary`, expect.objectContaining({ signal: expect.any(AbortSignal) }))
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(taskBase(ids.client), expect.objectContaining({ params: { page: 2, view: 'active', limit: 20 } })))
    fireEvent.change(screen.getByLabelText('Filtrar por responsable'), { target: { value: 'unassigned' } })
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(taskBase(ids.client), expect.objectContaining({ params: { page: 1, view: 'active', limit: 20, assigned_to_id: 'unassigned' } })))
    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'IN_PROGRESS' } })
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(taskBase(ids.client), expect.objectContaining({ params: expect.objectContaining({ status: 'IN_PROGRESS', page: 1 }) })))
    expect(api.get.mock.calls.some(([url]) => String(url).includes('admins'))).toBe(false)
  })
  it('muestra historial cerrado sin editar, completar o reabrir ni marcarlo vencido', async () => {
    listed = [{ ...fixtureTask, status: 'COMPLETED' }]
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }))
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(taskBase(ids.client), expect.objectContaining({ params: { page: 1, view: 'history', limit: 20 } })))
    await openExisting()
    expect(screen.getByLabelText('Título')).toBeDisabled()
    expect(screen.getByText(/no se puede editar ni reabrir/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completar tarea' })).not.toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
  })
  it('integra Recaps paginados por cliente con contexto de vuelta; conserva enlaces globales', async () => {
    const recap = { id: 'synthetic-recap', client_id: ids.client, week_start_date: '2026-10-05', week_end_date: '2026-10-11', submitted_at: '2026-10-12', created_at: '2026-10-05', status: 'SUBMITTED', archived_at: null, admin_comments: null, client: { id: ids.client, email: 'client@example.invalid', profile: null } }
    const prior = api.get.getMockImplementation()
    api.get.mockImplementation((url, options) => url === '/recaps' ? Promise.resolve(envelope({ data: [recap], total: 21, page: options.params.page, limit: 20, totalPages: 2 })) : prior?.(url, options))
    mount()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Recaps' }), { button: 0, ctrlKey: false })
    const link = await screen.findByRole('link', { name: 'Abrir' })
    expect(link.getAttribute('href')).toContain(`/recaps/synthetic-recap?returnTo=${encodeURIComponent(`/progress?clientId=${ids.client}&section=follow-up`)}`)
    expect(api.get).toHaveBeenCalledWith('/recaps', expect.objectContaining({ params: { page: 1, limit: 20, client_id: ids.client } }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/recaps', expect.objectContaining({ params: { page: 2, limit: 20, client_id: ids.client } })))
    expect(api.post).not.toHaveBeenCalled()
    render(<QueryClientProvider client={client}><MemoryRouter><RecapsList archived={false} page={1} onPageChange={vi.fn()} /></MemoryRouter></QueryClientProvider>)
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Abrir' }).some((item) => item.getAttribute('href') === '/recaps/synthetic-recap')).toBe(true))
  })
  it('separa cachés por cliente, identidad y filtros', () => {
    const filters = { page: 1, view: 'active' as const }
    expect(taskKeys.list(ids.staff, ids.client, filters)).not.toEqual(taskKeys.list(ids.staff, ids.otherClient, filters))
    expect(taskKeys.list(ids.staff, ids.client, filters)).not.toEqual(taskKeys.list(ids.otherStaff, ids.client, filters))
    expect(taskKeys.list(ids.staff, ids.client, filters)).not.toEqual(taskKeys.list(ids.staff, ids.client, { ...filters, page: 2 }))
  })
  it.each([401, 403, 404, 409, 423, undefined])('distingue error %s sin declarar guardado', (status) => {
    const errors = [401, 403, 404, 409, 423, undefined].map((code) => taskError(failure(code)))
    expect(new Set(errors).size).toBe(6)
    expect(taskError(failure(status))).not.toBe('Server error')
  })
})

describe('Seguimiento: editor y operaciones', () => {
  it('valida campos accesibles y crea con UUID estable, sin status/version/owner ni efectos extra', async () => {
    mount(); await openNew()
    expect(screen.getByLabelText('Título')).toBeRequired()
    const form = screen.getByLabelText('Título').closest('form')
    if (!form) throw new Error('Missing task form')
    fireEvent.submit(form)
    expect(await screen.findByRole('alert')).toHaveTextContent('título de 1 a 160')
    expect(api.post).not.toHaveBeenCalled()
    fillNew()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    expect(api.post).toHaveBeenCalledWith(taskBase(ids.client), {
      id: expect.stringMatching(/^[0-9a-f-]{36}$/), title: 'Llamada sintética', type: 'REVIEW', description: null,
      assigned_to_id: ids.staff, priority: 'MEDIUM', due_date: '2026-10-05',
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(invalidate).toHaveBeenCalledWith({ queryKey: taskKeys.scope(ids.staff, ids.client) })
    expect(api.put).not.toHaveBeenCalled()
  })
  it('elige responsable más allá de la primera página sin cargar páginas automáticamente', async () => {
    api.get.mockImplementation((url: string, options?: { params?: { page?: number } }) => Promise.resolve(envelope(
      url.endsWith('/assignees') ? fixturePage(options?.params?.page === 2 ? [{ id: ids.otherStaff, display_name: 'Otra profesional sintética' }] : [fixtureAssignee], options?.params?.page ?? 1, 21)
        : url.endsWith('/summary') ? fixtureSummary : fixturePage(listed),
    )))
    mount(); await openNew(); fillNew()
    expect(api.get.mock.calls.filter(([url, options]) => String(url).endsWith('/assignees') && options.params.page === 2)).toHaveLength(0)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cargar más responsables' }))
    await screen.findByRole('option', { name: 'Otra profesional sintética' })
    fireEvent.change(screen.getByLabelText('Responsable'), { target: { value: ids.otherStaff } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(taskBase(ids.client), expect.objectContaining({ assigned_to_id: ids.otherStaff })))
  })
  it('bloquea doble click y reintenta una respuesta perdida con exactamente el mismo UUID/payload', async () => {
    let reject: (reason: unknown) => void = () => undefined
    api.post.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail }))
    mount(); await openNew(); fillNew()
    const button = screen.getByRole('button', { name: 'Crear tarea' })
    fireEvent.click(button); fireEvent.click(button)
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    await act(async () => { reject(failure()) })
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo confirmar')
    expect(screen.getByLabelText('Título')).toBeDisabled()
    const first = api.post.mock.calls[0][1]
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar mismo guardado' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2))
    expect(api.post.mock.calls[1][1]).toEqual(first)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
  it.each([400, 403, 409])('respuesta perdida seguida de %s conserva el UUID/payload congelado', async (code) => {
    api.post.mockRejectedValueOnce(failure()).mockRejectedValueOnce(failure(code))
    mount(); await openNew(); fillNew()
    fireEvent.change(screen.getByLabelText('Descripción (opcional)'), { target: { value: '  Contexto original  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
    await screen.findByRole('button', { name: 'Reintentar mismo guardado' })
    const original = structuredClone(api.post.mock.calls[0][1])
    const priorGet = api.get.getMockImplementation()
    api.get.mockImplementation((url, options) => url === `${taskBase(ids.client)}/${original.id}`
      ? Promise.resolve(envelope({ ...fixtureTask, id: original.id })) : priorGet?.(url, options))
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar mismo guardado' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByRole('alert')).not.toHaveTextContent('No se pudo confirmar'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toBeDisabled()
    expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('  Contexto original  ')
    expect(screen.getByLabelText('Responsable')).toBeDisabled()
    expect(api.post.mock.calls[1][1]).toEqual(original)
    expect(original.description).toBe('Contexto original')
    const retry = screen.getByRole('button', { name: 'Reintentar mismo guardado' })
    if (code === 409) {
      expect(retry).toBeDisabled()
      expect(screen.getByRole('region', { name: 'Versión del servidor' })).toBeInTheDocument()
      // A UUID conflict is not proof the original create did not commit.
      fireEvent.click(retry)
      expect(api.post).toHaveBeenCalledTimes(2)
    } else {
      expect(retry).toBeEnabled()
      // Rights/validation recovered: only replay the original command, never a new UUID.
      fireEvent.click(retry)
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(api.post).toHaveBeenCalledTimes(3)
      expect(api.post.mock.calls[2][1]).toEqual(original)
    }
  })
  it('cerrar un resultado incierto advierte de posible aplicación y no crea otra tarea', async () => {
    api.post.mockRejectedValueOnce(failure())
    mount(); await openNew(); fillNew()
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
    await screen.findByRole('button', { name: 'Reintentar mismo guardado' })
    vi.mocked(window.confirm).mockReturnValueOnce(false)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
    expect(window.confirm).toHaveBeenLastCalledWith('El guardado puede haberse realizado. ¿Cerrar y comprobar el listado antes de crear otra tarea?')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.post).toHaveBeenCalledTimes(1)
  })
  it.each([
    ['create', 'pending'], ['create', 'rejected'],
    ['update', 'pending'], ['update', 'rejected'],
  ])('guardado confirmado %s cierra y restaura foco aunque refetch esté %s', async (operation, refetch) => {
    vi.mocked(window.confirm).mockClear()
    mount()
    const opener = await screen.findByRole('button', { name: operation === 'create' ? 'Nueva tarea' : fixtureTask.title })
    opener.focus(); fireEvent.click(opener)
    await screen.findByRole('option', { name: fixtureAssignee.display_name ?? '' })
    if (operation === 'create') fillNew()
    else fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Actualización confirmada' } })
    let rejectRefresh: (reason: unknown) => void = () => undefined
    const refresh = new Promise<void>((_resolve, reject) => { rejectRefresh = reject })
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockReturnValue(refresh)
    fireEvent.click(screen.getByRole('button', { name: operation === 'create' ? 'Crear tarea' : 'Guardar cambios' }))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: taskKeys.scope(ids.staff, ids.client) }))
    if (refetch === 'rejected') await act(async () => { rejectRefresh(failure(503)) })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(api.post).toHaveBeenCalledTimes(operation === 'create' ? 1 : 0)
    expect(api.put).toHaveBeenCalledTimes(operation === 'update' ? 1 : 0)
    expect(window.confirm).not.toHaveBeenCalled()
  })
  it.each(['client', 'identity', 'unmount'])('confirmación tardía tras %s no cierra un editor nuevo ni restaura foco antiguo', async (change) => {
    let finish: (value: unknown) => void = () => undefined
    api.post.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const view = mount()
    const oldOpener = screen.getByRole('button', { name: 'Nueva tarea' })
    await openNew(); fillNew()
    const oldFocus = vi.spyOn(oldOpener, 'focus')
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    if (change === 'client') view.changeClient(ids.otherClient)
    else if (change === 'identity') await act(async () => { useAuth.setState({ user: { id: ids.otherStaff, email: 'other@example.invalid', role: 'ADMIN', profile: null } }) })
    else view.unmount()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    if (change !== 'unmount') {
      await openNew()
      fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Nuevo propietario' } })
      await waitFor(() => expect(screen.getByLabelText('Título')).toHaveFocus())
    }
    oldFocus.mockClear()
    await act(async () => { finish(envelope(fixtureTask)) })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: taskKeys.scope(ids.staff, ids.client) })
    expect(oldFocus).not.toHaveBeenCalled()
    if (change !== 'unmount') {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByLabelText('Título')).toHaveValue('Nuevo propietario')
      expect(screen.getByLabelText('Título')).toHaveFocus()
    }
    expect(api.post).toHaveBeenCalledTimes(1)
  })
  it('edita con expected_version y fecha civil; inicio de progreso sin enviar responsable intacto', async () => {
    mount(); await openExisting()
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Borrador actualizado' } })
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'IN_PROGRESS' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`${taskBase(ids.client)}/${ids.task}`, {
      expected_version: 3, title: 'Borrador actualizado', type: 'REVIEW', description: fixtureTask.description,
      due_date: '2026-10-04', priority: 'HIGH', status: 'IN_PROGRESS',
    }))
  })
  it('conserva responsable antiguo no elegible; no lo ofrece para reasignar ni lo limpia', async () => {
    listed = [{ ...fixtureTask, assigned_to_id: ids.retained, assignee: { id: ids.retained, display_name: 'Profesional anterior' } }]
    mount(); await openExisting()
    expect(screen.getByLabelText('Responsable')).toHaveValue(ids.retained)
    expect(screen.getByRole('option', { name: /Profesional anterior · asignación conservada/ })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Solo cambia título' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
    expect(api.put.mock.calls[0][1]).not.toHaveProperty('assigned_to_id')
  })
  it('revocación al guardar conserva entradas y muestra permiso específico', async () => {
    api.post.mockRejectedValue(failure(403))
    mount(); await openNew(); fillNew()
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Permiso o responsable no disponible')
    expect(screen.getByLabelText('Título')).toHaveValue('Llamada sintética')
    expect(screen.getByLabelText('Responsable')).toHaveValue(ids.staff)
    expect(screen.getByLabelText('Título')).toBeEnabled()
  })
  it('409 conserva borrador y versión original; muestra servidor pero nunca autoadvance/overwrite', async () => {
    api.put.mockRejectedValue(failure(409))
    mount(); await openExisting()
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Mi borrador original' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Tu borrador se conserva')
    expect(await screen.findByText('Servidor: versión 4 · Pendiente')).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('Mi borrador original')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(api.put.mock.calls[0][1].expected_version).toBe(3)
    fireEvent.click(screen.getByRole('button', { name: 'Descartar borrador y cargar versión' }))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Descartar tu borrador'))
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Título actual del servidor'))
    expect(screen.getByLabelText('Fecha límite · UTC')).toHaveValue('2026-10-04')
    expect(api.put).toHaveBeenCalledTimes(1)
  })
  it('cancelación requiere confirmación secundaria; completar no envía mensajes ni modifica pautas', async () => {
    mount(); await openExisting()
    vi.mocked(window.confirm).mockReturnValueOnce(false)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar tarea' }))
    expect(api.put).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Completar tarea' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
    expect(api.put).toHaveBeenCalledWith(`${taskBase(ids.client)}/${ids.task}`, expect.objectContaining({ status: 'COMPLETED', expected_version: 3 }))
    expect(api.post).not.toHaveBeenCalled()
    expect(api.put.mock.calls.every(([url]) => String(url).includes('/follow-up-tasks/'))).toBe(true)
  })
  it('registración de guarda protege descarte de borrador y se elimina al cerrar', async () => {
    mount(); await openNew(); fillNew()
    const guard = onGuard.mock.calls[onGuard.mock.calls.length - 1]?.[0]
    vi.mocked(window.confirm).mockReturnValueOnce(false)
    expect(guard()).toBe(false)
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Descartar'))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onGuard).toHaveBeenLastCalledWith(null)
  })
  it('cambio de cliente desmonta el draft y una mutación tardía invalida solo su cliente original', async () => {
    let finish: (value: unknown) => void = () => undefined
    api.post.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const view = mount(); await openNew(); fillNew()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    view.changeClient(ids.otherClient)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await act(async () => { finish(envelope(fixtureTask)) })
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: taskKeys.scope(ids.staff, ids.client) }))
    expect(api.post.mock.calls[0][0]).toBe(taskBase(ids.client))
    expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: taskKeys.scope(ids.staff, ids.otherClient) })
  })
  it('una respuesta de listado anterior no aparece tras navegación de cliente', async () => {
    let finish: (value: unknown) => void = () => undefined
    api.get.mockImplementation((url: string) => {
      if (url === taskBase(ids.client)) return new Promise((resolve) => { finish = resolve })
      return Promise.resolve(envelope(url.endsWith('/summary') ? { ...fixtureSummary, next_task: null, next_review: null }
        : url.endsWith('/assignees') ? fixturePage([fixtureAssignee]) : fixturePage([])))
    })
    const view = mount()
    view.changeClient(ids.otherClient)
    await screen.findByText(/No hay tareas en esta página/)
    await act(async () => { finish(envelope(fixturePage([fixtureTask]))) })
    expect(screen.queryByRole('button', { name: fixtureTask.title })).not.toBeInTheDocument()
  })
  it('cambio de identidad no reutiliza el borrador ni el create ID', async () => {
    mount(); await openNew(); fillNew()
    api.post.mockRejectedValueOnce(failure())
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
    await screen.findByRole('button', { name: 'Reintentar mismo guardado' })
    await act(async () => { useAuth.setState({ user: { id: ids.otherStaff, email: 'other@example.invalid', role: 'ADMIN', profile: null } }) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.post).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Nueva tarea' }))
    expect(screen.getByLabelText('Título')).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Reintentar mismo guardado' })).not.toBeInTheDocument()
  })
  it('valida fechas civiles sin conversión de huso horario', () => {
    expect(validCivilDate('2026-10-05')).toBe(true)
    expect(validCivilDate('2026-02-30')).toBe(false)
    expect(validCivilDate('0000-01-01')).toBe(false)
    expect(validCivilDate('not-a-date')).toBe(false)
  })
})

describe('REST-T2E-FOCUS-01: cierre y propietario del foco', () => {
  beforeEach(() => { vi.mocked(window.confirm).mockClear() })
  it.each(['Nueva tarea', fixtureTask.title])('Escape restaura el opener %s tras el cierre diferido real', async (name) => {
    mount()
    await screen.findByRole('button', { name: fixtureTask.title })
    const opener = screen.getByRole('button', { name })
    opener.focus()
    fireEvent.click(opener)
    await screen.findByRole('dialog')
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveFocus())
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
  })
  it('cancelar descarte conserva draft/foco; aceptar Escape devuelve foco al opener', async () => {
    mount()
    const opener = screen.getByRole('button', { name: 'Nueva tarea' })
    opener.focus(); await openNew(); fillNew()
    const titleInput = screen.getByLabelText('Título')
    titleInput.focus()
    vi.mocked(window.confirm).mockReturnValueOnce(false)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(titleInput).toHaveValue('Llamada sintética')
    expect(titleInput).toHaveFocus()
    expect(api.post).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
  })
  it('crear con éxito devuelve foco al opener sin descartar el resultado', async () => {
    mount()
    const opener = screen.getByRole('button', { name: 'Nueva tarea' })
    opener.focus(); await openNew(); fillNew()
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
    expect(window.confirm).not.toHaveBeenCalled()
  })
  it('completar retira el opener y restaura Nueva tarea dentro del mismo cliente', async () => {
    api.put.mockImplementationOnce(() => {
      listed = []
      return Promise.resolve(envelope({ ...fixtureTask, status: 'COMPLETED' }))
    })
    mount()
    const opener = await screen.findByRole('button', { name: fixtureTask.title })
    opener.focus(); fireEvent.click(opener)
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Completar tarea' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nueva tarea' })).toHaveFocus())
    expect(api.put).toHaveBeenCalledTimes(1)
  })
  it('cargar versión tras conflicto no roba foco al editor reemplazado', async () => {
    api.put.mockRejectedValueOnce(failure(409))
    mount()
    const opener = await screen.findByRole('button', { name: fixtureTask.title })
    opener.focus(); fireEvent.click(opener)
    await screen.findByRole('dialog')
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Mi borrador' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText(/^Título actual del servidor ·/)
    const oldFocus = vi.spyOn(opener, 'focus')
    const closed = vi.fn()
    screen.getByRole('dialog').addEventListener('focusScope.autoFocusOnUnmount', closed, { once: true })
    fireEvent.click(screen.getByRole('button', { name: 'Descartar borrador y cargar versión' }))
    await waitFor(() => expect(closed).toHaveBeenCalledTimes(1))
    expect(oldFocus).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveFocus())
    expect(screen.getByLabelText('Título')).toHaveValue('Título actual del servidor')
  })
  it.each(['client', 'identity', 'unmount'])('cierre diferido por %s no enfoca un opener obsoleto', async (change) => {
    const view = mount()
    const navigation = render(<button>Destino de navegación</button>)
    const target = navigation.getByRole('button', { name: 'Destino de navegación' })
    const opener = screen.getByRole('button', { name: 'Nueva tarea' })
    opener.focus(); await openNew()
    const oldFocus = vi.spyOn(opener, 'focus')
    const closed = vi.fn()
    screen.getByRole('dialog').addEventListener('focusScope.autoFocusOnUnmount', closed, { once: true })
    if (change === 'client') view.changeClient(ids.otherClient)
    else if (change === 'identity') await act(async () => { useAuth.setState({ user: { id: ids.otherStaff, email: 'other@example.invalid', role: 'ADMIN', profile: null } }) })
    else view.unmount()
    target.focus()
    await waitFor(() => expect(closed).toHaveBeenCalledTimes(1))
    expect(oldFocus).not.toHaveBeenCalled()
    expect(target).toHaveFocus()
  })
  it('un panel oculto no recupera foco en su opener al cerrar', async () => {
    mount()
    const navigation = render(<button>Destino visible</button>)
    const target = navigation.getByRole('button', { name: 'Destino visible' })
    const opener = screen.getByRole('button', { name: 'Nueva tarea' })
    opener.focus(); await openNew()
    const oldFocus = vi.spyOn(opener, 'focus')
    const closed = vi.fn()
    screen.getByRole('dialog').addEventListener('focusScope.autoFocusOnUnmount', closed, { once: true })
    opener.closest('section')?.setAttribute('hidden', '')
    fireEvent.keyDown(document, { key: 'Escape' })
    target.focus()
    await waitFor(() => expect(closed).toHaveBeenCalledTimes(1))
    expect(oldFocus).not.toHaveBeenCalled()
    expect(target).toHaveFocus()
  })
})

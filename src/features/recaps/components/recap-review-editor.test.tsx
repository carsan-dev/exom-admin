import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { RecapReviewEditor } from './recap-review-editor'
import type { RecapReviewRecord } from '../types'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'staff' } })) }
})
const record: RecapReviewRecord = {
  id: 'recap', status: 'REVIEWED', reviewed_at: '2026-10-05', review_version: 3,
  draft_coach_summary: 'Borrador guardado', draft_changes: null, draft_next_week_goals: null,
  published_coach_summary: 'Último resumen publicado', published_changes: 'Cambios anteriores', published_next_week_goals: 'Objetivos anteriores',
}
const envelope = (data: unknown) => ({ data: { data } })
const dirty = vi.fn()
let server: RecapReviewRecord
beforeEach(() => {
  server = { ...record }
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset(); dirty.mockReset()
  useAuth.setState({ user: { id: 'staff', email: 'staff@example.invalid', role: 'ADMIN', profile: null } })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  api.get.mockImplementation(() => Promise.resolve(envelope(server)))
  api.put.mockImplementation((_url, body) => {
    server = { ...server, review_version: body.expected_version + 1, draft_coach_summary: body.coach_summary, draft_changes: body.changes, draft_next_week_goals: body.next_week_goals }
    return Promise.resolve(envelope(server))
  })
  api.post.mockImplementation(() => {
    if (server.review_version === undefined) throw new Error('Fixture must have a review version')
    return Promise.resolve(envelope({ ...server, review_version: server.review_version + 1, published_coach_summary: server.draft_coach_summary }))
  })
})
function mount(value = record) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const node = (recap: RecapReviewRecord) => <QueryClientProvider client={client}><RecapReviewEditor recap={recap} archived={false} onDirty={dirty} /></QueryClientProvider>
  const view = render(node(value))
  return { ...view, refresh: (recap: RecapReviewRecord) => view.rerender(node(recap)) }
}
function edit() { fireEvent.change(screen.getByLabelText('Resumen del coach · borrador privado'), { target: { value: 'Mi revisión nueva' } }) }
it('requires saving current fields, keeps old publication separate and cancellation never posts', async () => {
  mount(); edit()
  expect(screen.getByRole('button', { name: 'Publicar revisión' })).toBeDisabled()
  expect(screen.getByText('Último resumen publicado')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador privado' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar revisión' })).toBeEnabled())
  expect(api.put).toHaveBeenCalledWith('/recaps/recap/review-draft', { expected_version: 3, coach_summary: 'Mi revisión nueva', changes: null, next_week_goals: null })
  expect(api.post).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Publicar revisión' }))
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))
  expect(api.post).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Publicar revisión' }))
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirmar publicación' }))
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/recaps/recap/review-publish', { expected_version: 4, confirm: true }))
  expect(api.post).toHaveBeenCalledTimes(1)
})
it('editing after save invalidates publication eligibility; refresh never replaces dirty fields or version', async () => {
  const view = mount()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador privado' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar revisión' })).toBeEnabled())
  edit(); view.refresh({ ...record, review_version: 8, draft_coach_summary: 'Cambio remoto' })
  expect(screen.getByLabelText('Resumen del coach · borrador privado')).toHaveValue('Mi revisión nueva')
  expect(screen.getByRole('button', { name: 'Publicar revisión' })).toBeDisabled()
  expect(screen.getByText('Borrador: versión 4')).toBeInTheDocument()
  expect(dirty).toHaveBeenLastCalledWith(true)
})
it.each([409, 403, 500])('error %s preserves draft/version, reads server and requires explicit discard without another write', async (status) => {
  api.put.mockRejectedValue({ isAxiosError: true, response: { status, data: { message: 'No confirmado' } } })
  server = { ...record, review_version: 8, draft_coach_summary: 'Cambio remoto' }
  mount(); edit()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador privado' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Se conserva tu borrador')
  expect(await screen.findByText('Servidor: versión 8')).toBeInTheDocument()
  expect(screen.getByText('Borrador: versión 3')).toBeInTheDocument()
  expect(screen.getByLabelText('Resumen del coach · borrador privado')).toHaveValue('Mi revisión nueva')
  expect(screen.getByRole('button', { name: 'Publicar revisión' })).toBeDisabled()
  vi.mocked(window.confirm).mockReturnValueOnce(false)
  fireEvent.click(screen.getByRole('button', { name: 'Descartar borrador y cargar versión' }))
  expect(screen.getByLabelText('Resumen del coach · borrador privado')).toHaveValue('Mi revisión nueva')
  fireEvent.click(screen.getByRole('button', { name: 'Descartar borrador y cargar versión' }))
  expect(screen.getByLabelText('Resumen del coach · borrador privado')).toHaveValue('Cambio remoto')
  expect(api.put).toHaveBeenCalledTimes(1); expect(api.post).not.toHaveBeenCalled()
})
it('lost publication response freezes commands, keeps old preview and never retries POST', async () => {
  api.post.mockRejectedValue(new Error('Timeout'))
  mount(); edit()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador privado' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar revisión' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Publicar revisión' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar publicación' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Se conserva tu borrador')
  expect(screen.getByText('Último resumen publicado')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Guardar borrador privado' })).toBeDisabled()
  expect(api.post).toHaveBeenCalledTimes(1)
})
it('a failed server consultation preserves local values and permits only a read retry', async () => {
  api.put.mockRejectedValue({ isAxiosError: true, response: { status: 409 } })
  api.get.mockRejectedValueOnce(new Error('Read failed'))
  mount(); edit()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador privado' }))
  expect(await screen.findByRole('status')).toHaveTextContent('No se pudo consultar')
  expect(screen.getByLabelText('Resumen del coach · borrador privado')).toHaveValue('Mi revisión nueva')
  expect(screen.queryByRole('button', { name: 'Descartar borrador y cargar versión' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Consultar versión del servidor' }))
  expect(await screen.findByText('Servidor: versión 3')).toBeInTheDocument()
  expect(api.put).toHaveBeenCalledTimes(1); expect(api.post).not.toHaveBeenCalled()
})
it('publication conflict retains the saved local version and never overwrites newer server content', async () => {
  mount(); edit()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador privado' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar revisión' })).toBeEnabled())
  server = { ...server, review_version: 8, published_coach_summary: 'Publicación de otra profesional' }
  api.post.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } })
  fireEvent.click(screen.getByRole('button', { name: 'Publicar revisión' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar publicación' }))
  expect(await screen.findByText('Servidor: versión 8')).toBeInTheDocument()
  expect(screen.getByText('Borrador: versión 4')).toBeInTheDocument()
  expect(screen.getByLabelText('Resumen del coach · borrador privado')).toHaveValue('Mi revisión nueva')
  expect(api.post).toHaveBeenCalledTimes(1)
  expect(api.post.mock.calls[0][1]).toEqual({ expected_version: 4, confirm: true })
  fireEvent.click(screen.getByRole('button', { name: 'Descartar borrador y cargar versión' }))
  expect(screen.getByText('Publicación de otra profesional')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Publicar revisión' })).toBeDisabled()
})
it('unsent recap disables authoring with a submission explanation', () => {
  mount({ ...record, status: 'DRAFT' })
  expect(screen.getByLabelText('Resumen del coach · borrador privado')).toBeDisabled()
  expect(screen.getByText(/El cliente debe enviar el recap/)).toBeInTheDocument()
  expect(api.put).not.toHaveBeenCalled(); expect(api.post).not.toHaveBeenCalled()
})
it('late save across identity change cannot enable publication or clear dirty state', async () => {
  let finish: (value: unknown) => void = () => undefined
  api.put.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  mount(); edit()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador privado' }))
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
  await act(async () => { useAuth.setState({ user: null }); finish(envelope({ ...record, review_version: 4 })) })
  expect(api.post).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Publicar revisión' })).toBeDisabled()
})

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { UnsavedChangesGuard } from '@/components/layout/unsaved-changes-guard'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
import { RecapDetailPage } from './recap-detail-page'
import { recapsQueryKeys, recapIdentity } from '../api'
import type { RecapItem } from '../types'
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'staff' } })) }
})
const recap: RecapItem = {
  id: 'recap', client_id: 'client', status: 'REVIEWED', submitted_at: '2026-10-05', reviewed_at: '2026-10-05', archived_at: null,
  week_start_date: '2026-09-28', week_end_date: '2026-10-04', created_at: '2026-09-28', updated_at: '2026-10-05',
  training_effort: null, training_sessions: 2, training_progress: null, training_notes: null,
  nutrition_quality: null, food_quality: null, hydration_enabled: false, hydration_level: null, nutrition_notes: null,
  sleep_hours_range: null, fatigue_level: null, muscle_pain_zones: [], pain_intensity: null, recovery_notes: null,
  mood: null, stress_enabled: false, stress_level: null, general_notes: null,
  improvement_app_rating: null, improvement_service_rating: null, improvement_areas: [], improvement_feedback_text: null,
  admin_comments: 'Nota guardada', client_feedback_text: 'Feedback guardado', client_feedback_sent_at: '2026-10-05', client_feedback_read_at: null,
  review_version: 3, draft_coach_summary: 'Borrador inicial', draft_changes: null, draft_next_week_goals: null,
  published_coach_summary: 'Publicado anterior', published_changes: null, published_next_week_goals: null,
  client: { id: 'client', email: 'client@example.invalid', profile: { first_name: 'Cliente', last_name: 'Sintético' } },
}
const envelope = (data: unknown) => ({ data: { data } })
beforeEach(() => {
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset()
  useAuth.setState({ user: { id: 'staff', email: 'staff@example.invalid', role: 'ADMIN', profile: null } })
  useUnsavedChangesStore.setState({ dirtyEditors: {}, hasUnsavedChanges: false })
  api.get.mockResolvedValue(envelope(recap))
  const { client: relation, ...scalarRow } = recap
  expect(relation.id).toBe('client')
  // Prisma legacy mutations return a scalar row, unlike the authorized detail.
  api.put.mockResolvedValue(envelope({ ...scalarRow, admin_comments: 'Nota nueva', client_feedback_text: 'Feedback nuevo' }))
})
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter([
    { path: '/recaps/:id', element: <><UnsavedChangesGuard /><RecapDetailPage /></> },
    { path: '/progress', element: <p>Seguimiento destino</p> },
  ], { initialEntries: ['/progress?clientId=client&section=follow-up', `/recaps/recap?returnTo=${encodeURIComponent('/progress?clientId=client&section=follow-up')}`], initialIndex: 1 })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
  return { client, router }
}
it('legacy review retains endpoint/body and sent semantics independently of publication', async () => {
  mount()
  await screen.findByText('Cliente Sintético', { selector: 'h1' })
  expect(screen.getByText(/Pendiente de lectura/)).toBeInTheDocument()
  // Hold the subsequent refresh: the mutation response must preserve detail identity.
  api.get.mockImplementation(() => new Promise(() => undefined))
  fireEvent.change(screen.getByPlaceholderText('Escribe un comentario que verá el cliente en su recap...'), { target: { value: 'Feedback nuevo' } })
  fireEvent.change(screen.getByPlaceholderText('Notas internas que nunca se comparten con el cliente...'), { target: { value: 'Nota nueva' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/recaps/recap/review', { admin_comments: 'Nota nueva', client_feedback_text: 'Feedback nuevo' }))
  expect(api.post).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Cliente Sintético' })).toBeInTheDocument())
  await waitFor(() => expect(screen.getByPlaceholderText('Notas internas que nunca se comparten con el cliente...')).toHaveValue('Nota nueva'))
})
it('saves legacy feedback independently while retaining a dirty private review draft', async () => {
  mount()
  await screen.findByText('Cliente Sintético', { selector: 'h1' })
  api.get.mockImplementation(() => new Promise(() => undefined))
  fireEvent.change(screen.getByLabelText('Resumen del coach · borrador privado'), { target: { value: 'Resumen privado local' } })
  fireEvent.change(screen.getByPlaceholderText('Escribe un comentario que verá el cliente en su recap...'), { target: { value: 'Feedback nuevo' } })
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/recaps/recap/review', { admin_comments: 'Nota guardada', client_feedback_text: 'Feedback nuevo' }))
  expect(screen.getByLabelText('Resumen del coach · borrador privado')).toHaveValue('Resumen privado local')
  expect(screen.getByRole('button', { name: 'Imprimir / Guardar PDF' })).toBeDisabled()
  expect(api.post).not.toHaveBeenCalled()
})
it('query refresh preserves both dirty drafts and print gating; browser back cancellation keeps edits', async () => {
  const { client, router } = mount()
  await screen.findByText('Cliente Sintético', { selector: 'h1' })
  fireEvent.change(screen.getByPlaceholderText('Notas internas que nunca se comparten con el cliente...'), { target: { value: 'Nota local' } })
  fireEvent.change(screen.getByLabelText('Resumen del coach · borrador privado'), { target: { value: 'Resumen local' } })
  await act(async () => { client.setQueryData(recapsQueryKeys.detail('recap', recapIdentity()), { ...recap, admin_comments: 'Remota', review_version: 9, draft_coach_summary: 'Remoto' }) })
  expect(screen.getByPlaceholderText('Notas internas que nunca se comparten con el cliente...')).toHaveValue('Nota local')
  expect(screen.getByLabelText('Resumen del coach · borrador privado')).toHaveValue('Resumen local')
  expect(screen.getByRole('button', { name: 'Imprimir / Guardar PDF' })).toBeDisabled()
  expect(document.getElementById('recap-print-report')?.textContent).toContain('Publicado anterior')
  await act(async () => { await router.navigate(-1) })
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Permanecer' }))
  expect(screen.getByLabelText('Resumen del coach · borrador privado')).toHaveValue('Resumen local')
  expect(screen.getByPlaceholderText('Notas internas que nunca se comparten con el cliente...')).toHaveValue('Nota local')
  fireEvent.click(screen.getByRole('link', { name: 'Volver a seguimiento' }))
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Permanecer' }))
})
it('failed background refresh keeps both editors mounted with their local drafts', async () => {
  const { client } = mount()
  await screen.findByText('Cliente Sintético', { selector: 'h1' })
  fireEvent.change(screen.getByPlaceholderText('Notas internas que nunca se comparten con el cliente...'), { target: { value: 'Nota local' } })
  fireEvent.change(screen.getByLabelText('Resumen del coach · borrador privado'), { target: { value: 'Resumen local' } })
  api.get.mockRejectedValueOnce(new Error('Refresh failed'))
  await act(async () => { await client.invalidateQueries({ queryKey: recapsQueryKeys.detail('recap', recapIdentity()) }) })
  expect(await screen.findByText('No se pudo actualizar el recap. Se conservan tus cambios.')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Notas internas que nunca se comparten con el cliente...')).toHaveValue('Nota local')
  expect(screen.getByLabelText('Resumen del coach · borrador privado')).toHaveValue('Resumen local')
  expect(screen.getByRole('button', { name: 'Imprimir / Guardar PDF' })).toBeDisabled()
  expect(api.put).not.toHaveBeenCalled(); expect(api.post).not.toHaveBeenCalled()
})
it('lost legacy feedback response freezes repeat saves and retains both private inputs', async () => {
  api.put.mockRejectedValueOnce(new Error('Timeout'))
  mount()
  await screen.findByText('Cliente Sintético', { selector: 'h1' })
  fireEvent.change(screen.getByPlaceholderText('Notas internas que nunca se comparten con el cliente...'), { target: { value: 'Nota local' } })
  fireEvent.change(screen.getByPlaceholderText('Escribe un comentario que verá el cliente en su recap...'), { target: { value: 'Feedback local' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Se conservan tus comentarios')
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  expect(screen.getByPlaceholderText('Notas internas que nunca se comparten con el cliente...')).toHaveValue('Nota local')
  expect(screen.getByPlaceholderText('Escribe un comentario que verá el cliente en su recap...')).toHaveValue('Feedback local')
  fireEvent.click(screen.getByRole('button', { name: 'Consultar comentarios guardados' }))
  expect(await screen.findByText('Comentario guardado: Feedback guardado')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Escribe un comentario que verá el cliente en su recap...')).toHaveValue('Feedback local')
  expect(api.put).toHaveBeenCalledTimes(1); expect(api.post).not.toHaveBeenCalled()
})
it('client route change and identity changes never render previous private drafts', async () => {
  const { router } = mount()
  await screen.findByText('Cliente Sintético', { selector: 'h1' })
  await act(async () => { useAuth.setState({ user: null }) })
  expect(screen.queryByDisplayValue('Borrador inicial')).not.toBeInTheDocument()
  expect(document.getElementById('recap-print-report')).toBeNull()
  api.get.mockResolvedValue(envelope({ ...recap, id: 'other', client_id: 'other-client', admin_comments: 'Otra nota', draft_coach_summary: 'Otro borrador' }))
  await act(async () => { useAuth.setState({ user: { id: 'other-staff', email: 'other@example.invalid', role: 'ADMIN', profile: null } }); await router.navigate('/recaps/other') })
  expect(await screen.findByDisplayValue('Otro borrador')).toBeInTheDocument()
  expect(screen.queryByDisplayValue('Nota guardada')).not.toBeInTheDocument()
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
import { recapIdentity, recapsQueryKeys } from '../api'
import type { RecapItem } from '../types'
import { RecapDetailPage } from './recap-detail-page'

// Characterization of the recap detail DOM. The snapshots were recorded before
// extracting the view into components and must not change afterwards.

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'staff' } })) }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const baseRecap: RecapItem = {
  id: 'recap',
  client_id: 'client',
  status: 'REVIEWED',
  submitted_at: '2026-10-05T12:00:00Z',
  reviewed_at: '2026-10-06T12:00:00Z',
  archived_at: null,
  week_start_date: '2026-09-28T12:00:00Z',
  week_end_date: '2026-10-04T12:00:00Z',
  created_at: '2026-09-28T12:00:00Z',
  updated_at: '2026-10-05T12:00:00Z',
  training_effort: 7,
  training_sessions: 4,
  average_daily_steps: 9500,
  training_progress: 'IMPROVING',
  training_notes: 'Buen ritmo',
  nutrition_quality: 'GOOD',
  food_quality: 8,
  hydration_enabled: true,
  hydration_level: 'GOOD',
  nutrition_notes: null,
  sleep_hours_range: 'SEVEN_TO_EIGHT',
  fatigue_level: 'MODERATE',
  muscle_pain_zones: ['LEGS', 'BACK'],
  pain_intensity: 'MILD',
  recovery_notes: 'Algo de cansancio',
  mood: 'GOOD',
  stress_enabled: true,
  stress_level: 4,
  hunger_level: 5,
  energy_level: 7,
  digestion_level: 8,
  general_notes: null,
  improvement_app_rating: 9,
  improvement_service_rating: 10,
  improvement_areas: ['APP_SPEED', 'CONTENT'],
  improvement_feedback_text: 'Todo bien',
  admin_comments: 'Nota guardada',
  client_feedback_text: 'Feedback guardado',
  client_feedback_sent_at: '2026-10-06T12:00:00Z',
  client_feedback_read_at: null,
  review_version: 3,
  draft_coach_summary: null,
  draft_changes: null,
  draft_next_week_goals: null,
  published_coach_summary: null,
  published_changes: null,
  published_next_week_goals: null,
  client: { id: 'client', email: 'client@example.invalid', profile: { first_name: 'Cliente', last_name: 'Sintético' } },
} as RecapItem

const submitted = {
  ...baseRecap,
  status: 'SUBMITTED',
  reviewed_at: null,
  admin_comments: null,
  client_feedback_text: null,
  client_feedback_sent_at: null,
  review_version: 0,
} as RecapItem
const withDraft = {
  ...baseRecap,
  review_version: 4,
  draft_coach_summary: 'Resumen en borrador',
  draft_changes: 'Cambios en borrador',
  draft_next_week_goals: 'Objetivos en borrador',
} as RecapItem
const manyVersions = {
  ...withDraft,
  review_version: 12,
  published_coach_summary: 'Resumen publicado',
  published_changes: 'Cambios publicados',
  published_next_week_goals: 'Objetivos publicados',
} as RecapItem

const envelope = (data: unknown) => ({ data: { data } })
const never = () => new Promise(() => undefined)

function normalize(html: string) {
  return html
    .replace(/radix-[^"\s]*/g, 'radix-ID')
    .replace(/ style="(animation-duration: 0s;)?"/g, '')
    .replace(/[«:]r[0-9a-z]+[»:]/g, 'ID')
    .replace(/></g, '>\n<')
}
const snap = () => normalize(document.body.innerHTML)

const TEXT_FEEDBACK = 'Escribe un comentario que verá el cliente en su recap...'
const TEXT_NOTE = 'Notas internas que nunca se comparten con el cliente...'
const returnTo = (value: string) => `?returnTo=${encodeURIComponent(value)}`

function mount(recap: RecapItem | 'loading' | 'error' = baseRecap, search = '') {
  if (recap === 'loading') api.get.mockImplementation(never)
  else if (recap === 'error') api.get.mockRejectedValue(Object.assign(new Error('boom')))
  else api.get.mockResolvedValue(envelope(recap))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/recaps/recap${search}`]}>
        <Routes>
          <Route path="/recaps/:id" element={<RecapDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { client, ...view }
}
const ready = () => screen.findByText('Cliente Sintético', { selector: 'h1' })

beforeEach(() => {
  api.get.mockReset()
  api.put.mockReset()
  api.post.mockReset()
  useAuth.setState({ user: { id: 'staff', email: 'staff@example.invalid', role: 'ADMIN', profile: null } })
  useUnsavedChangesStore.setState({ dirtyEditors: {}, hasUnsavedChanges: false })
  window.print = vi.fn()
})

describe('RecapDetailPage characterization', () => {
  it('SUBMITTED pending review', async () => {
    mount(submitted)
    await ready()
    expect(snap()).toMatchSnapshot()
  })

  it('REVIEWED', async () => {
    mount()
    await ready()
    expect(snap()).toMatchSnapshot()
  })

  it('REVIEWED with a private review draft', async () => {
    mount(withDraft)
    await ready()
    expect(snap()).toMatchSnapshot()
  })

  it('REVIEWED archived', async () => {
    mount({ ...baseRecap, archived_at: '2026-10-10T12:00:00Z' } as RecapItem)
    await ready()
    expect(snap()).toMatchSnapshot()
  })

  it('DRAFT status', async () => {
    mount({ ...baseRecap, status: 'DRAFT', submitted_at: null, reviewed_at: null } as RecapItem)
    await ready()
    expect(snap()).toMatchSnapshot()
  })

  it('several versions with draft and published review', async () => {
    mount(manyVersions)
    await ready()
    expect(snap()).toMatchSnapshot()
  })

  it('review version unavailable', async () => {
    mount({ ...baseRecap, review_version: undefined } as unknown as RecapItem)
    await ready()
    expect(snap()).toMatchSnapshot()
  })

  it('version conflict: remote version moves ahead of the editor', async () => {
    const { client } = mount(withDraft)
    await ready()
    await act(async () => {
      client.setQueryData(recapsQueryKeys.detail('recap', recapIdentity()), { ...withDraft, review_version: 9 })
    })
    await screen.findByText(/La revisión cambió/)
    expect(snap()).toMatchSnapshot()
  })

  it('draft editor error then server version read', async () => {
    mount(withDraft)
    await ready()
    api.put.mockRejectedValueOnce(new Error('Timeout'))
    api.get.mockResolvedValue(envelope({ ...withDraft, review_version: 5, draft_coach_summary: 'Resumen del servidor' }))
    fireEvent.change(screen.getByLabelText('Resumen del coach · borrador privado'), { target: { value: 'Local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador privado' }))
    await screen.findByText('Servidor: versión 5')
    expect(snap()).toMatchSnapshot()
  })

  it('draft editor saved enables the publish confirmation dialog', async () => {
    mount(withDraft)
    await ready()
    api.put.mockResolvedValue(envelope({ ...withDraft, review_version: 5, draft_coach_summary: 'Local' }))
    fireEvent.change(screen.getByLabelText('Resumen del coach · borrador privado'), { target: { value: 'Local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador privado' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar revisión' })).toBeEnabled())
    await userEvent.click(screen.getByRole('button', { name: 'Publicar revisión' }))
    await screen.findByRole('alertdialog')
    expect(snap()).toMatchSnapshot()
  })

  it('legacy review with unsaved edits disables print and archive', async () => {
    mount()
    await ready()
    fireEvent.change(screen.getByPlaceholderText(TEXT_FEEDBACK), { target: { value: 'Feedback nuevo' } })
    fireEvent.change(screen.getByPlaceholderText(TEXT_NOTE), { target: { value: 'Nota nueva' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir / Guardar PDF' })).toBeDisabled())
    expect(snap()).toMatchSnapshot()
  })

  it('legacy review lost response then saved server comment', async () => {
    api.put.mockRejectedValueOnce(new Error('Timeout'))
    mount()
    await ready()
    fireEvent.change(screen.getByPlaceholderText(TEXT_FEEDBACK), { target: { value: 'Feedback local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText(/Se conservan tus comentarios/)
    expect(snap()).toMatchSnapshot('after error')
    fireEvent.click(screen.getByRole('button', { name: 'Consultar comentarios guardados' }))
    await screen.findByText('Comentario guardado: Feedback guardado')
    expect(snap()).toMatchSnapshot('server comment')
  })

  it('legacy review discard confirmation dialog', async () => {
    api.put.mockRejectedValueOnce(new Error('Timeout'))
    mount()
    await ready()
    fireEvent.change(screen.getByPlaceholderText(TEXT_FEEDBACK), { target: { value: 'Feedback local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText(/Se conservan tus comentarios/)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar comentarios guardados' }))
    await screen.findByText('Comentario guardado: Feedback guardado')
    await userEvent.click(screen.getByRole('button', { name: 'Descartar comentarios y cargar guardados' }))
    await screen.findByRole('alertdialog')
    expect(snap()).toMatchSnapshot()
  })

  it('archive confirmation dialog open', async () => {
    mount()
    await ready()
    await userEvent.click(screen.getByRole('button', { name: 'Archivar recap' }))
    await screen.findByRole('alertdialog')
    expect(snap()).toMatchSnapshot()
  })

  it('archive in progress', async () => {
    mount()
    await ready()
    api.put.mockImplementation(never)
    await userEvent.click(screen.getByRole('button', { name: 'Archivar recap' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Archivar' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/recaps/recap/archive'))
    expect(snap()).toMatchSnapshot()
  })

  it('print button calls window.print', async () => {
    mount()
    await ready()
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir / Guardar PDF' }))
    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('background refresh failure keeps the data and shows the retry banner', async () => {
    const { client } = mount()
    await ready()
    api.get.mockRejectedValueOnce(new Error('Refresh failed'))
    await act(async () => {
      await client.invalidateQueries({ queryKey: recapsQueryKeys.detail('recap', recapIdentity()) })
    })
    await screen.findByText('No se pudo actualizar el recap. Se conservan tus cambios.')
    expect(snap()).toMatchSnapshot()
  })

  it('loading', async () => {
    mount('loading')
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(snap()).toMatchSnapshot()
  })

  it('error without returnTo', async () => {
    mount('error')
    await screen.findByText('Error al cargar el recap')
    expect(snap()).toMatchSnapshot()
  })

  it('error with progress returnTo', async () => {
    mount('error', returnTo('/progress?clientId=client&section=follow-up'))
    await screen.findByText('Error al cargar el recap')
    expect(snap()).toMatchSnapshot()
  })

  it('with progress returnTo', async () => {
    mount(baseRecap, returnTo('/progress?clientId=client&section=follow-up'))
    await ready()
    expect(snap()).toMatchSnapshot()
  })

  it('with a returnTo outside progress falls back to recaps', async () => {
    mount(baseRecap, returnTo('/clients'))
    await ready()
    expect(screen.getByRole('link', { name: 'Volver a recaps' })).toHaveAttribute('href', '/recaps')
  })

  it('signed out', async () => {
    useAuth.setState({ user: null })
    mount()
    expect(snap()).toMatchSnapshot()
  })

  it.each([
    ['nutrition', 'Nutrición'],
    ['recovery', 'Recuperación'],
    ['general', 'General'],
    ['improvement', 'Mejora'],
  ])('tab %s', async (_key, label) => {
    mount()
    await ready()
    await userEvent.click(screen.getByRole('tab', { name: label }))
    await waitFor(() => expect(screen.getByRole('tab', { name: label })).toHaveAttribute('data-state', 'active'))
    expect(snap()).toMatchSnapshot()
  })

  it('tabs with empty lists', async () => {
    mount({ ...baseRecap, muscle_pain_zones: [], improvement_areas: [], average_daily_steps: null } as RecapItem)
    await ready()
    expect(snap()).toMatchSnapshot('training')
    await userEvent.click(screen.getByRole('tab', { name: 'Recuperación' }))
    await waitFor(() => expect(screen.getAllByText('Sin zonas reportadas.').length).toBeGreaterThan(0))
    expect(snap()).toMatchSnapshot('recovery')
    await userEvent.click(screen.getByRole('tab', { name: 'Mejora' }))
    await waitFor(() => expect(screen.getAllByText('Sin áreas destacadas.').length).toBeGreaterThan(0))
    expect(snap()).toMatchSnapshot('improvement')
  })
})

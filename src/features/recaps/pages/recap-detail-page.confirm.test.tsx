import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { UnsavedChangesGuard } from '@/components/layout/unsaved-changes-guard'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
import { RecapDetailPage } from './recap-detail-page'
import type { RecapItem } from '../types'

// Setup copied from recap-detail-page.test.tsx (that file is left untouched).
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
const QUESTION = 'Descartar tus comentarios locales y cargar los guardados?'
const NOTE = 'Notas internas que nunca se comparten con el cliente...'
const FEEDBACK = 'Escribe un comentario que verá el cliente en su recap...'

beforeEach(() => {
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset()
  useAuth.setState({ user: { id: 'staff', email: 'staff@example.invalid', role: 'ADMIN', profile: null } })
  useUnsavedChangesStore.setState({ dirtyEditors: {}, hasUnsavedChanges: false })
  api.get.mockResolvedValue(envelope(recap))
  api.put.mockRejectedValueOnce(new Error('Timeout'))
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

/** Reaches the legacy recovery state: lost save response, then the saved version is fetched. */
async function reachLegacyRecovery() {
  mount()
  await screen.findByText('Cliente Sintético', { selector: 'h1' })
  fireEvent.change(screen.getByPlaceholderText(NOTE), { target: { value: 'Nota local' } })
  fireEvent.change(screen.getByPlaceholderText(FEEDBACK), { target: { value: 'Feedback local' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Se conservan tus comentarios')
  fireEvent.click(screen.getByRole('button', { name: 'Consultar comentarios guardados' }))
  expect(await screen.findByText('Comentario guardado: Feedback guardado')).toBeInTheDocument()
}

describe('RecapDetailPage discard local comments confirmation', () => {
  it('asks with the exact text and loads the saved comments only after acceptance', async () => {
    const user = userEvent.setup()
    await reachLegacyRecovery()

    await user.click(screen.getByRole('button', { name: 'Descartar comentarios y cargar guardados' }))
    expect(screen.getByRole('alertdialog', { name: QUESTION })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(NOTE)).toHaveValue('Nota local')

    await user.click(screen.getByRole('button', { name: 'Aceptar' }))

    await waitFor(() => expect(screen.getByPlaceholderText(NOTE)).toHaveValue('Nota guardada'))
    expect(screen.getByPlaceholderText(FEEDBACK)).toHaveValue('Feedback guardado')
    expect(screen.queryByText('Comentario guardado: Feedback guardado')).not.toBeInTheDocument()
    expect(screen.queryByText(/Se conservan tus comentarios/)).not.toBeInTheDocument()
    expect(api.put).toHaveBeenCalledTimes(1); expect(api.post).not.toHaveBeenCalled()
  })

  it('cancelling keeps the local comments and the recovery state', async () => {
    const user = userEvent.setup()
    await reachLegacyRecovery()

    await user.click(screen.getByRole('button', { name: 'Descartar comentarios y cargar guardados' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByPlaceholderText(NOTE)).toHaveValue('Nota local')
    expect(screen.getByPlaceholderText(FEEDBACK)).toHaveValue('Feedback local')
    expect(screen.getByText('Comentario guardado: Feedback guardado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descartar comentarios y cargar guardados' })).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledTimes(1); expect(api.post).not.toHaveBeenCalled()
  })

  it('an identity change while the question is open discards the question and applies nothing', async () => {
    const user = userEvent.setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await reachLegacyRecovery()

    await user.click(screen.getByRole('button', { name: 'Descartar comentarios y cargar guardados' }))
    expect(screen.getByRole('alertdialog', { name: QUESTION })).toBeInTheDocument()

    await act(async () => { useAuth.setState({ user: null }) })

    expect(screen.queryByRole('alertdialog', { name: QUESTION })).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Nota guardada')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Inicia sesión para consultar el recap.')
    expect(api.put).toHaveBeenCalledTimes(1); expect(api.post).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

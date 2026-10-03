import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RecapItem } from '../types'
import { RecapDetailPage } from '../pages/recap-detail-page'
import { RecapPrintableSummary } from './recap-printable-summary'
import { toRecapPrintModel } from './recap-print-model'

const { query } = vi.hoisted(() => ({ query: { data: undefined as RecapItem | undefined } }))
vi.mock('../api', () => ({
  useRecapDetail: () => ({ ...query, isLoading: false, isError: false }),
  useReviewRecap: () => ({ isPending: false, mutate: vi.fn() }),
  useArchiveRecap: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock('@/hooks/use-unsaved-changes', () => ({ useUnsavedChanges: vi.fn() }))

const longAnswer = `Primera línea\nSegunda línea ${'respuesta extensa '.repeat(400)}`
function fixture(overrides: Partial<RecapItem> = {}): RecapItem {
  return {
    id: 'fake-recap', client_id: 'fake-client', status: 'SUBMITTED',
    week_start_date: '2026-09-21', week_end_date: '2026-09-27',
    submitted_at: '2026-09-28T12:00:00Z', created_at: '2026-09-21T12:00:00Z',
    updated_at: '2026-09-28T12:00:00Z', reviewed_at: null, archived_at: null,
    training_effort: null, training_sessions: 0, average_daily_steps: 1234,
    training_progress: 'MUY_BUENO', training_notes: longAnswer,
    nutrition_quality: null, food_quality: 8, hydration_enabled: true,
    hydration_level: null, nutrition_notes: null, sleep_hours_range: null,
    fatigue_level: null, muscle_pain_zones: ['ESPALDA'], pain_intensity: null,
    recovery_notes: null, mood: null, stress_enabled: false, stress_level: null,
    hunger_level: 3, energy_level: 7, digestion_level: null, general_notes: null,
    improvement_app_rating: 9, improvement_service_rating: 10,
    improvement_areas: ['COMUNICACION'], improvement_feedback_text: 'Comentario sintético',
    admin_comments: 'PRIVATE_INTERNAL_SENTINEL', client_feedback_text: 'DRAFT_FEEDBACK_SENTINEL',
    client_feedback_sent_at: null, client_feedback_read_at: null,
    client: { id: 'fake-client', email: 'PRIVATE_EMAIL_SENTINEL',
      profile: { first_name: 'Cliente', last_name: 'Sintético', avatar_url: 'PRIVATE_URL_SENTINEL' } },
    ...overrides,
  }
}

afterEach(() => { vi.restoreAllMocks(); query.data = undefined })

describe('existing recap print projection', () => {
  it('allowlists answers and identity, excluding private fields and unconfirmed feedback', () => {
    const model = toRecapPrintModel(fixture(), 'Cliente Sintético')
    expect(model).not.toBeNull()
    expect(Object.keys(model ?? {})).toEqual(['clientName', 'week', 'submittedDate', 'feedback', 'sections'])
    expect(JSON.stringify(model)).not.toMatch(/PRIVATE_|DRAFT_FEEDBACK_SENTINEL|fake-client|fake-recap/)
    render(<RecapPrintableSummary model={model} />)
    expect(screen.getByText('Resumen de recap')).toBeInTheDocument()
    expect(screen.getByText('Cliente Sintético')).toBeInTheDocument()
    expect(screen.getByText(/21 de septiembre de 2026/)).toHaveTextContent('27 de septiembre de 2026')
    expect(screen.getByText(/Enviado:/)).toHaveTextContent('28 de septiembre de 2026')
    expect(screen.getByText('Muy Bueno')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getAllByText('No indicado').length).toBeGreaterThan(0)
    expect(screen.getByText('Sí')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('Espalda')).toBeInTheDocument()
    expect(screen.getByText(/Primera línea/).textContent).toBe(longAnswer)
    expect(screen.queryByText('Revisión compartible')).not.toBeInTheDocument()
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir / Guardar PDF' }))
    expect(print).toHaveBeenCalledTimes(1)
    const style = document.querySelector('#recap-print-report style')?.textContent
    expect(style).toContain('body > :not(#recap-print-report)')
    expect(style).toContain('white-space: pre-wrap')
    expect(style).toContain('overflow-wrap: anywhere')
    expect(style).not.toMatch(/max-height|overflow:\s*hidden|line-clamp/)
  })

  it('prints only saved reviewed feedback, including archived reviewed recaps', () => {
    const model = toRecapPrintModel(fixture({ status: 'REVIEWED',
      reviewed_at: '2026-09-29T12:00:00Z', archived_at: '2026-09-30T12:00:00Z',
      client_feedback_text: 'Feedback compartible confirmado' }), 'Cliente Sintético')
    render(<RecapPrintableSummary model={model} />)
    expect(screen.getByText('Revisión compartible')).toBeInTheDocument()
    expect(screen.getByText('Feedback compartible confirmado')).toBeInTheDocument()
    expect(toRecapPrintModel(fixture({ status: 'REVIEWED' }), 'Cliente')?.feedback).toBeNull()
  })

  it.each([
    { status: 'DRAFT' as const }, { submitted_at: null }, { id: '' },
    { week_start_date: 'invalid-date' },
  ])('offers no independent report or action for %j', (overrides) => {
    render(<RecapPrintableSummary model={toRecapPrintModel(fixture(overrides), 'Cliente')} />)
    expect(screen.queryByRole('button', { name: 'Imprimir / Guardar PDF' })).not.toBeInTheDocument()
    expect(document.getElementById('recap-print-report')).toBeNull()
  })

  it('does not offer printing on the detail page for an unsent draft', () => {
    query.data = fixture({ status: 'DRAFT', submitted_at: null })
    render(<MemoryRouter><RecapDetailPage /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: 'Imprimir / Guardar PDF' })).not.toBeInTheDocument()
    expect(document.getElementById('recap-print-report')).toBeNull()
  })

  it('uses a neutral client label rather than an email fallback when the profile is absent', () => {
    query.data = fixture({ client: { id: 'fake-client', email: 'PRIVATE_EMAIL_SENTINEL', profile: null } })
    render(<MemoryRouter><RecapDetailPage /></MemoryRouter>)
    expect(document.getElementById('recap-print-report')?.textContent).toContain('Cliente sin nombre')
    expect(document.getElementById('recap-print-report')?.textContent).not.toContain('PRIVATE_EMAIL_SENTINEL')
  })

  it.each(['feedback', 'internal note', 'both'])('disables printing for dirty %s while preserving the saved private-safe report', (editedField) => {
    query.data = fixture({ status: 'REVIEWED', reviewed_at: '2026-09-29T12:00:00Z',
      client_feedback_text: 'Feedback guardado' })
    const { rerender } = render(<MemoryRouter><RecapDetailPage /></MemoryRouter>)
    const report = document.getElementById('recap-print-report')
    const assertSavedReport = () => {
      expect(report?.textContent).toContain('Feedback guardado')
      expect(report?.textContent).not.toMatch(/PRIVATE_|UNSAVED_|Correo|Volver a recaps/)
      expect(report?.querySelector('button, textarea, img, a')).toBeNull()
    }
    assertSavedReport()
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const printButton = screen.getByRole('button', { name: 'Imprimir / Guardar PDF' })
    expect(printButton).toBeEnabled()
    fireEvent.click(printButton)
    expect(print).toHaveBeenCalledTimes(1)
    print.mockClear()

    if (editedField !== 'internal note') {
      fireEvent.change(screen.getByPlaceholderText('Escribe un comentario que verá el cliente en su recap...'),
        { target: { value: 'UNSAVED_FEEDBACK_SENTINEL' } })
    }
    if (editedField !== 'feedback') {
      fireEvent.change(screen.getByPlaceholderText('Notas internas que nunca se comparten con el cliente...'),
        { target: { value: 'UNSAVED_PRIVATE_SENTINEL' } })
    }
    assertSavedReport()
    expect(printButton).toBeDisabled()
    fireEvent.click(printButton)
    expect(print).not.toHaveBeenCalled()

    // Simulate the persisted query refresh after saving, without an API request.
    query.data = fixture({ status: 'REVIEWED', reviewed_at: '2026-09-29T12:00:00Z',
      client_feedback_text: editedField === 'internal note' ? 'Feedback guardado' : 'UNSAVED_FEEDBACK_SENTINEL',
      admin_comments: editedField === 'feedback' ? 'PRIVATE_INTERNAL_SENTINEL' : 'UNSAVED_PRIVATE_SENTINEL' })
    rerender(<MemoryRouter><RecapDetailPage /></MemoryRouter>)
    expect(printButton).toBeEnabled()
    expect(report?.textContent).toContain(query.data.client_feedback_text)
    expect(report?.textContent).not.toMatch(/PRIVATE_|Correo|Volver a recaps/)
    expect(report?.querySelector('button, textarea, img, a')).toBeNull()
    fireEvent.click(printButton)
    expect(print).toHaveBeenCalledTimes(1)
  })
})

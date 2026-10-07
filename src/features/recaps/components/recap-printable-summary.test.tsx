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
  useRecapIdentity: () => 'staff:0',
  recapIdentity: () => 'staff:0',
  useSaveRecapReviewDraft: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePublishRecapReview: () => ({ isPending: false, mutateAsync: vi.fn() }),
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
  it('projects only the three published coach fields, retaining legacy sent feedback independently', () => {
    const model = toRecapPrintModel(fixture({ status: 'REVIEWED', reviewed_at: '2026-10-05',
      client_feedback_text: 'Feedback legacy enviado', client_feedback_sent_at: '2026-10-05T12:00:00Z',
      published_coach_summary: 'Resumen publicado\nSegunda línea', published_changes: 'Cambios publicados',
      published_next_week_goals: `Objetivos publicados ${'x'.repeat(2900)}`, draft_coach_summary: 'PRIVATE_DRAFT',
      draft_changes: 'PRIVATE_CHANGES', draft_next_week_goals: 'PRIVATE_GOALS', review_version: 9 }), 'Cliente')
    expect(JSON.stringify(model)).not.toMatch(/PRIVATE_|review_version|draft_/)
    render(<RecapPrintableSummary model={model} />)
    expect(screen.getByRole('heading', { name: 'Resumen del coach', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cambios realizados', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Objetivos de la próxima semana', hidden: true })).toBeInTheDocument()
    expect(screen.getByText('Feedback legacy enviado')).toBeInTheDocument()
    expect(screen.getByText(/Resumen publicado/).textContent).toBe('Resumen publicado\nSegunda línea')
    expect(screen.getByText(/Objetivos publicados/).textContent).toBe(`Objetivos publicados ${'x'.repeat(2900)}`)
    const css = document.querySelector('#recap-print-report style')?.textContent
    expect(css).toContain('overflow-wrap: anywhere')
    expect(css).toContain('break-after: avoid')
    expect(css).toContain('orphans: 3; widows: 3')
  })
  it('allowlists answers and identity, excluding private fields and unconfirmed feedback', () => {
    const model = toRecapPrintModel(fixture(), 'Cliente Sintético')
    expect(model).not.toBeNull()
    expect(Object.keys(model ?? {})).toEqual(['clientName', 'week', 'submittedDate', 'feedback', 'publishedReview', 'sections'])
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

  it.each(['SUBMITTED', 'REVIEWED'] as const)('excludes unsent legacy feedback for %s without hiding published coach fields', (status) => {
    const model = toRecapPrintModel(fixture({ status, reviewed_at: '2026-10-05T12:00:00Z',
      client_feedback_text: 'UNSENT_FEEDBACK_SENTINEL', client_feedback_sent_at: null,
      published_coach_summary: 'Coach publicado', published_changes: 'Cambio publicado',
      published_next_week_goals: 'Objetivo publicado' }), 'Cliente')
    expect(model?.feedback).toBeNull()
    expect(JSON.stringify(model)).not.toContain('UNSENT_FEEDBACK_SENTINEL')
    render(<RecapPrintableSummary model={model} />)
    expect(screen.queryByText('Revisión compartible')).not.toBeInTheDocument()
    expect(document.getElementById('recap-print-report')?.textContent).not.toContain('UNSENT_FEEDBACK_SENTINEL')
    for (const text of ['Coach publicado', 'Cambio publicado', 'Objetivo publicado']) expect(screen.getByText(text)).toBeInTheDocument()
  })

  it.each(['SUBMITTED', 'REVIEWED'] as const)('uses the sent marker rather than reviewed_at to preserve sent feedback for %s', (status) => {
    const model = toRecapPrintModel(fixture({ status, reviewed_at: null,
      client_feedback_text: 'Feedback enviado sin fecha de revisión', client_feedback_sent_at: '2026-10-05T12:00:00Z' }), 'Cliente')
    render(<RecapPrintableSummary model={model} />)
    expect(screen.getByText('Feedback enviado sin fecha de revisión')).toBeInTheDocument()
  })

  it('keeps published paragraphs and client answers intact with bounded whitespace wrapping, including trailing spaces', () => {
    const content = `NUEVO_RESUMEN_CONFIRMADO\n${'Resumen nuevo publicado tras confirmación explícita. '.repeat(35)}\nFINAL_NUEVO_RESUMEN`
    const word = `NUEVOS_OBJETIVOS_CONFIRMADOS\n${'Z'.repeat(2900)}`
    render(<RecapPrintableSummary model={toRecapPrintModel(fixture({ training_notes: content,
      published_coach_summary: content, published_next_week_goals: word }), 'Cliente')} />)
    const report = document.getElementById('recap-print-report')
    if (!report) throw new Error('Missing printable report')
    expect([...report.querySelectorAll('p, dd')].filter((node) => node.textContent === content)).toHaveLength(2)
    expect(screen.getByText(/NUEVOS_OBJETIVOS_CONFIRMADOS/).textContent).toBe(word)
    const css = report?.querySelector('style')?.textContent
    expect(css).toContain('min-width: 0; max-width: 100%')
    expect(css).toContain('#recap-print-report section p, #recap-print-report dd { white-space: break-spaces; }')
    expect(css).toContain('overflow-wrap: anywhere')
    expect(css).toContain('orphans: 3; widows: 3')
    expect(css).toContain('break-after: avoid')
    expect(css).not.toMatch(/overflow:\s*hidden|line-clamp|max-height/)
  })

  it('prints only sent feedback, including archived reviewed recaps', () => {
    const model = toRecapPrintModel(fixture({ status: 'REVIEWED',
      reviewed_at: '2026-09-29T12:00:00Z', archived_at: '2026-09-30T12:00:00Z',
      client_feedback_text: 'Feedback compartible confirmado', client_feedback_sent_at: '2026-09-29T12:00:00Z' }), 'Cliente Sintético')
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
      client_feedback_text: 'Feedback guardado', client_feedback_sent_at: '2026-09-29T12:00:00Z' })
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
      client_feedback_sent_at: '2026-09-29T12:00:00Z',
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

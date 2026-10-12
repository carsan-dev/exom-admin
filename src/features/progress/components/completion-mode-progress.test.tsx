import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DayProgress, TrainingDaySummary } from '../types'
import { DayProgressDetail } from './day-progress-detail'
import { ProgressCalendar } from './progress-calendar'
import { ProgressOverviewCards } from './progress-overview-cards'

const dayProgress = (summary?: TrainingDaySummary): DayProgress => ({
  id: 'p', client_id: 'c', date: '2026-06-29T00:00:00.000Z', training_completed: true,
  ...(summary && { training_summary: summary }),
  exercises_completed: [], meals_completed: [], meals_completed_details: [], notes: null, admin_reply_text: null, admin_reply_sent_at: null,
})
const summary = (over: Partial<TrainingDaySummary>): TrainingDaySummary => ({
  training_completion_mode: 'ALL', assigned_count: 3, completed_count: 1, assigned_training_ids: [], completed_training_ids: [], ...over,
})
const renderDetail = (progress: DayProgress) => render(
  <QueryClientProvider client={new QueryClient()}><DayProgressDetail clientId="c" date="2026-06-29" progress={progress} /></QueryClientProvider>)

describe('day detail completion mode', () => {
  it('shows "x de N" and the "Elegir uno" badge for ANY', () => {
    renderDetail(dayProgress(summary({ training_completion_mode: 'ANY' })))
    expect(screen.getByText('Completado')).toBeInTheDocument()
    expect(screen.getByText('1 de 3 entrenamientos')).toBeInTheDocument()
    expect(screen.getByText('Elegir uno')).toBeInTheDocument()
  })
  it('shows the count without the badge for ALL', () => {
    renderDetail(dayProgress(summary({})))
    expect(screen.getByText('1 de 3 entrenamientos')).toBeInTheDocument()
    expect(screen.queryByText('Elegir uno')).not.toBeInTheDocument()
  })
  it('shows neither for a single training or an older API without training_summary', () => {
    const { unmount } = renderDetail(dayProgress(summary({ assigned_count: 1, training_completion_mode: 'ANY' })))
    expect(screen.queryByText(/ de \d+ entrenamientos/)).not.toBeInTheDocument()
    expect(screen.queryByText('Elegir uno')).not.toBeInTheDocument()
    unmount()
    renderDetail(dayProgress())
    expect(screen.getByText('Completado')).toBeInTheDocument()
    expect(screen.queryByText(/ de \d+ entrenamientos/)).not.toBeInTheDocument()
  })
})

describe('month calendar and week summary', () => {
  const props = { year: 2020, month: 1, selectedDate: '2020-01-03', onDateSelect: vi.fn(), onMonthChange: vi.fn() }
  const day = { date: '2020-01-03', has_training: true, has_diet: false, is_rest_day: false, training_completed: true, diet_completed: false }
  it('adds "x de N" to the day tooltip only when more than one training is assigned', () => {
    render(<ProgressCalendar {...props} days={[{ ...day, trainings_assigned: 3, trainings_done: 1, training_completion_mode: 'ANY' }, { ...day, date: '2020-01-04', trainings_assigned: 1, trainings_done: 1 }]} />)
    expect(screen.getByRole('button', { name: '2020-01-03 · Completado · 1 de 3 entrenamientos' })).toHaveAttribute('title', 'Completado · 1 de 3 entrenamientos')
    expect(screen.getByRole('button', { name: '2020-01-04 · Completado' })).toBeInTheDocument()
  })
  const week = { week_start: '2020-01-06', trainings_assigned: 6, trainings_completed: 2, total_meals: 0, meals_completed: 0 }
  it('uses day counts when provided and falls back to training counts otherwise', () => {
    const { unmount } = render(<ProgressOverviewCards streak={null} weekSummary={{ ...week, training_days_assigned: 3, training_days_completed: 2 }} />)
    expect(screen.getByText('2 de 3 días con entrenamiento · 67 %')).toBeInTheDocument()
    unmount()
    render(<ProgressOverviewCards streak={null} weekSummary={week} />)
    expect(screen.getByText('2 de 6 entrenamientos · 33 %')).toBeInTheDocument()
  })
})

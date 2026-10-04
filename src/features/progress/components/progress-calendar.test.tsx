import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProgressCalendar } from './progress-calendar'

const props = { year: 2020, month: 1, selectedDate: '2020-01-03', onDateSelect: vi.fn(), onMonthChange: vi.fn() }
describe('Calendario de actividad', () => {
  it('nombra fechas y estados sin depender del color y permite seleccionar días sin registro', () => {
    render(<ProgressCalendar {...props} days={[{ date: '2020-01-03', has_training: true, has_diet: false, is_rest_day: false, training_completed: true, diet_completed: false }]} />)
    expect(screen.getByRole('button', { name: '2020-01-03 · Completado' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '2020-01-04 · Sin registro' }))
    expect(props.onDateSelect).toHaveBeenCalledWith('2020-01-04')
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(props.onMonthChange).toHaveBeenCalledWith(2019, 12)
  })
  it('no convierte un día sin asignaciones en incumplimiento', () => {
    render(<ProgressCalendar {...props} days={[{ date: '2020-01-02', has_training: false, has_diet: false, is_rest_day: false, training_completed: false, diet_completed: false }]} />)
    expect(screen.getByRole('button', { name: '2020-01-02 · Sin asignaciones' })).toBeEnabled()
  })
})

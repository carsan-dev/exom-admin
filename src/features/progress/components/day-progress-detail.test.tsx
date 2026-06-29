import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { formatCompletedSet } from '../format-completed-set'
import { DayProgressDetail } from './day-progress-detail'

describe('formatCompletedSet', () => {
  it('renders partial and historical set values', () => {
    expect(formatCompletedSet({ set_number: 1, reps: 12 })).toBe('Serie 1 · 12 reps')
    expect(formatCompletedSet({ set_number: 2, weight_kg: 20 })).toBe('Serie 2 · 20 kg')
    expect(formatCompletedSet({ set_number: 2, seconds: 40 })).toBe('Serie 2 · 40s')
    expect(formatCompletedSet({ set_number: 3, reps: 10, weight_kg: 22.5 })).toBe(
      'Serie 3 · 10 reps · 22.5 kg',
    )
  })
})

describe('DayProgressDetail', () => {
  it('shows readable exercise and meal names instead of identifiers', () => {
    render(
      <DayProgressDetail
        date="2026-06-29"
        progress={{
          id: 'progress-1',
          client_id: 'client-1',
          date: '2026-06-29',
          training_completed: true,
          exercises_completed: [
            {
              exercise_id: '503aa784-922f-488e-a01a-c20f625677a0',
              exercise_name: 'Sentadilla goblet',
              completed_at: '2026-06-29T10:00:00.000Z',
              sets: [{ set_number: 1, reps: 12, weight_kg: 20 }],
            },
            {
              exercise_id: 'missing-exercise',
              exercise_name: null,
              completed_at: '2026-06-29T10:05:00.000Z',
            },
          ],
          meals_completed: ['meal-1', 'missing-meal'],
          meals_completed_details: [
            { meal_id: 'meal-1', meal_name: 'Desayuno' },
            { meal_id: 'missing-meal', meal_name: null },
          ],
          notes: null,
        }}
      />,
    )

    expect(screen.getByText('Sentadilla goblet')).toBeInTheDocument()
    expect(screen.getByText('Desayuno')).toBeInTheDocument()
    expect(screen.getByText('Ejercicio eliminado')).toBeInTheDocument()
    expect(screen.getByText('Comida eliminada')).toBeInTheDocument()
    expect(screen.getByText('Serie 1 · 12 reps · 20 kg')).toBeInTheDocument()
    expect(screen.queryByText('503aa784-922f-488e-a01a-c20f625677a0')).not.toBeInTheDocument()
    expect(screen.queryByText('meal-1')).not.toBeInTheDocument()
  })
})

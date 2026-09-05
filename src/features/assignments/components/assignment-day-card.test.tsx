import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AssignmentDay } from '../types'
import { AssignmentDayCard } from './assignment-day-card'

describe('AssignmentDayCard', () => {
  it('shows that a preserved historical training is retired', () => {
    const day: AssignmentDay = {
      id: 'assignment-1',
      client_id: 'client-1',
      date: '2026-09-05',
      is_rest_day: false,
      training: null,
      trainings: [
        {
          id: 'training-retired-1',
          name: 'Test D',
          type: 'FUERZA',
          level: 'PRINCIPIANTE',
          estimated_duration_min: 30,
          estimated_calories: 200,
          is_active: false,
        },
        {
          id: 'training-retired-2',
          name: 'Test E',
          type: 'FUERZA',
          level: 'PRINCIPIANTE',
          estimated_duration_min: 30,
          estimated_calories: 200,
          is_active: false,
        },
      ],
      training_ids: ['training-retired-1', 'training-retired-2'],
      diet: null,
    }

    render(
      <AssignmentDayCard
        day={day}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('2 retirados')).toBeInTheDocument()
    expect(screen.getAllByText('Retirado')).toHaveLength(2)
    expect(screen.getByText(/Test D/)).toBeInTheDocument()
    expect(screen.getByText(/Test E/)).toBeInTheDocument()
  })
})

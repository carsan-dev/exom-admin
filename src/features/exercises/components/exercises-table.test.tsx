import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExercisesTable } from './exercises-table'
import type { Exercise } from '../types'

const base: Omit<Exercise, 'training_usage_count' | 'is_used_in_training'> = { id: 'exercise-1', name: 'Sentadilla', muscle_groups: [], equipment: [], level: 'PRINCIPIANTE', video_url: null, video_stream_id: null, thumbnail_url: null, technique_text: null, common_errors_text: null, explanation_text: null, is_active: true, created_at: '', updated_at: '' }
const props = { onView: vi.fn(), onEdit: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn() }

function renderTable(exercise: Exercise) {
  return render(<QueryClientProvider client={new QueryClient()}><ExercisesTable exercises={[exercise]} {...props} /></QueryClientProvider>)
}

describe('ExercisesTable usage', () => {
  it('shows accessible unassigned state without detail button', () => {
    renderTable({ ...base, training_usage_count: 0, is_used_in_training: false })
    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Ver entrenamientos/)).not.toBeInTheDocument()
  })

  it('shows count and lazy detail trigger when used', () => {
    renderTable({ ...base, training_usage_count: 2, is_used_in_training: true })
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByLabelText('Ver entrenamientos que usan Sentadilla')).toBeInTheDocument()
  })
})

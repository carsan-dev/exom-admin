import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ExercisesList } from './exercises-list'
import type { Exercise } from '../types'

const exercise: Exercise = {
  id: 'exercise-1',
  name: 'Sentadilla',
  muscle_groups: ['Cuádriceps'],
  equipment: [],
  level: 'PRINCIPIANTE',
  video_url: null,
  video_stream_id: null,
  thumbnail_url: null,
  technique_text: null,
  common_errors_text: null,
  explanation_text: null,
  is_active: true,
  created_at: '',
  updated_at: '',
  training_usage_count: 0,
  is_used_in_training: false,
}

function stubViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }),
  })
}

function renderList(onSortChange = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <ExercisesList
          exercises={[exercise]}
          onView={vi.fn()}
          onEdit={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          onSortChange={onSortChange}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return onSortChange
}

describe('ExercisesList', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('renders only the table on desktop', () => {
    stubViewport(true)
    renderList()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByText('Sentadilla')).toHaveLength(1)
  })

  it('renders only stacked rows with sort controls below md', async () => {
    stubViewport(false)
    const onSortChange = renderList()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getAllByText('Sentadilla')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ordenar por Nivel' }))
    expect(onSortChange).toHaveBeenCalledWith('level')
  })
})

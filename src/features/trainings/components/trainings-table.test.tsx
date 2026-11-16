import { DndContext } from '@dnd-kit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TrainingsTable } from './trainings-table'
import type { Training } from '../types'

const training = {
  id: 'training-1', name: 'Fuerza A', type: 'FUERZA', types: ['FUERZA'], accentColor: null,
  level: 'PRINCIPIANTE', estimated_duration_min: 30, estimated_calories: 100, total_volume: null,
  warmup_description: null, warmup_duration_min: null, cooldown_description: null, tags: [],
  is_active: true, created_by: null, created_at: '', updated_at: '', exercises: [], items: [],
  group_id: null, group: null,
} satisfies Training

describe('TrainingsTable', () => {
  it('selects visible page and clears it from header checkbox', () => {
    const onSelectionChange = vi.fn()
    const props = { trainings: [training], onView: vi.fn(), onEdit: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onSelectionChange }
    const { rerender } = render(<DndContext><TrainingsTable {...props} /></DndContext>)
    fireEvent.click(screen.getByLabelText('Seleccionar página'))
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['training-1']))
    rerender(<DndContext><TrainingsTable {...props} selectedIds={new Set(['training-1'])} /></DndContext>)
    fireEvent.click(screen.getByLabelText('Seleccionar página'))
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set())
  })

  it('preserves selections from other pages when toggling the visible page', () => {
    const onSelectionChange = vi.fn()
    const props = { trainings: [training], onView: vi.fn(), onEdit: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onSelectionChange }
    const { rerender } = render(<DndContext><TrainingsTable {...props} selectedIds={new Set(['training-other-page'])} /></DndContext>)

    fireEvent.click(screen.getByLabelText('Seleccionar página'))
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['training-other-page', 'training-1']))

    rerender(<DndContext><TrainingsTable {...props} selectedIds={new Set(['training-other-page', 'training-1'])} /></DndContext>)
    fireEvent.click(screen.getByLabelText('Seleccionar página'))
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['training-other-page']))
  })

  describe('mobile list', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('pluralizes the exercise count', () => {
      vi.stubGlobal('matchMedia', () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
      const props = { onView: vi.fn(), onEdit: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn() }
      const exercises = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `e-${i}` }))
      const trainings = [
        { ...training, id: 't-0', exercises_count: 0 },
        { ...training, id: 't-1', exercises_count: 1 },
        { ...training, id: 't-3', exercises: exercises(3) },
      ] as unknown as Training[]
      render(<DndContext><TrainingsTable trainings={trainings} {...props} /></DndContext>)

      expect(screen.getByText(/^0 ejercicios ·/)).toBeTruthy()
      expect(screen.getByText(/^1 ejercicio ·/)).toBeTruthy()
      expect(screen.getByText(/^3 ejercicios ·/)).toBeTruthy()
    })
  })
})

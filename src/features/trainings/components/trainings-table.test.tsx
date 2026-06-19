import { DndContext } from '@dnd-kit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
})

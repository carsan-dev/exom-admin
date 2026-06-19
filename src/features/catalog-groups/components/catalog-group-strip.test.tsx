import { DndContext } from '@dnd-kit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CatalogGroupStrip } from './catalog-group-strip'

describe('CatalogGroupStrip', () => {
  it('filters groups, shows active state and offers creation', () => {
    const onFilterChange = vi.fn()
    const onCreate = vi.fn()
    render(<DndContext><CatalogGroupStrip groups={[{ id: 'g1', name: 'Base', item_count: 3, created_at: '', updated_at: '' }]} activeFilter="g1" onFilterChange={onFilterChange} onCreate={onCreate} onEdit={vi.fn()} onDelete={vi.fn()} /></DndContext>)
    expect(screen.getByRole('button', { name: 'Base' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Base' }))
    fireEvent.click(screen.getByRole('button', { name: /Sin grupo/ }))
    fireEvent.click(screen.getByRole('button', { name: /Nuevo grupo/ }))
    expect(onFilterChange).toHaveBeenNthCalledWith(1, 'g1')
    expect(onFilterChange).toHaveBeenNthCalledWith(2, 'ungrouped')
    expect(onCreate).toHaveBeenCalledTimes(1)
  })
})

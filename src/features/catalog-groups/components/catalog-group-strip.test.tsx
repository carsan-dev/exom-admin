import { DndContext } from '@dnd-kit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CatalogGroupStrip } from './catalog-group-strip'

describe('CatalogGroupStrip', () => {
  it('opens group and offers creation', () => {
    const onOpen = vi.fn()
    const onCreate = vi.fn()
    render(<DndContext><CatalogGroupStrip groups={[{ id: 'g1', name: 'Base', item_count: 3, created_at: '', updated_at: '' }]} onCreate={onCreate} onOpen={onOpen} onEdit={vi.fn()} onDelete={vi.fn()} /></DndContext>)
    fireEvent.click(screen.getByRole('button', { name: 'Base' }))
    fireEvent.click(screen.getByRole('button', { name: /Nuevo grupo/ }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledTimes(1)
  })
})

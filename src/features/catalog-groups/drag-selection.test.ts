import { describe, expect, it } from 'vitest'
import { resolveDraggedCatalogIds } from './drag-selection'

describe('resolveDraggedCatalogIds', () => {
  it('moves the full selection when dragging a selected row', () => {
    expect(resolveDraggedCatalogIds('two', new Set(['one', 'two']))).toEqual(['one', 'two'])
  })

  it('moves only the dragged row when it is not selected', () => {
    expect(resolveDraggedCatalogIds('three', new Set(['one', 'two']))).toEqual(['three'])
  })
})

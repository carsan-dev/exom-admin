import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useNamedSelection } from './use-named-selection'

const PAGE_ONE = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
]
const PAGE_TWO = [{ id: 'k', name: 'Kappa' }]

describe('useNamedSelection', () => {
  it('remembers names of items selected on a page that is no longer visible', () => {
    const { result, rerender } = renderHook(({ items }) => useNamedSelection(items, 'q'), {
      initialProps: { items: PAGE_ONE },
    })

    act(() => result.current.updateSelection(new Set(['a'])))
    rerender({ items: PAGE_TWO })
    act(() => result.current.updateSelection(new Set(['a', 'k'])))

    expect(result.current.selectedIds).toEqual(new Set(['a', 'k']))
    expect(result.current.toItems()).toEqual([
      { id: 'a', name: 'Alpha' },
      { id: 'k', name: 'Kappa' },
    ])
  })

  it('falls back to the id when the name was never seen', () => {
    const { result } = renderHook(() => useNamedSelection(PAGE_ONE, 'q'))
    act(() => result.current.updateSelection(new Set(['zzz'])))
    expect(result.current.toItems()).toEqual([{ id: 'zzz', name: 'zzz' }])
  })

  it('retains only the given ids and forgets the rest', () => {
    const { result } = renderHook(() => useNamedSelection(PAGE_ONE, 'q'))
    act(() => result.current.updateSelection(new Set(['a', 'b'])))

    act(() => result.current.retainSelection(new Set(['b'])))

    expect(result.current.selectedIds).toEqual(new Set(['b']))
    expect(result.current.toItems()).toEqual([{ id: 'b', name: 'Beta' }])
  })

  it('clears the selection on demand and when the reset key changes', () => {
    const { result, rerender } = renderHook(({ key }) => useNamedSelection(PAGE_ONE, key), {
      initialProps: { key: 'q1' },
    })
    act(() => result.current.updateSelection(new Set(['a'])))
    act(() => result.current.clearSelection())
    expect(result.current.selectedIds.size).toBe(0)

    act(() => result.current.updateSelection(new Set(['b'])))
    rerender({ key: 'q2' })

    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.toItems()).toEqual([])
  })
})

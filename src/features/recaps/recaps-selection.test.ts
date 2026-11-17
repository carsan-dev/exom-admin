import { describe, expect, it } from 'vitest'
import {
  getNextPendingRecap,
  getSiblingRecap,
  hasRecapReplyChanges,
  isRecapEditableAfterReview,
} from './recaps-selection'
import type { RecapStatus } from './types'

function item(id: string, status: RecapStatus, archived = false) {
  return { id, status, archived_at: archived ? '2026-11-16T10:00:00.000Z' : null }
}

const ids = (value: { id: string } | null) => value?.id ?? null

describe('getNextPendingRecap', () => {
  it('returns the next submitted recap after fromId, skipping reviewed, archived and draft ones', () => {
    const items = [
      item('a', 'SUBMITTED'),
      item('b', 'REVIEWED'),
      item('c', 'SUBMITTED', true),
      item('d', 'DRAFT'),
      item('e', 'SUBMITTED'),
    ]
    expect(ids(getNextPendingRecap(items, 'a'))).toBe('e')
  })

  it('wraps around to the first pending recap before fromId', () => {
    const items = [item('a', 'SUBMITTED'), item('b', 'REVIEWED'), item('c', 'SUBMITTED')]
    expect(ids(getNextPendingRecap(items, 'c'))).toBe('a')
  })

  it('never returns fromId and returns null when nothing else is pending', () => {
    const items = [item('a', 'SUBMITTED'), item('b', 'REVIEWED'), item('c', 'SUBMITTED', true)]
    expect(getNextPendingRecap(items, 'a')).toBeNull()
    expect(getNextPendingRecap([], 'a')).toBeNull()
  })

  it('searches the whole list when fromId is not in it', () => {
    const items = [item('a', 'REVIEWED'), item('b', 'SUBMITTED')]
    expect(ids(getNextPendingRecap(items, 'zz'))).toBe('b')
  })
})

describe('getSiblingRecap', () => {
  const items = [item('a', 'SUBMITTED'), item('b', 'REVIEWED'), item('c', 'SUBMITTED')]

  it('returns the previous and next neighbours', () => {
    expect(ids(getSiblingRecap(items, 'b', -1))).toBe('a')
    expect(ids(getSiblingRecap(items, 'b', 1))).toBe('c')
  })

  it('returns null at the ends and for an id outside the list', () => {
    expect(getSiblingRecap(items, 'a', -1)).toBeNull()
    expect(getSiblingRecap(items, 'c', 1)).toBeNull()
    expect(getSiblingRecap(items, 'zz', 1)).toBeNull()
  })
})

describe('isRecapEditableAfterReview', () => {
  it('accepts only reviewed recaps that are not archived', () => {
    expect(isRecapEditableAfterReview(item('a', 'REVIEWED'))).toBe(true)
    expect(isRecapEditableAfterReview(item('a', 'REVIEWED', true))).toBe(false)
    expect(isRecapEditableAfterReview(item('a', 'SUBMITTED'))).toBe(false)
    expect(isRecapEditableAfterReview(item('a', 'DRAFT'))).toBe(false)
  })
})

describe('hasRecapReplyChanges', () => {
  const saved = { clientFeedback: 'Sigue así', internalNote: 'Buen trabajo' }

  it('ignores surrounding whitespace, like the detail page', () => {
    expect(
      hasRecapReplyChanges({ clientFeedback: ' Sigue así ', internalNote: 'Buen trabajo\n' }, saved)
    ).toBe(false)
  })

  it('detects a change in either the comment or the note', () => {
    expect(hasRecapReplyChanges({ ...saved, clientFeedback: 'Otro' }, saved)).toBe(true)
    expect(hasRecapReplyChanges({ ...saved, internalNote: '' }, saved)).toBe(true)
  })
})

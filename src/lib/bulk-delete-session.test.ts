import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => ({ auth: { currentUser: null as { uid: string } | null } }))
vi.mock('./firebase', () => ({ auth: session.auth, getIdToken: vi.fn() }))
import { pinFirebaseSession, runSessionBoundBulkDelete } from './bulk-delete-session'

const items = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `id-${index + 1}`, name: `Elemento ${index + 1}` }))

describe('pinFirebaseSession', () => {
  beforeEach(() => {
    session.auth.currentUser = { uid: 'A' }
  })

  it('holds while the same Firebase user stays signed in', () => {
    const isSameSession = pinFirebaseSession()
    session.auth.currentUser = { uid: 'A' }
    expect(isSameSession()).toBe(true)
  })

  it('fails once another user signs in or the user signs out', () => {
    const isSameSession = pinFirebaseSession()
    session.auth.currentUser = { uid: 'B' }
    expect(isSameSession()).toBe(false)
    session.auth.currentUser = null
    expect(isSameSession()).toBe(false)
  })

  it('fails when there was no user when pinned', () => {
    session.auth.currentUser = null
    const isSameSession = pinFirebaseSession()
    session.auth.currentUser = { uid: 'A' }
    expect(isSameSession()).toBe(false)
  })
})

describe('runSessionBoundBulkDelete', () => {
  beforeEach(() => {
    session.auth.currentUser = { uid: 'A' }
  })

  it('never sends a request with the credentials of a user who signed in mid-batch', async () => {
    const sentAs: Array<string | undefined> = []
    const deleteOne = vi.fn(async (id: string) => {
      sentAs.push(session.auth.currentUser?.uid)
      // Another tab signs in with user B while the first request is in flight.
      if (id === 'id-1') session.auth.currentUser = { uid: 'B' }
    })

    const summary = await runSessionBoundBulkDelete({ items: items(3), deleteOne })

    expect(deleteOne).toHaveBeenCalledTimes(1)
    expect(sentAs).toEqual(['A'])
    expect(summary.results.map((result) => result.outcome)).toEqual(['deleted', 'not_attempted', 'not_attempted'])
    expect(summary.stopped).toBe(true)
  })

  it('sends nothing without a signed-in user', async () => {
    session.auth.currentUser = null
    const deleteOne = vi.fn(async () => undefined)

    const summary = await runSessionBoundBulkDelete({ items: items(2), deleteOne })

    expect(deleteOne).not.toHaveBeenCalled()
    expect(summary.counts.not_attempted).toBe(2)
  })
})

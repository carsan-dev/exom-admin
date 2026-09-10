import { describe, expect, it } from 'vitest'
import { createIdentityRequest } from './identity-request'

describe('identity request retries', () => {
  it('retains an uncertain operation and rotates after success, payload or account changes', () => {
    const request = createIdentityRequest()
    const original = request.headers('admin-a', { active: false })
    expect(request.headers('admin-a', { active: false })).toEqual(original)
    const opposite = request.headers('admin-a', { active: true })
    expect(opposite).not.toEqual(original)
    expect(request.headers('admin-b', { active: true })).not.toEqual(opposite)
    const beforeSuccess = request.headers('admin-b', { active: true })
    request.complete()
    expect(request.headers('admin-b', { active: true })).not.toEqual(beforeSuccess)
  })

  it('starts a new attempt only after confirmed compensation, retaining keys for uncertain failures', () => {
    const request = createIdentityRequest()
    const original = request.headers('actor', 'payload')
    request.failure(new Error('timeout'))
    expect(request.headers('actor', 'payload')).toEqual(original)
    request.failure({
      isAxiosError: true,
      response: { data: { code: 'IDENTITY_OPERATION_COMPENSATED' } },
    })
    expect(request.headers('actor', 'payload')).not.toEqual(original)
  })
})

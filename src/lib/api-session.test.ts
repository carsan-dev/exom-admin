import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'

const mocks = vi.hoisted(() => ({ auth: { currentUser: { uid: 'A' } }, token: vi.fn() }))
vi.mock('./firebase', () => ({ auth: mocks.auth, getIdToken: mocks.token }))
import { api } from './api'

describe('API session ownership', () => {
  beforeEach(() => {
    mocks.auth.currentUser = { uid: 'A' }
    mocks.token.mockResolvedValue('test-token-A')
  })

  it.each([200, 401, 403])('discards late %s responses from another Firebase session', async (status) => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let started!: () => void
    const sent = new Promise<void>((resolve) => { started = resolve })
    api.defaults.adapter = async (config) => {
      started()
      await gate
      const response = { data: {}, status, statusText: 'test', headers: {}, config }
      if (status !== 200) throw new AxiosError('test rejection', 'ERR_BAD_REQUEST', config, undefined, response)
      return response
    }
    const result = expect(api.get('/protected')).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    await sent
    mocks.auth.currentUser = { uid: 'B' }
    release()
    await result
  })
})

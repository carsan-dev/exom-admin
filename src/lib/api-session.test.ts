import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'

const mocks = vi.hoisted(() => ({ auth: { currentUser: { uid: 'A' } }, token: vi.fn() }))
vi.mock('./firebase', () => ({ auth: mocks.auth, getIdToken: mocks.token }))
import { api } from './api'
import { ApprovalPendingError } from './api-utils'

describe('API session ownership', () => {
  beforeEach(() => {
    mocks.auth.currentUser = { uid: 'A' }
    mocks.token.mockResolvedValue('test-token-A')
  })

  it('returns an accepted deletion receipt without treating it as an approval request', async () => {
    const data = { data: { id: 'deletion-operation', client_id: 'client-a', status: 'PENDING' } }
    api.defaults.adapter = async (config) => ({
      data,
      status: 202,
      statusText: 'Accepted',
      headers: {},
      config,
    })
    await expect(
      api.delete('/admin/clients/client-a', { data: { confirmation: 'ELIMINAR' } })
    ).resolves.toMatchObject({ status: 202, data })
  })

  it('continues to handle the explicit approval receipt as a pending approval', async () => {
    api.defaults.adapter = async (config) => ({
      data: { data: { approval_request_id: 'approval-a', message: 'Pendiente' } },
      status: 202,
      statusText: 'Accepted',
      headers: {},
      config,
    })
    await expect(api.post('/admin/trainings', {})).rejects.toBeInstanceOf(ApprovalPendingError)
  })

  it.each([200, 401, 403])(
    'discards late %s responses from another Firebase session',
    async (status) => {
      let release!: () => void
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      let started!: () => void
      const sent = new Promise<void>((resolve) => {
        started = resolve
      })
      api.defaults.adapter = async (config) => {
        started()
        await gate
        const response = { data: {}, status, statusText: 'test', headers: {}, config }
        if (status !== 200)
          throw new AxiosError('test rejection', 'ERR_BAD_REQUEST', config, undefined, response)
        return response
      }
      const result = expect(api.get('/protected')).rejects.toMatchObject({ code: 'ERR_CANCELED' })
      await sent
      mocks.auth.currentUser = { uid: 'B' }
      release()
      await result
    }
  )
})

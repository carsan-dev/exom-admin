import { describe, expect, it } from 'vitest'
import { auth, getIdToken } from './firebase'
import { api } from './api'

describe('Firebase unit-test environment', () => {
  it('initializes the real SDK with synthetic configuration and an isolated API URL', () => {
    expect(auth.app.options).toEqual({
      apiKey: 'exom-unit-test-api-key',
      authDomain: 'exom-unit.invalid',
      projectId: 'demo-exom-unit',
      storageBucket: 'exom-unit.invalid',
      appId: '1:000000000000:web:exom-unit',
      messagingSenderId: '000000000000',
    })
    expect(api.defaults.baseURL).toBe('http://exom-unit.invalid/api/v1')
  })

  it('keeps an anonymous session without requesting a real token', async () => {
    expect(auth.currentUser).toBeNull()
    await expect(getIdToken()).resolves.toBeNull()
  })
})

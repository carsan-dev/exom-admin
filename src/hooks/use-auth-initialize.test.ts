import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  onAuthStateChanged: mocks.onAuthStateChanged,
  signInWithCustomToken: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: mocks.signOut,
}))

vi.mock('@/lib/firebase', () => ({
  auth: {},
  getIdToken: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: mocks.apiGet,
    post: vi.fn(),
  },
}))

import { useAuth } from './use-auth'

type AuthStateCallback = (user: { uid: string } | null) => Promise<void>

function axiosError(status: number): unknown {
  return {
    isAxiosError: true,
    response: { status, data: { message: `HTTP ${status}` } },
  }
}

describe('useAuth.initialize', () => {
  let authStateCallback: AuthStateCallback | undefined

  beforeEach(() => {
    mocks.apiGet.mockReset()
    mocks.onAuthStateChanged.mockReset()
    mocks.signOut.mockReset()
    authStateCallback = undefined
    mocks.onAuthStateChanged.mockImplementation((_auth, callback) => {
      authStateCallback = callback as AuthStateCallback
      return vi.fn()
    })
    useAuth.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
    })
  })

  async function restoreWith(error: unknown) {
    mocks.apiGet.mockRejectedValue(error)
    useAuth.getState().initialize()
    if (!authStateCallback) throw new Error('Auth callback was not registered')
    await authStateCallback({ uid: 'firebase-user' })
  }

  it('preserves Firebase session on temporary backend failure', async () => {
    await restoreWith(axiosError(503))

    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(useAuth.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: 'HTTP 503',
    })
  })

  it('clears Firebase session on backend rejection', async () => {
    await restoreWith(axiosError(403))

    expect(mocks.signOut).toHaveBeenCalledTimes(1)
    expect(useAuth.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: 'UNAUTHORIZED',
    })
  })

  it('stays unauthenticated when Firebase cleanup fails', async () => {
    mocks.signOut.mockRejectedValue(new Error('local cleanup failed'))

    await restoreWith(axiosError(401))

    expect(useAuth.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: 'UNAUTHORIZED',
    })
  })

  it('ignores a stale profile response after Firebase logout', async () => {
    let resolveProfile: ((value: unknown) => void) | undefined
    mocks.apiGet.mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve
      })
    )
    useAuth.getState().initialize()
    if (!authStateCallback) throw new Error('Auth callback was not registered')

    const pendingValidation = authStateCallback({ uid: 'firebase-user' })
    await authStateCallback(null)
    resolveProfile?.({
      data: {
        data: {
          id: 'profile-1',
          user_id: 'user-1',
          first_name: 'Admin',
          last_name: 'User',
          avatar_url: null,
          user: {
            id: 'user-1',
            email: 'admin@exom.dev',
            role: 'ADMIN',
          },
        },
      },
    })
    await pendingValidation

    expect(useAuth.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })
})

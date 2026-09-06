import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  customSignIn: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  onAuthStateChanged: mocks.onAuthStateChanged,
  signInWithCustomToken: mocks.customSignIn,
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
    post: mocks.apiPost,
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
    mocks.apiPost.mockReset()
    mocks.customSignIn.mockReset()
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

  it('ignores a login response that arrives after logout before Firebase sign-in', async () => {
    let finish!: (value: unknown) => void
    mocks.apiPost.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const login = useAuth.getState().login('admin@example.test', 'test-password')
    await useAuth.getState().logout()
    finish({ data: { data: { access_token: 'test-custom-token', user: { id: 'old', role: 'ADMIN', email: 'admin@example.test' } } } })
    await login
    expect(mocks.customSignIn).not.toHaveBeenCalled()
    expect(useAuth.getState().isAuthenticated).toBe(false)
  })

  it('pauses an authenticated store while validating a changed Firebase account', async () => {
    mocks.apiGet.mockRejectedValue(axiosError(503))
    useAuth.getState().initialize()
    useAuth.setState({ isAuthenticated: true })
    const pending = authStateCallback!({ uid: 'replacement' })
    expect(useAuth.getState().isAuthenticated).toBe(false)
    await pending
  })

  it('does not restore a Firebase sign-in that finishes while logout is pending', async () => {
    let finish!: () => void
    mocks.apiPost.mockResolvedValue({ data: { data: { access_token: 'test', user: { id: 'old', role: 'ADMIN' } } } })
    mocks.customSignIn.mockReturnValue(new Promise<void>((resolve) => { finish = resolve }).then(() => authStateCallback!({ uid: 'old' })))
    mocks.apiGet.mockResolvedValue({ data: { data: { user_id: 'old', user: { id: 'old', email: 'test@example.test', role: 'ADMIN' } } } })
    useAuth.getState().initialize()
    const login = useAuth.getState().login('test@example.test', 'test')
    await vi.waitFor(() => expect(mocks.customSignIn).toHaveBeenCalledTimes(1))
    const logout = useAuth.getState().logout()
    await new Promise((resolve) => setTimeout(resolve, 0))
    finish()
    await Promise.all([login, logout])
    expect(useAuth.getState().isAuthenticated).toBe(false)
    const signOutOrder = mocks.signOut.mock.invocationCallOrder
    expect(signOutOrder[signOutOrder.length - 1]).toBeGreaterThan(mocks.customSignIn.mock.invocationCallOrder[0])
  })

  it('does not present a platform failure as invalid login credentials', async () => {
    mocks.apiPost.mockRejectedValue(new Error('transport unavailable'))
    await useAuth.getState().login('admin@example.test', 'test-password')
    expect(useAuth.getState().error).not.toBe('Credenciales inválidas')
  })

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

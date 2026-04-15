import { create } from 'zustand'
import axios from 'axios'
import {
  signOut,
  signInWithRedirect,
  signInWithCustomToken,
  GoogleAuthProvider,
  onAuthStateChanged,
  getRedirectResult,
  type User,
} from 'firebase/auth'
import { auth, getIdToken } from '@/lib/firebase'
import { api } from '@/lib/api'
import type { AuthUser } from '@/types/auth'
import { FirebaseError } from 'firebase/app'

interface BackendAuthResponse {
  data: {
    access_token: string
    user: AuthUser
  }
}

interface BackendProfileResponse {
  data: {
    id: string
    user_id: string
    first_name: string
    last_name: string
    avatar_url: string | null
    user: {
      id: string
      email: string
      role: 'ADMIN' | 'SUPER_ADMIN' | 'CLIENT'
    }
  }
}

interface AuthStore {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null

  initialize: () => () => void
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const UNAUTHORIZED_ERROR = 'UNAUTHORIZED'

function validateRole(role: string): role is 'ADMIN' | 'SUPER_ADMIN' {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

function createUnauthorizedError() {
  return new Error(UNAUTHORIZED_ERROR)
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === UNAUTHORIZED_ERROR
}

function getBackendErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return null
  }

  const message = error.response?.data?.message

  if (Array.isArray(message) && message.length > 0) {
    return message.join(', ')
  }

  if (typeof message === 'string' && message.trim()) {
    return message
  }

  return null
}

function mapSocialUserToAuthUser(user: AuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    profile: user.profile ?? null,
  }
}

async function fetchAuthenticatedUserFromBackend(): Promise<AuthUser> {
  try {
    const res = await api.get<BackendProfileResponse>('/profile/me')
    const profile = res.data.data
    const role = profile.user.role

    if (!validateRole(role)) {
      throw createUnauthorizedError()
    }

    return {
      id: profile.user_id,
      email: profile.user.email,
      role,
      profile: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
      },
    }
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      const meRes = await api.get<{ data: { id: string; email: string; role: string } }>('/auth/me')
      const me = meRes.data.data

      if (!validateRole(me.role)) {
        throw createUnauthorizedError()
      }

      return {
        id: me.id,
        email: me.email,
        role: me.role,
        profile: null,
      }
    }

    throw err
  }
}

async function exchangeGoogleFirebaseUser(firebaseUser: User): Promise<AuthUser> {
  const idToken = await firebaseUser.getIdToken()

  const res = await api.post<BackendAuthResponse>('/auth/social', {
    token: idToken,
    provider: 'google',
  })

  const { user } = res.data.data

  if (!validateRole(user.role)) {
    throw createUnauthorizedError()
  }

  return mapSocialUserToAuthUser(user)
}

export const useAuth = create<AuthStore>()((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: () => {
    let isActive = true
    let isBootstrapping = true

    const applyLoggedOutState = () => {
      if (!isActive) return
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }

    const applyUnauthorizedState = async () => {
      try {
        await signOut(auth)
      } catch {
        // ignore signOut errors
      }

      if (!isActive) return
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: UNAUTHORIZED_ERROR,
      })
    }

    const syncExistingFirebaseSession = async () => {
      if (!auth.currentUser) {
        applyLoggedOutState()
        return
      }

      try {
        const user = await fetchAuthenticatedUserFromBackend()

        if (!isActive) return
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        console.error('Error syncing existing Firebase session:', err)

        if (isUnauthorizedError(err)) {
          await applyUnauthorizedState()
          return
        }

        try {
          await signOut(auth)
        } catch {
          // ignore signOut errors
        }

        if (!isActive) return
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: getBackendErrorMessage(err) ?? null,
        })
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isActive || isBootstrapping) {
        return
      }

      if (!firebaseUser) {
        applyLoggedOutState()
        return
      }

      try {
        const user = await fetchAuthenticatedUserFromBackend()

        if (!isActive) return
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        console.error('onAuthStateChanged sync error:', err)

        if (isUnauthorizedError(err)) {
          await applyUnauthorizedState()
          return
        }

        try {
          await signOut(auth)
        } catch {
          // ignore signOut errors
        }

        if (!isActive) return
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: getBackendErrorMessage(err) ?? null,
        })
      }
    })

    void (async () => {
      try {
        const redirectResult = await getRedirectResult(auth)

        if (!isActive) return

        if (redirectResult?.user) {
          const user = await exchangeGoogleFirebaseUser(redirectResult.user)

          if (!isActive) return
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          return
        }

        await syncExistingFirebaseSession()
      } catch (err: unknown) {
        console.error('Auth initialize error:', err)

        if (isUnauthorizedError(err)) {
          await applyUnauthorizedState()
          return
        }

        if (err instanceof FirebaseError) {
          if (!isActive) return
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: `${err.code}: ${err.message}`,
          })
          return
        }

        if (axios.isAxiosError(err)) {
          try {
            await signOut(auth)
          } catch {
            // ignore signOut errors
          }

          if (!isActive) return
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: getBackendErrorMessage(err) ?? 'Error del backend',
          })
          return
        }

        try {
          await signOut(auth)
        } catch {
          // ignore signOut errors
        }

        if (!isActive) return
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Error al inicializar la sesión',
        })
      } finally {
        isBootstrapping = false
      }
    })()

    return () => {
      isActive = false
      unsubscribe()
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })

    try {
      const res = await api.post<BackendAuthResponse>('/auth/login', { email, password })
      const { access_token, user } = res.data.data

      if (!validateRole(user.role)) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: UNAUTHORIZED_ERROR,
        })
        return
      }

      await signInWithCustomToken(auth, access_token)

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number }; name?: string }
      const backendMessage = getBackendErrorMessage(err)

      let error = backendMessage ?? 'Credenciales inválidas'

      if (axiosError.response?.status === 423 || axiosError.name === 'ACCOUNT_BLOCKED') {
        error = 'ACCOUNT_BLOCKED'
      } else if (axiosError.response?.status === 429) {
        error = backendMessage ?? 'Demasiados intentos. Inténtalo más tarde.'
      }

      set({ isLoading: false, error })
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null })

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })

      await signInWithRedirect(auth, provider)
    } catch (err: unknown) {
      console.error('Google redirect login error:', err)

      if (err instanceof FirebaseError) {
        console.error('Firebase code:', err.code)
        console.error('Firebase message:', err.message)
        console.error('Firebase customData:', err.customData)
        set({ isLoading: false, error: `${err.code}: ${err.message}` })
        return
      }

      if (axios.isAxiosError(err)) {
        console.error('Axios response:', err.response?.data)
        set({
          isLoading: false,
          error: err.response?.data?.message ?? 'Error del backend',
        })
        return
      }

      set({ isLoading: false, error: 'Error al iniciar sesión con Google' })
    }
  },

  logout: async () => {
    try {
      const token = await getIdToken()
      if (token) {
        await api.post('/auth/logout')
      }
    } finally {
      await signOut(auth)
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }
  },

  clearError: () => set({ error: null }),
}))

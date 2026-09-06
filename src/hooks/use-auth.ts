import { create } from 'zustand'
import axios from 'axios'
import {
  signOut,
  signInWithPopup,
  signInWithCustomToken,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth, getIdToken } from '@/lib/firebase'
import { api } from '@/lib/api'
import { classifySessionValidationError } from '@/lib/auth-session-validation'
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

function validateRole(role: string): role is 'ADMIN' | 'SUPER_ADMIN' {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
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

let authOperationGeneration = 0
let pendingLogouts = 0
let firebaseMutation: Promise<unknown> = Promise.resolve()

function mutateFirebase<T>(operation: () => Promise<T>): Promise<T> {
  const result = firebaseMutation.then(operation, operation)
  firebaseMutation = result.then(() => undefined, () => undefined)
  return result
}

export const useAuth = create<AuthStore>()((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: () => {
    let validationGeneration = 0
    const handleValidationFailure = async (error: unknown, generation: number, operation: number) => {
      if (generation !== validationGeneration || operation !== authOperationGeneration) return
      const failure = classifySessionValidationError(error)
      if (failure === 'rejected') {
        try {
          await mutateFirebase(() => signOut(auth))
        } catch {
          // The backend rejection still wins if local Firebase cleanup fails.
        }
        if (generation !== validationGeneration || operation !== authOperationGeneration) return
      }
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error:
          failure === 'locked'
            ? 'ACCOUNT_BLOCKED'
            : failure === 'rejected'
              ? 'UNAUTHORIZED'
              : (getBackendErrorMessage(error) ?? 'No se pudo validar temporalmente la sesión'),
      })
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const generation = ++validationGeneration
      if (firebaseUser && pendingLogouts > 0) return
      const operation = authOperationGeneration
      const isCurrent = () => generation === validationGeneration && operation === authOperationGeneration
      if (!firebaseUser) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      set({ user: null, isAuthenticated: false, isLoading: true, error: null })

      // Page refresh — Firebase session exists, fetch profile from backend
      try {
        const res = await api.get<BackendProfileResponse>('/profile/me')
        if (!isCurrent()) return
        const profile = res.data.data
        const role = profile.user.role

        if (!validateRole(role)) {
          await mutateFirebase(() => signOut(auth))
          if (!isCurrent()) return
          set({ user: null, isAuthenticated: false, isLoading: false, error: 'UNAUTHORIZED' })
          return
        }

        const user: AuthUser = {
          id: profile.user_id,
          email: profile.user.email,
          role,
          profile: {
            first_name: profile.first_name,
            last_name: profile.last_name,
            avatar_url: profile.avatar_url,
          },
        }

        set({ user, isAuthenticated: true, isLoading: false, error: null })
      } catch (err) {
        if (!isCurrent()) return
        // Profile not found (404) — user exists but has no profile yet
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          try {
            const meRes = await api.get<{ data: { id: string; email: string; role: string } }>(
              '/auth/me'
            )
            if (!isCurrent()) return
            const me = meRes.data.data
            if (!validateRole(me.role)) {
              await mutateFirebase(() => signOut(auth))
              if (!isCurrent()) return
              set({ user: null, isAuthenticated: false, isLoading: false, error: 'UNAUTHORIZED' })
              return
            }
            set({
              user: {
                id: me.id,
                email: me.email,
                role: me.role as 'ADMIN' | 'SUPER_ADMIN',
                profile: null,
              },
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
            return
          } catch (meError) {
            await handleValidationFailure(meError, generation, operation)
            return
          }
        }
        await handleValidationFailure(err, generation, operation)
      }
    })

    return () => {
      validationGeneration++
      unsubscribe()
    }
  },

  login: async (email, password) => {
    const generation = ++authOperationGeneration
    set({ user: null, isAuthenticated: false, isLoading: true, error: null })
    try {
      // Backend handles Firebase auth server-side
      const res = await api.post<BackendAuthResponse>('/auth/login', { email, password })
      if (generation !== authOperationGeneration) return
      const { access_token, user } = res.data.data

      if (!validateRole(user.role)) {
        set({ user: null, isAuthenticated: false, isLoading: false, error: 'UNAUTHORIZED' })
        return
      }

      // Sign into Firebase client with the custom token so onAuthStateChanged picks it up
      await mutateFirebase(() => signInWithCustomToken(auth, access_token))
      if (generation !== authOperationGeneration) return

      set({ user, isAuthenticated: true, isLoading: false, error: null })
    } catch (err: unknown) {
      if (generation !== authOperationGeneration) return
      const axiosError = err as { response?: { status?: number }; name?: string }
      const backendMessage = getBackendErrorMessage(err)

      let error = backendMessage ?? (axiosError.response?.status === 401
        ? 'Credenciales inválidas'
        : 'No se pudo iniciar sesión temporalmente. Inténtalo de nuevo.')
      if (axiosError.response?.status === 423 || axiosError.name === 'ACCOUNT_BLOCKED') {
        error = 'ACCOUNT_BLOCKED'
      } else if (axiosError.response?.status === 429) {
        error = backendMessage ?? 'Demasiados intentos. Inténtalo más tarde.'
      }

      set({ isLoading: false, error })
    }
  },

  loginWithGoogle: async () => {
    const generation = ++authOperationGeneration
    set({ user: null, isAuthenticated: false, isLoading: true, error: null })

    try {
      const provider = new GoogleAuthProvider()
      const result = await mutateFirebase(() => signInWithPopup(auth, provider))
      if (generation !== authOperationGeneration) return
      const idToken = await result.user.getIdToken()
      if (generation !== authOperationGeneration) return

      const res = await api.post('/auth/social', {
        token: idToken,
        provider: 'google',
      })

      const { access_token, user } = res.data.data
      if (generation !== authOperationGeneration) return

      if (!validateRole(user.role)) {
        await mutateFirebase(() => signOut(auth))
        if (generation !== authOperationGeneration) return
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'UNAUTHORIZED',
        })
        return
      }

      await mutateFirebase(() => signInWithCustomToken(auth, access_token))
      if (generation !== authOperationGeneration) return

      set({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: user.profile ?? null,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (err: unknown) {
      if (generation !== authOperationGeneration) return

      if (err instanceof FirebaseError) {
        set({ isLoading: false, error: `${err.code}: ${err.message}` })
        return
      }

      if (axios.isAxiosError(err)) {
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
    const generation = ++authOperationGeneration
    pendingLogouts++
    set({ user: null, isAuthenticated: false, isLoading: false, error: null })
    try {
      const token = await getIdToken()
      if (generation !== authOperationGeneration) return
      if (token) {
        await api.post('/auth/logout')
      }
    } finally {
      try {
        if (generation === authOperationGeneration) {
          await mutateFirebase(() => signOut(auth))
          if (generation === authOperationGeneration) {
            set({ user: null, isAuthenticated: false, isLoading: false, error: null })
          }
        }
      } finally {
        pendingLogouts--
      }
    }
  },

  clearError: () => set({ error: null }),
}))

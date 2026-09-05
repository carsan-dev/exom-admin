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

export const useAuth = create<AuthStore>()((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: () => {
    let validationGeneration = 0
    const handleValidationFailure = async (error: unknown, generation: number) => {
      if (generation !== validationGeneration) return
      const failure = classifySessionValidationError(error)
      if (failure === 'rejected') {
        try {
          await signOut(auth)
        } catch {
          // The backend rejection still wins if local Firebase cleanup fails.
        }
        if (generation !== validationGeneration) return
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
      if (!firebaseUser) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      // Page refresh — Firebase session exists, fetch profile from backend
      try {
        const res = await api.get<BackendProfileResponse>('/profile/me')
        if (generation !== validationGeneration) return
        const profile = res.data.data
        const role = profile.user.role

        if (!validateRole(role)) {
          await signOut(auth)
          if (generation !== validationGeneration) return
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
        if (generation !== validationGeneration) return
        // Profile not found (404) — user exists but has no profile yet
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          try {
            const meRes = await api.get<{ data: { id: string; email: string; role: string } }>(
              '/auth/me'
            )
            if (generation !== validationGeneration) return
            const me = meRes.data.data
            if (!validateRole(me.role)) {
              await signOut(auth)
              if (generation !== validationGeneration) return
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
            await handleValidationFailure(meError, generation)
            return
          }
        }
        await handleValidationFailure(err, generation)
      }
    })

    return () => {
      validationGeneration++
      unsubscribe()
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      // Backend handles Firebase auth server-side
      const res = await api.post<BackendAuthResponse>('/auth/login', { email, password })
      const { access_token, user } = res.data.data

      if (!validateRole(user.role)) {
        set({ user: null, isAuthenticated: false, isLoading: false, error: 'UNAUTHORIZED' })
        return
      }

      // Sign into Firebase client with the custom token so onAuthStateChanged picks it up
      await signInWithCustomToken(auth, access_token)

      set({ user, isAuthenticated: true, isLoading: false, error: null })
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
      const result = await signInWithPopup(auth, provider)
      const idToken = await result.user.getIdToken()

      const res = await api.post('/auth/social', {
        token: idToken,
        provider: 'google',
      })

      const { access_token, user } = res.data.data

      if (!validateRole(user.role)) {
        await signOut(auth)
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'UNAUTHORIZED',
        })
        return
      }

      await signInWithCustomToken(auth, access_token)

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
      console.error('Google login error full:', err)

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
      set({ user: null, isAuthenticated: false, error: null })
    }
  },

  clearError: () => set({ error: null }),
}))

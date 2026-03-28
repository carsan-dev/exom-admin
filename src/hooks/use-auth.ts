import { create } from 'zustand'
import {
  signOut,
  signInWithPopup,
  signInWithCustomToken,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth, getIdToken } from '@/lib/firebase'
import { api } from '@/lib/api'
import type { AuthUser } from '@/types/auth'

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

export const useAuth = create<AuthStore>()((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      // Page refresh — Firebase session exists, fetch profile from backend
      try {
        const res = await api.get<BackendProfileResponse>('/profile/me')
        const profile = res.data.data
        const role = profile.user.role

        if (!validateRole(role)) {
          await signOut(auth)
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
      } catch {
        await signOut(auth)
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    })

    return unsubscribe
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

      let error = 'Credenciales inválidas'
      if (axiosError.response?.status === 423 || axiosError.name === 'ACCOUNT_BLOCKED') {
        error = 'ACCOUNT_BLOCKED'
      } else if (axiosError.response?.status === 429) {
        error = 'Demasiados intentos. Inténtalo más tarde.'
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

      const res = await api.post<BackendAuthResponse>('/auth/social', {
        token: idToken,
        provider: 'google',
      })
      const { user } = res.data.data

      if (!validateRole(user.role)) {
        await signOut(auth)
        set({ user: null, isAuthenticated: false, isLoading: false, error: 'UNAUTHORIZED' })
        return
      }

      set({ user, isAuthenticated: true, isLoading: false, error: null })
    } catch {
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

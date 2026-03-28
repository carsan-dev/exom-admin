import { create } from 'zustand'
import {
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { api } from '@/lib/api'
import type { AuthUser } from '@/types/auth'

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

async function syncWithBackend(endpoint: string): Promise<AuthUser> {
  const response = await api.post<{ data: AuthUser }>(endpoint)
  return response.data.data
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

      // Page refresh — re-sync with backend
      try {
        const user = await syncWithBackend('/auth/login')

        if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
          await signOut(auth)
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'UNAUTHORIZED',
          })
          return
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
      await signInWithEmailAndPassword(auth, email, password)
      const user = await syncWithBackend('/auth/login')

      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        await signOut(auth)
        set({ user: null, isAuthenticated: false, isLoading: false, error: 'UNAUTHORIZED' })
        return
      }

      set({ user, isAuthenticated: true, isLoading: false, error: null })
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; name?: string }

      let error = 'Credenciales inválidas'
      if (firebaseError.name === 'ACCOUNT_BLOCKED' || firebaseError.code === 'auth/user-disabled') {
        error = 'ACCOUNT_BLOCKED'
      } else if (firebaseError.code === 'auth/too-many-requests') {
        error = 'Demasiados intentos. Inténtalo más tarde.'
      }

      set({ isLoading: false, error })
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null })
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      const user = await syncWithBackend('/auth/social')

      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
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
      await api.post('/auth/logout')
    } finally {
      await signOut(auth)
      set({ user: null, isAuthenticated: false, error: null })
    }
  },

  clearError: () => set({ error: null }),
}))

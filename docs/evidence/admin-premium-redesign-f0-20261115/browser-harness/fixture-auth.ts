import { create } from 'zustand'
import type { AuthUser } from '../../../../src/types/auth'
import { harnessAuth, harnessRole } from './boot'
import { SESSION_USERS } from './fx-people'

const profile = { ...SESSION_USERS[harnessRole] }
const user: AuthUser = { id: profile.id, email: profile.email, role: harnessRole, profile: harnessAuth === 'noprofile' ? null : { first_name: profile.first_name, last_name: profile.last_name, avatar_url: null } }

interface FixtureAuthStore {
  user: AuthUser | null; isAuthenticated: boolean; isLoading: boolean; error: string | null
  initialize: () => () => void
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}
export const useAuth = create<FixtureAuthStore>((set) => ({
  user: harnessAuth === 'none' ? null : user,
  isAuthenticated: harnessAuth !== 'none',
  isLoading: false,
  error: null,
  initialize: () => () => undefined,
  login: async () => undefined,
  loginWithGoogle: async () => undefined,
  logout: async () => { set({ user: null, isAuthenticated: false }) },
  clearError: () => set({ error: null }),
}))

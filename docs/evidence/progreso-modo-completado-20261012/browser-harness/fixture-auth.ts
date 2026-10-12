import { create } from 'zustand'
import type { AuthUser } from '../../../../src/types/auth'

const user: AuthUser = { id: '33333333-3333-4333-8333-333333333333', email: 'staff@example.invalid', role: 'SUPER_ADMIN', profile: null }
interface FixtureAuthStore {
  user: AuthUser | null; isAuthenticated: boolean; isLoading: boolean; error: string | null
  logout: () => Promise<void>; initialize: () => () => void
}
export const useAuth = create<FixtureAuthStore>(() => ({
  user, isAuthenticated: true, isLoading: false, error: null,
  logout: async () => { useAuth.setState({ user: null, isAuthenticated: false }) },
  initialize: () => () => undefined,
}))

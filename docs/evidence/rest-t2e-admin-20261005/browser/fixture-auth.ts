import { create } from 'zustand'
import type { AuthUser } from '../../../../src/types/auth'
import { FIXTURE_IDS } from '../../../../src/features/progress/follow-up-tasks/fixtures'

let generation = 1
const user: AuthUser = { id: FIXTURE_IDS.staff, email: 'staff@example.invalid', role: 'SUPER_ADMIN', profile: null }
export function fixtureGeneration() { return generation }
export function changeFixtureIdentity() {
  generation++
  useAuth.setState({ user: { ...user, id: FIXTURE_IDS.otherStaff }, isAuthenticated: true })
}
interface FixtureAuthStore {
  user: AuthUser | null; isAuthenticated: boolean; isLoading: boolean; error: string | null
  logout: () => Promise<void>; initialize: () => () => void
}
export const useAuth = create<FixtureAuthStore>(() => ({
  user,
  isAuthenticated: true, isLoading: false, error: null,
  logout: async () => {
    generation++
    useAuth.setState({ user: null, isAuthenticated: false })
  },
  initialize: () => () => undefined,
}))

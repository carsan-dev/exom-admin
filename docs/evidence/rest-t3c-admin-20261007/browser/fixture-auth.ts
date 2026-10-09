import { create } from 'zustand'
import type { AuthUser } from '../../../../src/types/auth'
import { FIXTURE_IDS as ids } from '../../../../src/features/progress/follow-up-tasks/fixtures'

let generation = 1
const user: AuthUser = { id: ids.staff, email: 'staff@example.invalid', role: 'ADMIN',
  profile: { first_name: 'Profesional', last_name: 'Sintética', avatar_url: null } }
interface FixtureAuth {
  user: AuthUser | null; isAuthenticated: boolean; isLoading: boolean; error: string | null
  initialize: () => () => void; logout: () => Promise<void>
}
export function fixtureGeneration() { return generation }
export function changeIdentity(other = true) {
  generation++
  useAuth.setState({ user: { ...user, id: other ? ids.otherStaff : ids.staff }, isAuthenticated: true })
}
export const useAuth = create<FixtureAuth>(() => ({
  user, isAuthenticated: true, isLoading: false, error: null,
  initialize: () => () => undefined,
  logout: async () => { generation++; useAuth.setState({ user: null, isAuthenticated: false }) },
}))

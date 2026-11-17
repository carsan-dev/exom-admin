// Sustituye src/lib/firebase.ts: sin initializeApp, sin red. Solo la forma mínima que usan api.ts y login-page.
import type { Auth } from 'firebase/auth'

export const auth = { currentUser: null } as unknown as Auth

export async function getIdToken(): Promise<string | null> {
  return null
}

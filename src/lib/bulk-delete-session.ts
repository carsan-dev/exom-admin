import { auth } from './firebase'
import { type BulkDeleteSummary, runBulkDelete, type RunBulkDeleteOptions } from './bulk-delete'

/**
 * Pins the Firebase user signed in right now. The returned check fails once another user signs in
 * (e.g. from another tab) or the user signs out, or if nobody was signed in when pinned. It
 * complements the per-request ownership check of the `api` interceptors, which only covers a
 * single request.
 */
export function pinFirebaseSession(): () => boolean {
  const pinnedUid = auth.currentUser?.uid
  return () => pinnedUid !== undefined && auth.currentUser?.uid === pinnedUid
}

/**
 * Runs a bulk deletion bound to the session that started it: before every request it checks
 * that the same Firebase user is still signed in, so work started by user A is never sent with
 * the credentials of user B. Shared by every feature's bulk-delete mutation.
 */
export function runSessionBoundBulkDelete(
  options: Omit<RunBulkDeleteOptions, 'shouldContinue'>
): Promise<BulkDeleteSummary> {
  return runBulkDelete({ ...options, shouldContinue: pinFirebaseSession() })
}

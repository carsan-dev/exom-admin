/**
 * Redirection to /login after a 401, with a narrow way to postpone it.
 *
 * A bulk deletion holds the redirect while it runs so that, when the session expires halfway,
 * the page is not reloaded before the user has seen what was deleted. Only a 401 of a request
 * that opted in (`deferrable`, i.e. a request of the batch) starts the postponement; any other
 * 401 still redirects at once. Once a redirect is pending the session is known to be invalid,
 * so every later 401 joins it instead of navigating on its own. The redirect runs as soon as the
 * last hold is released; the holder must release it on every path (result closed, error,
 * unmount).
 *
 * Module state, shared by every caller of the `api` instance:
 * - `holds`: number of holds not yet released (written by `holdLoginRedirect` and `release`).
 * - `redirectPending`: a 401 arrived while held (written by `redirectToLogin` and `release`).
 */
let holds = 0
let redirectPending = false

export interface LoginRedirectHold {
  /** Releases the hold (idempotent). Runs the postponed redirect if this was the last hold. */
  release: () => void
  /** A 401 arrived while this hold was active and the redirect is waiting for its release. */
  isRedirectPending: () => boolean
}

function navigateToLogin() {
  if (window.location.pathname === '/login') return
  window.location.href = '/login'
}

/**
 * Sends the user to /login after a 401. Postponed only while a hold is active and either the
 * request opted in (`deferrable`) or a redirect is already pending.
 */
export function redirectToLogin({ deferrable }: { deferrable: boolean }) {
  if (holds > 0 && (deferrable || redirectPending)) {
    redirectPending = true
    return
  }
  navigateToLogin()
}

/** Postpones the 401 redirect of opted-in requests until the returned hold is released. */
export function holdLoginRedirect(): LoginRedirectHold {
  holds += 1
  let released = false
  return {
    isRedirectPending: () => !released && redirectPending,
    release: () => {
      if (released) return
      released = true
      holds -= 1
      if (holds === 0 && redirectPending) {
        redirectPending = false
        navigateToLogin()
      }
    },
  }
}

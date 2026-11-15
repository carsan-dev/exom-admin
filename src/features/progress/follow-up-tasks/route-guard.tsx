import { useContext, useEffect, useRef, type RefObject } from 'react'
import { UNSAFE_DataRouterContext, useBlocker, type Blocker } from 'react-router'
import type { NavigationGuard } from './task-editor'

// The product uses createBrowserRouter. Lightweight embedding fixtures may use
// MemoryRouter; the page's direct controls cover that non-data-router case.
export function TaskRouteGuard({ guard }: { guard: RefObject<NavigationGuard | null> }) {
  const dataRouter = useContext(UNSAFE_DataRouterContext)
  return dataRouter ? <DataRouteGuard guard={guard} /> : null
}
function DataRouteGuard({ guard }: { guard: RefObject<NavigationGuard | null> }) {
  const dataRouter = useContext(UNSAFE_DataRouterContext)
  // The predicate only decides whether to block; the question is asked once the blocker is blocked.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const before = new URLSearchParams(currentLocation.search)
    const after = new URLSearchParams(nextLocation.search)
    const leaving = currentLocation.pathname !== nextLocation.pathname || before.get('clientId') !== after.get('clientId') || before.get('section') !== after.get('section')
    return leaving && Boolean(guard.current?.blocks())
  })
  const latest = useRef<Blocker>(blocker)
  const asking = useRef(false)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  useEffect(() => {
    latest.current = blocker
    // A navigation blocked while the question is open is answered by that same question, as in the
    // app-wide UnsavedChangesGuard: the answer applies to the latest blocked navigation.
    if (blocker.state !== 'blocked' || asking.current) return
    const editor = guard.current
    // Every blocked navigation ends proceeding or reset, never pending: a declined or unanswerable
    // question cancels it, rather than leaving a latent transition that could resume after a
    // different draft/client is opened.
    if (!editor) { blocker.reset(); return }
    asking.current = true
    const answer = (accepted: boolean) => {
      asking.current = false
      const current = latest.current
      // An unmounted guard no longer owns a blocker; a navigation that completed meanwhile left it unblocked.
      if (!mounted.current || current.state !== 'blocked') return
      // React commits router updates in a transition, so the rendered blocker can lag behind the
      // router. Answer only while it is still the router's own blocker: otherwise the router already
      // ended that navigation, or blocked a newer one that this effect asks about once committed.
      if (dataRouter && !Array.from(dataRouter.router.state.blockers.values()).includes(current)) return
      try {
        if (accepted) current.proceed()
        else current.reset()
      } catch {
        // proceed() only throws when the router no longer holds this navigation blocked (it already
        // ended or is proceeding), so nothing is left pending; it must not become an unhandled rejection.
      }
    }
    void editor.confirmLeave().then(answer, () => answer(false))
  }, [blocker, guard, dataRouter])
  return null
}

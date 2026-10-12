import { useContext, useEffect, type RefObject } from 'react'
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router'
import type { NavigationGuard } from './task-editor'

// The product uses createBrowserRouter. Lightweight embedding fixtures may use
// MemoryRouter; the page's direct controls cover that non-data-router case.
export function TaskRouteGuard({ guard }: { guard: RefObject<NavigationGuard | null> }) {
  const dataRouter = useContext(UNSAFE_DataRouterContext)
  return dataRouter ? <DataRouteGuard guard={guard} /> : null
}
function DataRouteGuard({ guard }: { guard: RefObject<NavigationGuard | null> }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const before = new URLSearchParams(currentLocation.search)
    const after = new URLSearchParams(nextLocation.search)
    const leaving = currentLocation.pathname !== nextLocation.pathname || before.get('clientId') !== after.get('clientId') || before.get('section') !== after.get('section')
    return leaving && Boolean(guard.current && !guard.current())
  })
  useEffect(() => {
    // A declined confirmation cancels navigation, rather than leaving a latent
    // transition that could resume after a different draft/client is opened.
    if (blocker.state === 'blocked') blocker.reset()
  }, [blocker])
  return null
}

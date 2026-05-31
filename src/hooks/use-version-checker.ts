import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchBuildVersion } from '@/lib/build-version'

const POLL_INTERVAL_MS = 60_000
const FOCUS_THROTTLE_MS = 15_000

export function useVersionChecker() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const requestInFlight = useRef(false)
  const lastCheckAt = useRef(0)

  const checkVersion = useCallback(async (throttle = false) => {
    const now = Date.now()
    if (requestInFlight.current || (throttle && now - lastCheckAt.current < FOCUS_THROTTLE_MS)) return

    requestInFlight.current = true
    lastCheckAt.current = now

    try {
      const payload = await fetchBuildVersion()
      if (payload?.version !== undefined && payload.version !== __APP_VERSION__) {
        setIsUpdateAvailable(true)
      }
    } finally {
      requestInFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (import.meta.env.DEV) return

    void checkVersion()
    const intervalId = window.setInterval(() => void checkVersion(), POLL_INTERVAL_MS)
    const handleFocus = () => void checkVersion(true)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkVersion(true)
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkVersion])

  return { isUpdateAvailable }
}

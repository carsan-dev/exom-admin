import { useCallback, useSyncExternalStore } from 'react'

/**
 * Suscribe un componente a una media query. Sin `window.matchMedia` (jsdom, SSR)
 * devuelve `defaultValue`.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {}
      }
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return defaultValue
    }
    return window.matchMedia(query).matches
  }, [query, defaultValue])

  return useSyncExternalStore(subscribe, getSnapshot, () => defaultValue)
}

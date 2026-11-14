import { useSyncExternalStore } from 'react'

const WIDE_QUERY = '(min-width: 1024px)'

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined
  const media = window.matchMedia(WIDE_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(WIDE_QUERY).matches
}

/** True on screens wide enough to show the row actions inline; falls back to true without matchMedia. */
export function useWideScreen() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}

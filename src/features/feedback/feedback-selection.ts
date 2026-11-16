import type { FeedbackItem } from './types'

/**
 * Siguiente feedback PENDIENTE de la lista cargada, en el orden de la lista:
 * el primero pendiente tras `fromId` y, si no hay posterior, el primero pendiente
 * restante. `fromId` nunca se devuelve. `null` si no queda ninguno.
 */
export function getNextPendingItem(items: FeedbackItem[], fromId: string): FeedbackItem | null {
  const start = items.findIndex((item) => item.id === fromId)
  const isCandidate = (item: FeedbackItem) => item.status === 'PENDING' && item.id !== fromId

  return (
    items.slice(start + 1).find(isCandidate) ??
    items.slice(0, Math.max(start, 0)).find(isCandidate) ??
    null
  )
}

/** Vecino en la lista cargada (`-1` anterior, `1` siguiente); `null` en los extremos o si no está en la lista. */
export function getSiblingItem(items: FeedbackItem[], id: string, step: -1 | 1): FeedbackItem | null {
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) return null
  return items[index + step] ?? null
}

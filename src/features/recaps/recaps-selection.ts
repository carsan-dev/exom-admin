import type { RecapListItem } from './types'

type SelectableRecap = Pick<RecapListItem, 'id' | 'status' | 'archived_at'>

/** Recap que admite respuesta rápida: enviado por el cliente y sin archivar. */
export function isRecapPendingReview(item: Pick<RecapListItem, 'status' | 'archived_at'>) {
  return item.status === 'SUBMITTED' && !item.archived_at
}

/**
 * Recap ya revisado cuyo comentario para el cliente y nota interna se pueden editar (sin archivar).
 * No forma parte de la cola de pendientes: `getNextPendingRecap` no lo usa.
 */
export function isRecapEditableAfterReview(item: Pick<RecapListItem, 'status' | 'archived_at'>) {
  return item.status === 'REVIEWED' && !item.archived_at
}

/**
 * ¿Cambia el comentario para el cliente o la nota interna respecto a lo guardado? Compara sin espacios
 * en los extremos: es la regla de «Guardar cambios» de un recap revisado (página de detalle y panel).
 */
export function hasRecapReplyChanges(
  current: { clientFeedback: string; internalNote: string },
  saved: { clientFeedback: string; internalNote: string },
) {
  return current.internalNote.trim() !== saved.internalNote.trim() || current.clientFeedback.trim() !== saved.clientFeedback.trim()
}

/**
 * Siguiente recap POR REVISAR de la lista cargada, en el orden de la lista:
 * el primero pendiente tras `fromId` y, si no hay posterior, el primero pendiente
 * restante. `fromId` nunca se devuelve. `null` si no queda ninguno.
 */
export function getNextPendingRecap<T extends SelectableRecap>(items: T[], fromId: string): T | null {
  const start = items.findIndex((item) => item.id === fromId)
  const isCandidate = (item: T) => isRecapPendingReview(item) && item.id !== fromId

  return (
    items.slice(start + 1).find(isCandidate) ??
    items.slice(0, Math.max(start, 0)).find(isCandidate) ??
    null
  )
}

/** id del botón de la fila del listado, para devolverle el foco al cerrar el diálogo. */
export function getRecapRowId(id: string) {
  return `recap-row-${id}`
}

/** Vecino en la lista cargada (`-1` anterior, `1` siguiente); `null` en los extremos o si no está en la lista. */
export function getSiblingRecap<T extends Pick<RecapListItem, 'id'>>(items: T[], id: string, step: -1 | 1): T | null {
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) return null
  return items[index + step] ?? null
}

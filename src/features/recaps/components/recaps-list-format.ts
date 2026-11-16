export function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'

  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatWeekRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)

  return `${startDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })} - ${endDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`
}

export function truncateText(value: string | null, maxLength = 72) {
  if (!value) return 'Sin comentario'
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
}

export function getRecapDetailPath(id: string, returnTo?: string) {
  return `/recaps/${id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`
}

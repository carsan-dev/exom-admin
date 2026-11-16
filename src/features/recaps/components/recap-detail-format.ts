export function formatDate(dateStr: string | null, fallback = '—') {
  if (!dateStr) return fallback

  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
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

export function formatNotes(value: string | null, emptyCopy = 'Sin notas del cliente') {
  return value?.trim() || emptyCopy
}

import type { FeedbackItem } from './types'

export function getFeedbackClientName(item: FeedbackItem) {
  const { profile } = item.client
  if (profile?.first_name || profile?.last_name) {
    return `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
  }
  return item.client.email
}

export function formatFeedbackDate(dateStr: string, month: '2-digit' | 'long' = '2-digit') {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month,
    year: 'numeric',
  })
}

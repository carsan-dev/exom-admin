import type { SubscriberFormValues } from './schemas'
import type { BaseSubscriber, UpdateSubscriberPayload } from './types'

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

/** Only the fields that differ from the stored subscriber; empty object means nothing to save. */
export function buildUpdatePayload(
  subscriber: BaseSubscriber,
  values: SubscriberFormValues,
): UpdateSubscriberPayload {
  const payload: UpdateSubscriberPayload = {}
  const name = normalizeName(values.name)
  const email = values.email.trim()
  const days = Number(values.days_per_week)
  const notes = values.notes.trim()

  if (name !== subscriber.name) payload.name = name
  if (email.toLowerCase() !== subscriber.email) payload.email = email
  if (values.goal !== subscriber.goal) payload.goal = values.goal
  if (days !== subscriber.days_per_week) payload.days_per_week = days
  if (notes !== (subscriber.notes ?? '')) payload.notes = notes === '' ? null : notes

  return payload
}

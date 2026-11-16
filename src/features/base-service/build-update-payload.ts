import { getServiceScope } from './labels'
import type { SubscriberFormValues } from './schemas'
import type { BaseSubscriber, ServiceScope, UpdateSubscriberPayload } from './types'

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

/** Only the fields that differ from the stored subscriber; empty object means nothing to save. */
export function buildUpdatePayload(
  subscriber: BaseSubscriber,
  values: Omit<SubscriberFormValues, 'service_scope'> & { service_scope?: ServiceScope },
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
  if (values.service_scope !== undefined && values.service_scope !== getServiceScope(subscriber)) {
    payload.service_scope = values.service_scope
  }
  if (notes !== (subscriber.notes ?? '')) payload.notes = notes === '' ? null : notes

  return payload
}

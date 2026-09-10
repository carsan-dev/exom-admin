// Keep a key for an uncertain attempt. A new payload, owner or successful
// completion starts a new operation; no passwords are persisted to storage.
export function createIdentityRequest() {
  let current: { fingerprint: string; key: string } | undefined
  return {
    headers(owner: string | undefined, payload: unknown) {
      const fingerprint = JSON.stringify([owner, payload])
      if (current?.fingerprint !== fingerprint) current = { fingerprint, key: crypto.randomUUID() }
      return { 'Idempotency-Key': current.key }
    },
    complete() {
      current = undefined
    },
    failure(error: unknown) {
      if (
        axios.isAxiosError<{ code?: string }>(error) &&
        error.response?.data.code === 'IDENTITY_OPERATION_COMPENSATED'
      )
        current = undefined
    },
  }
}
import axios from 'axios'

export function getFirstErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  if ('message' in error && typeof error.message === 'string' && error.message) return error.message
  if (Array.isArray(error)) {
    for (const item of error) {
      const msg = getFirstErrorMessage(item)
      if (msg) return msg
    }
    return undefined
  }
  for (const val of Object.values(error)) {
    const msg = getFirstErrorMessage(val)
    if (msg) return msg
  }
  return undefined
}

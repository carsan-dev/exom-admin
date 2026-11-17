export function getFirstErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  if ('message' in error && typeof error.message === 'string' && error.message) {
    return error.message
  }

  if (Array.isArray(error)) {
    for (const item of error) {
      const nestedMessage = getFirstErrorMessage(item)

      if (nestedMessage) {
        return nestedMessage
      }
    }

    return undefined
  }

  for (const value of Object.values(error)) {
    const nestedMessage = getFirstErrorMessage(value)

    if (nestedMessage) {
      return nestedMessage
    }
  }

  return undefined
}

export interface BuildVersionPayload {
  version: string
}

export async function fetchBuildVersion(): Promise<BuildVersionPayload | null> {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload: unknown = await response.json()
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('version' in payload) ||
      typeof payload.version !== 'string' ||
      payload.version.trim() === ''
    ) {
      return null
    }

    return { version: payload.version.trim() }
  } catch {
    return null
  }
}

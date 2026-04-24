import type { SetURLSearchParams } from 'react-router'

export type PaginationSearchParamUpdates = Record<string, number | undefined>

export function getPageSearchParam(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function buildPaginationSearchParams(
  currentSearchParams: URLSearchParams,
  updates: PaginationSearchParamUpdates,
) {
  const nextSearchParams = new URLSearchParams(currentSearchParams)

  for (const [key, page] of Object.entries(updates)) {
    if (page === undefined) {
      continue
    }

    if (!Number.isInteger(page) || page <= 1) {
      nextSearchParams.delete(key)
      continue
    }

    nextSearchParams.set(key, String(page))
  }

  return nextSearchParams
}

export function hasSearchParamsChanged(
  currentSearchParams: URLSearchParams,
  nextSearchParams: URLSearchParams,
) {
  return currentSearchParams.toString() !== nextSearchParams.toString()
}

export function replacePaginationSearchParams(
  setSearchParams: SetURLSearchParams,
  updates: PaginationSearchParamUpdates,
) {
  setSearchParams(
    (currentSearchParams) => {
      const nextSearchParams = buildPaginationSearchParams(currentSearchParams, updates)

      return hasSearchParamsChanged(currentSearchParams, nextSearchParams)
        ? nextSearchParams
        : currentSearchParams
    },
    { replace: true },
  )
}

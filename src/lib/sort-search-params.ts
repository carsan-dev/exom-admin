import type { SetURLSearchParams } from 'react-router'

export type SortDir = 'asc' | 'desc'

export interface SortState {
  sort_by?: string
  sort_dir: SortDir
}

export function getSortSearchParams(searchParams: URLSearchParams): SortState {
  const sortBy = searchParams.get('sort_by') ?? undefined
  const sortDir = searchParams.get('sort_dir') === 'desc' ? 'desc' : 'asc'

  return { sort_by: sortBy, sort_dir: sortDir }
}

export function toggleSortSearchParams(
  setSearchParams: SetURLSearchParams,
  field: string,
) {
  setSearchParams((currentSearchParams) => {
    const nextSearchParams = new URLSearchParams(currentSearchParams)
    const currentField = nextSearchParams.get('sort_by')
    const currentDir = nextSearchParams.get('sort_dir') === 'desc' ? 'desc' : 'asc'
    const nextDir: SortDir = currentField === field && currentDir === 'asc' ? 'desc' : 'asc'

    nextSearchParams.set('sort_by', field)
    nextSearchParams.set('sort_dir', nextDir)
    nextSearchParams.delete('page')

    return nextSearchParams
  })
}

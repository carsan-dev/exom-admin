import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createSearchParams, useSearchParams, type SetURLSearchParams } from 'react-router'
import {
  type FilterSectionConfig,
  type FilterValues,
  type UseListFiltersResult,
  useListFilters,
} from '@/components/filters'
import { decodeClientsUrlFilters, encodeClientsUrlFilters } from './clients-url-filters'

interface SerializedSearchParamsState {
  latest: URLSearchParams
  pending: string[]
  seen: string
}

/**
 * `useSearchParams` whose setter always builds on the newest URL written by
 * this page, even before the router has re-rendered with it. React Router's
 * functional setter reads the search params of the render that created it, so
 * two writes in the same commit (for example a filter write and a page reset)
 * would otherwise overwrite each other. Writes that would not change the URL
 * are skipped.
 */
export function useClientsSearchParams(): [URLSearchParams, SetURLSearchParams] {
  const [searchParams, setSearchParams] = useSearchParams()
  const renderedRef = useRef(searchParams)
  const stateRef = useRef<SerializedSearchParamsState | null>(null)

  if (stateRef.current === null) {
    stateRef.current = { latest: searchParams, pending: [], seen: searchParams.toString() }
  }

  useLayoutEffect(() => {
    renderedRef.current = searchParams
  })

  const serializedSetSearchParams = useCallback<SetURLSearchParams>(
    (nextInit, navigateOptions) => {
      const state = stateRef.current as SerializedSearchParamsState
      const rendered = renderedRef.current
      const renderedString = rendered.toString()

      if (renderedString !== state.seen) {
        state.seen = renderedString
        const index = state.pending.indexOf(renderedString)

        if (index >= 0) {
          state.pending = state.pending.slice(index + 1)
        } else {
          // Navigation that did not come from this page: it becomes the base.
          state.pending = []
        }
      }

      if (state.pending.length === 0) {
        state.latest = rendered
      }

      const nextSearchParams = createSearchParams(
        typeof nextInit === 'function' ? nextInit(new URLSearchParams(state.latest)) : nextInit,
      )
      const nextString = nextSearchParams.toString()

      if (nextString === state.latest.toString()) {
        return
      }

      state.latest = nextSearchParams
      state.pending.push(nextString)
      setSearchParams(nextSearchParams, navigateOptions)
    },
    [setSearchParams],
  )

  return [searchParams, serializedSetSearchParams]
}

interface ClientsUrlFiltersOptions {
  param: string
  sections: FilterSectionConfig[]
  searchParams: URLSearchParams
  setSearchParams: SetURLSearchParams
  enabled?: boolean
}

interface ClientsUrlFiltersSync {
  observed: string
  written: string
  pending: string[]
  /** Encoded local state last taken from the URL; null once the user changes it. */
  fromUrl: string | null
}

export interface ClientsUrlFiltersResult {
  search: string
  setSearch: (value: string) => void
  filters: UseListFiltersResult
  /**
   * True while search and filters are exactly the state last taken from the URL
   * (deep link, reload or a navigation from outside the page) and the user has
   * not changed them since. Pages use it to keep the page number of that URL
   * instead of treating the change as a user filter change.
   */
  isFromUrl: () => boolean
}

/**
 * Search text and filters of one tab, mirrored in a single URL parameter.
 * The URL is read once to initialise the local state (deep link, reload,
 * returning from a detail page) and is re-applied when it changes from
 * outside the page. Local changes are written back with `replace`, so typing
 * does not add history entries. The input stays bound to local state, so the
 * cursor does not jump while the URL catches up.
 */
export function useClientsUrlFilters({
  param,
  sections,
  searchParams,
  setSearchParams,
  enabled = true,
}: ClientsUrlFiltersOptions): ClientsUrlFiltersResult {
  const urlValue = enabled ? (searchParams.get(param) ?? '') : ''
  const [initial] = useState(() => decodeClientsUrlFilters(urlValue, sections))
  const [search, setSearch] = useState(initial.search)
  const filters = useListFilters(sections, initial.values)
  const encoded = enabled ? encodeClientsUrlFilters({ search, values: filters.values }, sections) : ''
  const syncRef = useRef<ClientsUrlFiltersSync | null>(null)

  if (syncRef.current === null) {
    syncRef.current = {
      observed: urlValue,
      written: urlValue,
      pending: [],
      fromUrl: encodeClientsUrlFilters(initial, sections),
    }
  }

  useEffect(() => {
    const sync = syncRef.current as ClientsUrlFiltersSync

    if (!enabled) {
      return
    }

    if (urlValue !== sync.observed) {
      sync.observed = urlValue
      const index = sync.pending.indexOf(urlValue)

      if (index >= 0) {
        sync.pending = sync.pending.slice(index + 1)
      } else {
        // The URL changed from outside the page: it wins over local state.
        sync.pending = []
        sync.written = urlValue
        const next = decodeClientsUrlFilters(urlValue, sections)
        sync.fromUrl = encodeClientsUrlFilters(next, sections)
        setSearch(next.search)
        filters.clear()
        for (const [key, value] of Object.entries(next.values) as [string, FilterValues[string]][]) {
          filters.setValue(key, value)
        }
        return
      }
    }

    if (urlValue === sync.written) {
      sync.pending = []
    }

    if (encoded === sync.written) {
      return
    }

    if (encoded !== sync.fromUrl) {
      sync.fromUrl = null
    }

    sync.written = encoded
    sync.pending.push(encoded)
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)

        if (encoded) {
          next.set(param, encoded)
        } else {
          next.delete(param)
        }

        return next
      },
      { replace: true },
    )
  }, [enabled, urlValue, encoded, setSearchParams, sections, filters, param])

  const isFromUrl = useCallback(() => syncRef.current?.fromUrl != null, [])

  return { search, setSearch, filters, isFromUrl }
}

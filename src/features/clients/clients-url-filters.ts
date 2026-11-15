import type { FilterSectionConfig, FilterValues } from '@/components/filters'

/**
 * Compact URL format for the search text and filters of one Clients/Users tab.
 *
 * `q:<search>;<sectionKey>:<value>;...` in a fixed order (search first, then the
 * configured sections). Multi values are joined with `,`; date and number
 * ranges are written as `<from>~<to>` with either side optional. The
 * delimiters `% ; : , ~` inside values are percent-escaped, so arbitrary search
 * text round-trips. An empty string means "no search and no filters".
 */
export interface ClientsUrlFiltersState {
  search: string
  values: FilterValues
}

const SEARCH_KEY = 'q'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DELIMITERS = /[%;:,~]/g

function escapeValue(value: string) {
  return value.replace(DELIMITERS, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`)
}

function unescapeValue(value: string): string | null {
  if (/[;:,~]/.test(value)) {
    return null
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function encodeRangeSide(value: string | number | null | undefined) {
  return value == null ? '' : escapeValue(String(value))
}

export function encodeClientsUrlFilters(
  state: ClientsUrlFiltersState,
  sections: FilterSectionConfig[],
): string {
  const parts: string[] = []

  if (state.search.trim() !== '') {
    parts.push(`${SEARCH_KEY}:${escapeValue(state.search)}`)
  }

  for (const section of sections) {
    const value = state.values[section.key]

    if (!Array.isArray(value)) {
      continue
    }

    if (section.type === 'multi') {
      const entries = value.filter((entry): entry is string => typeof entry === 'string' && entry !== '')

      if (entries.length > 0) {
        parts.push(`${section.key}:${entries.map(escapeValue).join(',')}`)
      }
      continue
    }

    const [from, to] = value as [string | number | null, string | number | null]

    if ((from == null || from === '') && (to == null || to === '')) {
      continue
    }

    parts.push(`${section.key}:${encodeRangeSide(from)}~${encodeRangeSide(to)}`)
  }

  return parts.join(';')
}

function decodeMulti(
  section: Extract<FilterSectionConfig, { type: 'multi' }>,
  raw: string,
): string[] | null {
  const allowed = section.options ? new Set(section.options.map((option) => option.value)) : null
  const entries: string[] = []

  for (const piece of raw.split(',')) {
    const entry = unescapeValue(piece)

    if (!entry || entries.includes(entry) || (allowed && !allowed.has(entry))) {
      continue
    }

    entries.push(entry)
  }

  return entries.length > 0 ? entries : null
}

function decodeRange(raw: string): [string, string] | null {
  const sides = raw.split('~')

  if (sides.length !== 2) {
    return null
  }

  const [from, to] = sides.map(unescapeValue)

  if (from === null || to === null || (from === '' && to === '')) {
    return null
  }

  return [from, to]
}

function decodeDateRange(raw: string): [string | null, string | null] | null {
  const range = decodeRange(raw)

  if (!range || range.some((side) => side !== '' && !DATE_PATTERN.test(side))) {
    return null
  }

  return [range[0] || null, range[1] || null]
}

function decodeNumberRange(raw: string): [number | null, number | null] | null {
  const range = decodeRange(raw)

  if (!range) {
    return null
  }

  const [from, to] = range.map((side) => (side === '' ? null : Number(side)))

  if ((from !== null && !Number.isFinite(from)) || (to !== null && !Number.isFinite(to))) {
    return null
  }

  return [from, to]
}

export function decodeClientsUrlFilters(
  raw: string | null,
  sections: FilterSectionConfig[],
): ClientsUrlFiltersState {
  const state: ClientsUrlFiltersState = { search: '', values: {} }

  if (!raw) {
    return state
  }

  const seen = new Set<string>()

  for (const part of raw.split(';')) {
    const separator = part.indexOf(':')

    if (separator <= 0) {
      continue
    }

    const key = part.slice(0, separator)
    const value = part.slice(separator + 1)

    if (seen.has(key)) {
      continue
    }
    seen.add(key)

    if (key === SEARCH_KEY) {
      const search = unescapeValue(value)
      state.search = search && search.trim() !== '' ? search : ''
      continue
    }

    const section = sections.find((candidate) => candidate.key === key)
    const decoded =
      section?.type === 'multi'
        ? decodeMulti(section, value)
        : section?.type === 'date-range'
          ? decodeDateRange(value)
          : section?.type === 'range'
            ? decodeNumberRange(value)
            : null

    if (section && decoded) {
      state.values[section.key] = decoded
    }
  }

  return state
}

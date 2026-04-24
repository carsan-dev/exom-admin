import type { FilterSectionConfig, FilterValues } from './types'

export function filtersToApiParams(
  values: FilterValues,
  sections: FilterSectionConfig[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}

  for (const section of sections) {
    const value = values[section.key]

    if (value == null) {
      continue
    }

    if (section.type === 'multi' && Array.isArray(value) && value.length > 0) {
      out[section.key] = value
    }

    if (section.type === 'range' && Array.isArray(value)) {
      const [min, max] = value as [number | null, number | null]

      if (min != null) {
        out[`${section.key}_min`] = min
      }

      if (max != null) {
        out[`${section.key}_max`] = max
      }
    }

    if (section.type === 'date-range' && Array.isArray(value)) {
      const [from, to] = value as [string | null, string | null]

      if (from) {
        out[`${section.key}_from`] = from
      }

      if (to) {
        out[`${section.key}_to`] = to
      }
    }
  }

  return out
}

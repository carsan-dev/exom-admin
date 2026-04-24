import { useState } from 'react'
import type {
  ActiveChip,
  DateRangeFilterValue,
  FilterSectionConfig,
  FilterValue,
  FilterValues,
  RangeFilterValue,
  UseListFiltersResult,
} from './types'

function isValueEmpty(value: FilterValue | undefined) {
  if (value == null) {
    return true
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return true
    }

    return value.every((entry) => entry == null || entry === '')
  }

  return value === ''
}

function getMultiLabel(section: Extract<FilterSectionConfig, { type: 'multi' }>, value: string) {
  return section.options?.find((option) => option.value === value)?.label ?? value
}

function formatRangeChip(
  section: Extract<FilterSectionConfig, { type: 'range' }>,
  value: RangeFilterValue
) {
  const [min, max] = value
  const unitSuffix = section.unit ? ` ${section.unit}` : ''

  if (min != null && max != null) {
    if (min === max) {
      return `${section.label}: ${min}${unitSuffix}`
    }

    return `${section.label}: ${min}-${max}${unitSuffix}`
  }

  if (min != null) {
    return `${section.label}: desde ${min}${unitSuffix}`
  }

  if (max != null) {
    return `${section.label}: hasta ${max}${unitSuffix}`
  }

  return section.label
}

function formatDateRangeChip(
  section: Extract<FilterSectionConfig, { type: 'date-range' }>,
  value: DateRangeFilterValue
) {
  const [from, to] = value

  if (from && to) {
    return `${section.label}: ${from} - ${to}`
  }

  if (from) {
    return `${section.label}: desde ${from}`
  }

  if (to) {
    return `${section.label}: hasta ${to}`
  }

  return section.label
}

export function useListFilters(
  sections: FilterSectionConfig[],
  initial: FilterValues = {}
): UseListFiltersResult {
  const [values, setValues] = useState<FilterValues>(initial)

  const setValue = (key: string, value: FilterValue) => {
    setValues((current) => {
      const next = { ...current }

      if (isValueEmpty(value)) {
        delete next[key]
        return next
      }

      next[key] = value
      return next
    })
  }

  const clear = () => {
    setValues({})
  }

  const clearKey = (key: string) => {
    setValues((current) => {
      if (!(key in current)) {
        return current
      }

      const next = { ...current }
      delete next[key]
      return next
    })
  }

  let activeCount = 0
  const chips: ActiveChip[] = []

  for (const section of sections) {
    const sectionValue = values[section.key]

    if (isValueEmpty(sectionValue)) {
      continue
    }

    activeCount += 1

    if (section.type === 'multi' && Array.isArray(sectionValue)) {
      for (const selectedValue of sectionValue) {
        const value = String(selectedValue)

        chips.push({
          sectionKey: section.key,
          value,
          label: getMultiLabel(section, value),
          onRemove: () => {
            const currentValues = values[section.key]

            if (!Array.isArray(currentValues)) {
              clearKey(section.key)
              return
            }

            const nextValues = (currentValues as string[]).filter((entry) => entry !== value)
            setValue(section.key, nextValues)
          },
        })
      }
    }

    if (section.type === 'range' && Array.isArray(sectionValue)) {
      chips.push({
        sectionKey: section.key,
        value: section.key,
        label: formatRangeChip(section, sectionValue as RangeFilterValue),
        onRemove: () => clearKey(section.key),
      })
    }

    if (section.type === 'date-range' && Array.isArray(sectionValue)) {
      chips.push({
        sectionKey: section.key,
        value: section.key,
        label: formatDateRangeChip(section, sectionValue as DateRangeFilterValue),
        onRemove: () => clearKey(section.key),
      })
    }
  }

  return {
    values,
    setValue,
    clear,
    clearKey,
    activeCount,
    chips,
  }
}

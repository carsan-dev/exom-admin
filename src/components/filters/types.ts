export interface FilterOption {
  value: string
  label: string
}

export type MultiFilterValue = string[]
export type RangeFilterValue = [number | null, number | null]
export type DateRangeFilterValue = [string | null, string | null]
export type FilterValue = MultiFilterValue | RangeFilterValue | DateRangeFilterValue | string | null

export type FilterSectionConfig =
  | {
      type: 'multi'
      key: string
      label: string
      options?: FilterOption[]
      isLoading?: boolean
      searchable?: boolean
    }
  | {
      type: 'range'
      key: string
      label: string
      min: number
      max: number
      step?: number
      unit?: string
    }
  | {
      type: 'date-range'
      key: string
      label: string
    }

export type FilterValues = Record<string, FilterValue>

export interface ActiveChip {
  sectionKey: string
  value: string
  label: string
  onRemove: () => void
}

export interface UseListFiltersResult {
  values: FilterValues
  setValue: (key: string, value: FilterValue) => void
  clear: () => void
  clearKey: (key: string) => void
  activeCount: number
  chips: ActiveChip[]
}

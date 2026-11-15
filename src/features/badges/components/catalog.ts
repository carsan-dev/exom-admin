import type { CatalogValueWithColor } from '@/features/trainings/types'

export type CatalogId =
  | 'muscle-groups'
  | 'equipment'
  | 'training-types'
  | 'training-tags'
  | 'diet-tags'
  | 'diet-badges'

export interface CatalogItem {
  catalogId: CatalogId
  value: string
  color?: string
}

export interface CatalogView {
  id: CatalogId
  title: string
  description: string
  badgeLabel: string
  canDelete: boolean
  supportsColor: boolean
  values: CatalogValueWithColor[]
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

export function normalizeCatalogLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function isValidCatalogColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

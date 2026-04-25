import type { CSSProperties } from 'react'
import type { Exercise, Level } from '../exercises/types'

export const DEFAULT_TRAINING_TYPE = 'FUERZA'

export const TRAINING_ACCENT_SWATCHES = [
  '#C5E384',
  '#D2EB99',
  '#A9C85D',
  '#8CCB68',
  '#E5BE58',
  '#D76C5E',
  '#7FB5D8',
  '#9B7FCC',
  '#552015',
  '#7A2E1E',
  '#184822',
  '#2A6A35',
] as const

export type TrainingType = string

const TRAINING_ACCENT_COLOR_REGEX = /^#?(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/
const DARK_PREVIEW_TEXT = '#231208'
const LIGHT_PREVIEW_TEXT = '#F7F9EF'

export function normalizeTrainingTypeLabel(type: string) {
  return type.trim().replace(/\s+/g, ' ')
}

export function getTrainingTypeKey(type: string) {
  return normalizeTrainingTypeLabel(type)
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
}

export function normalizeTrainingTypes(types: string[]) {
  const seen = new Set<string>()
  const normalizedTypes: string[] = []

  for (const type of types) {
    const normalizedType = normalizeTrainingTypeLabel(type)
    const typeKey = getTrainingTypeKey(normalizedType)

    if (!normalizedType || seen.has(typeKey)) {
      continue
    }

    seen.add(typeKey)
    normalizedTypes.push(normalizedType)
  }

  return normalizedTypes
}

export function resolveTrainingTypes(training: { type?: string | null; types?: string[] | null }) {
  return normalizeTrainingTypes([
    ...(training.types ?? []),
    ...(training.type ? [training.type] : []),
  ])
}

export function getTrainingTypeLabel(type: string) {
  const normalizedType = normalizeTrainingTypeLabel(type)

  switch (getTrainingTypeKey(normalizedType)) {
    case 'fuerza':
      return 'Fuerza'
    case 'cardio':
      return 'Cardio'
    case 'hiit':
      return 'HIIT'
    case 'flexibilidad':
      return 'Flexibilidad'
    default:
      return normalizedType
  }
}

export function normalizeTrainingAccentColor(value: string | null | undefined) {
  if (value == null) {
    return null
  }

  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return null
  }

  if (!TRAINING_ACCENT_COLOR_REGEX.test(normalizedValue)) {
    return null
  }

  return `#${normalizedValue.replace(/^#/, '').toUpperCase()}`
}

function hexToRgb(value: string) {
  const normalizedValue = normalizeTrainingAccentColor(value)

  if (!normalizedValue) {
    return null
  }

  const hex = normalizedValue.slice(1)
  const expandedHex =
    hex.length === 6 ? `${hex}FF` : hex.length === 8 ? hex : null

  if (!expandedHex) {
    return null
  }

  return {
    red: parseInt(expandedHex.slice(0, 2), 16),
    green: parseInt(expandedHex.slice(2, 4), 16),
    blue: parseInt(expandedHex.slice(4, 6), 16),
    alpha: parseInt(expandedHex.slice(6, 8), 16) / 255,
  }
}

function rgba(value: string, alpha: number) {
  const rgb = hexToRgb(value)

  if (!rgb) {
    return undefined
  }

  return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`
}

export function getTrainingAccentTextColor(color: string | null | undefined) {
  const rgb = hexToRgb(color ?? '')

  if (!rgb) {
    return DARK_PREVIEW_TEXT
  }

  const luminance = (0.299 * rgb.red + 0.587 * rgb.green + 0.114 * rgb.blue) / 255
  return luminance >= 0.62 ? DARK_PREVIEW_TEXT : LIGHT_PREVIEW_TEXT
}

export function getTrainingAccentStyle(
  color: string | null | undefined,
  variant: 'soft' | 'solid' = 'soft'
): CSSProperties | undefined {
  const normalizedColor = normalizeTrainingAccentColor(color)

  if (!normalizedColor) {
    return undefined
  }

  if (variant === 'solid') {
    return {
      backgroundColor: normalizedColor,
      borderColor: normalizedColor,
      color: getTrainingAccentTextColor(normalizedColor),
    }
  }

  return {
    borderColor: rgba(normalizedColor, 0.3),
    backgroundColor: rgba(normalizedColor, 0.12),
    color: normalizedColor,
  }
}

export function getTrainingTypeBadgeClass(type: string) {
  switch (getTrainingTypeKey(type)) {
    case 'fuerza':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-500'
    case 'cardio':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-500'
    case 'hiit':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-500'
    case 'flexibilidad':
      return 'border-purple-500/30 bg-purple-500/10 text-purple-500'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

export interface TrainingExercise {
  id: string
  order: number
  sets: number
  reps_or_duration: string
  rest_seconds: number
  exercise: Exercise
}

export interface Training {
  id: string
  name: string
  type: string
  types: string[]
  accentColor?: string | null
  level: Level
  estimated_duration_min: number | null
  estimated_calories: number | null
  total_volume: number | null
  warmup_description: string | null
  warmup_duration_min: number | null
  cooldown_description: string | null
  tags: string[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  exercises: TrainingExercise[]
}

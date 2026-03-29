export const LEVEL_OPTIONS = ['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'] as const
export type Level = (typeof LEVEL_OPTIONS)[number]

export const LEVEL_LABELS: Record<Level, string> = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
}

export const MUSCLE_GROUPS = [
  'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps',
  'Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Gemelos',
  'Core', 'Antebrazos', 'Trapecio', 'Posterior',
] as const

export const EQUIPMENT_OPTIONS = [
  'Mancuernas', 'Barra', 'Máquina', 'Cable', 'Kettlebell',
  'Banda elástica', 'Peso corporal', 'TRX', 'Banco',
  'Barra EZ', 'Disco', 'Polea',
] as const

export interface Exercise {
  id: string
  name: string
  muscle_groups: string[]
  equipment: string[]
  level: Level
  video_url: string | null
  video_stream_id: string | null
  thumbnail_url: string | null
  technique_text: string | null
  common_errors_text: string | null
  explanation_text: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function getLevelBadgeClass(level: string) {
  switch (level) {
    case 'PRINCIPIANTE':
      return 'border-status-success/30 bg-status-success/10 text-status-success'
    case 'INTERMEDIO':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-600'
    case 'AVANZADO':
      return 'border-status-error/30 bg-status-error/10 text-status-error'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

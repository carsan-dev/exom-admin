import type { TrainingNameSource } from '../types'

export const CURRENT_NAME_HINT = 'No hay copia histórica; se muestra el nombre actual del catálogo'

/** Muted tag shown next to a name that comes from the current catalog. Absent source renders nothing. */
export function NameSourceTag({ source }: { source: TrainingNameSource | null | undefined }) {
  if (source !== 'current_catalog') return null
  return <span title={CURRENT_NAME_HINT} className="ml-2 whitespace-nowrap text-xs font-normal text-muted-foreground">nombre actual</span>
}

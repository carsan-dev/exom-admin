import { Tag } from '@/components/ui/tag'
import { LEVEL_LABELS } from '../../exercises/types'
import { ResourceApprovalIndicator } from '../../approval-requests/components/resource-approval-indicator'
import {
  getTrainingTypeKey,
  getTrainingTypeLabel,
  normalizeTrainingAccentColor,
  resolveTrainingTypes,
  type Training,
} from '../types'

export interface TrainingApprovalSummary {
  pending_approval_actions: string[]
}

/** Punto de color de la fila: el color propio del entrenamiento y, si no, el del catálogo de tipos. */
function resolveTypeColor(
  training: Training,
  type: string,
  colorMap: Map<string, string>
): string | undefined {
  const accent = normalizeTrainingAccentColor(training.accentColor)
  return accent ?? normalizeTrainingAccentColor(colorMap.get(getTrainingTypeKey(type))) ?? undefined
}

/** Nombre del entrenamiento con su color y el indicador de aprobación pendiente. */
export function TrainingNameBlock({
  training,
  approval,
}: {
  training: Training
  approval?: TrainingApprovalSummary
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      {training.accentColor ? (
        <span
          aria-hidden="true"
          className="mt-1.5 size-2.5 flex-none rounded-full border border-border-strong"
          style={{ backgroundColor: training.accentColor }}
        />
      ) : null}
      <div className="min-w-0 space-y-1.5">
        <p className="break-words font-medium text-foreground [overflow-wrap:anywhere]">
          {training.name}
        </p>
        <ResourceApprovalIndicator pendingActions={approval?.pending_approval_actions ?? []} />
      </div>
    </div>
  )
}

/** Hasta dos tipos y un «+N» con el resto; guion si no hay ninguno. */
export function TrainingTypeTags({
  training,
  colorMap,
}: {
  training: Training
  colorMap: Map<string, string>
}) {
  const types = resolveTrainingTypes(training)

  if (types.length === 0) return <span className="text-xs text-foreground-muted">—</span>

  return (
    <div className="flex flex-wrap gap-1">
      {types.slice(0, 2).map((type) => (
        <Tag key={type} color={resolveTypeColor(training, type, colorMap)}>
          {getTrainingTypeLabel(type)}
        </Tag>
      ))}
      {types.length > 2 && (
        <Tag className="text-foreground-muted" title={types.slice(2).map(getTrainingTypeLabel).join(', ')}>
          +{types.length - 2}
        </Tag>
      )}
    </div>
  )
}

export function TrainingLevelTag({ level }: { level: Training['level'] }) {
  return <Tag>{LEVEL_LABELS[level]}</Tag>
}

/** Hasta dos etiquetas y un «+N» con el resto; guion si no hay ninguna. */
export function TrainingTagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-xs text-foreground-muted">—</span>

  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 2).map((tag) => (
        <Tag key={tag}>{tag}</Tag>
      ))}
      {tags.length > 2 && (
        <Tag className="text-foreground-muted" title={tags.slice(2).join(', ')}>
          +{tags.length - 2}
        </Tag>
      )}
    </div>
  )
}

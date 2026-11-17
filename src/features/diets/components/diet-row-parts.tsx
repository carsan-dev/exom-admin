import { Tag } from '@/components/ui/tag'
import { ResourceApprovalIndicator } from '../../approval-requests/components/resource-approval-indicator'
import { getTrainingTypeKey, normalizeTrainingAccentColor } from '../../trainings/types'
import type { Diet } from '../types'
import { formatMealShortName, getDietMealsCount } from './diet-row-format'

export interface DietApprovalSummary {
  pending_approval_actions: string[]
}

/** Color del punto de cada tipo de comida (mismos tonos que las insignias anteriores). */
const MEAL_TYPE_COLORS: Record<string, string> = {
  BREAKFAST: 'var(--status-warning)',
  LUNCH: 'var(--status-success)',
  SNACK: 'var(--accent-line)',
  DINNER: 'var(--status-info)',
}

/** Nombre de la dieta con el indicador de aprobación pendiente. */
export function DietNameBlock({ diet, approval }: { diet: Diet; approval?: DietApprovalSummary }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="break-words font-medium text-foreground [overflow-wrap:anywhere]">{diet.name}</p>
      <ResourceApprovalIndicator pendingActions={approval?.pending_approval_actions ?? []} />
    </div>
  )
}

/** Hasta tres comidas (con el punto de su tipo) y un «+N»; después, hasta dos insignias nutricionales. */
export function DietMealTags({ diet, badgeColorMap }: { diet: Diet; badgeColorMap: Map<string, string> }) {
  const mealsCount = getDietMealsCount(diet)
  const nutritionalBadges = Array.from(
    new Set(diet.meals.flatMap((meal) => meal.nutritional_badges ?? []))
  )

  return (
    <div className="flex flex-wrap gap-1">
      {diet.meals.slice(0, 3).map((meal, index) => (
        <Tag key={`${meal.type}-${index}`} color={MEAL_TYPE_COLORS[meal.type]}>
          {formatMealShortName(meal.name)}
        </Tag>
      ))}
      {mealsCount > 3 && <Tag className="text-foreground-muted">+{mealsCount - 3}</Tag>}
      {mealsCount === 0 && <span className="text-xs text-foreground-muted">—</span>}
      {nutritionalBadges.slice(0, 2).map((badge) => (
        <Tag
          key={badge}
          className="text-foreground-muted"
          color={normalizeTrainingAccentColor(badgeColorMap.get(getTrainingTypeKey(badge))) ?? undefined}
        >
          {badge}
        </Tag>
      ))}
    </div>
  )
}

/** Hasta dos etiquetas internas y un «+N» con el resto; guion si no hay ninguna. */
export function DietTagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-xs text-foreground-muted">—</span>

  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 2).map((tag) => (
        <Tag key={tag}>{tag}</Tag>
      ))}
      {tags.length > 2 && <Tag className="text-foreground-muted">+{tags.length - 2}</Tag>}
    </div>
  )
}

export function DietGroupTag({ diet }: { diet: Diet }) {
  return diet.group ? (
    <Tag className="max-w-40 truncate">{diet.group.name}</Tag>
  ) : (
    <span className="text-xs text-foreground-muted">Sin grupo</span>
  )
}

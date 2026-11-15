import { Tag } from '@/components/ui/tag'
import { getAchievementModeLabel, getAchievementRuleLabel } from '../types'
import { ResourceApprovalIndicator } from '../../approval-requests/components/resource-approval-indicator'
import { AchievementIcon } from './achievement-icon'
import { AchievementRowActions } from './achievement-row-actions'
import type { AchievementsListProps } from './achievements-table'

/** Filas apiladas por debajo de md; mismos datos y acciones que la tabla. */
export function AchievementsMobileList({
  items,
  approvalById = {},
  onEdit,
  onViewUsers,
  onGrant,
  onDelete,
  canDelete,
}: AchievementsListProps) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((achievement) => (
        <li key={achievement.id} className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <AchievementIcon name={achievement.name} url={achievement.icon_url} />
            <div className="min-w-0 space-y-1.5">
              <p className="break-words font-medium text-foreground">{achievement.name}</p>
              <ResourceApprovalIndicator pendingActions={approvalById[achievement.id]?.pending_approval_actions ?? []} />
              <p className="break-words text-sm text-foreground-secondary">{achievement.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Tag>{getAchievementRuleLabel(achievement.criteria_type, achievement.rule_config)}</Tag>
            <Tag>{getAchievementModeLabel(achievement.criteria_type)}</Tag>
          </div>
          <p className="text-xs text-foreground-muted">
            Meta {achievement.criteria_value} · {achievement.unlocked_count}{' '}
            {achievement.unlocked_count === 1 ? 'cliente' : 'clientes'}
          </p>
          <AchievementRowActions
            achievement={achievement}
            onEdit={onEdit}
            onViewUsers={onViewUsers}
            onGrant={onGrant}
            onDelete={onDelete}
            canDelete={canDelete}
          />
        </li>
      ))}
    </ul>
  )
}

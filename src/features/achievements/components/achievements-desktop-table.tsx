import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { getAchievementModeLabel, getAchievementRuleLabel } from '../types'
import { ResourceApprovalIndicator } from '../../approval-requests/components/resource-approval-indicator'
import { AchievementIcon } from './achievement-icon'
import { AchievementRowActions } from './achievement-row-actions'
import type { AchievementsListProps } from './achievements-table'

/** Tabla desde md; meta y modo pasan a una línea bajo la descripción hasta xl. */
export function AchievementsDesktopTable({
  items,
  approvalById = {},
  onEdit,
  onViewUsers,
  onGrant,
  onDelete,
  canDelete,
}: AchievementsListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Logro</TableHead>
          <TableHead>Regla</TableHead>
          <TableHead className="hidden xl:table-cell">Meta</TableHead>
          <TableHead className="hidden xl:table-cell">Modo</TableHead>
          <TableHead>Usuarios</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((achievement) => (
          <TableRow key={achievement.id}>
            <TableCell className="align-top">
              <div className="flex items-start gap-3">
                <AchievementIcon name={achievement.name} url={achievement.icon_url} />
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-foreground">{achievement.name}</p>
                  <ResourceApprovalIndicator pendingActions={approvalById[achievement.id]?.pending_approval_actions ?? []} />
                  <p className="max-w-sm text-sm text-foreground-secondary">{achievement.description}</p>
                  <p className="text-xs text-foreground-muted xl:hidden">
                    Meta {achievement.criteria_value} · {getAchievementModeLabel(achievement.criteria_type)}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="align-top">
              <Tag>{getAchievementRuleLabel(achievement.criteria_type, achievement.rule_config)}</Tag>
            </TableCell>
            <TableCell className="hidden align-top text-sm tabular-nums text-foreground-secondary xl:table-cell">
              {achievement.criteria_value}
            </TableCell>
            <TableCell className="hidden align-top xl:table-cell">
              <Tag>{getAchievementModeLabel(achievement.criteria_type)}</Tag>
            </TableCell>
            <TableCell className="align-top">
              <span className="text-sm font-medium tabular-nums text-foreground">{achievement.unlocked_count}</span>
              <span className="ml-1 text-sm text-foreground-secondary">
                {achievement.unlocked_count === 1 ? 'cliente' : 'clientes'}
              </span>
            </TableCell>
            <TableCell className="align-top">
              <AchievementRowActions
                achievement={achievement}
                onEdit={onEdit}
                onViewUsers={onViewUsers}
                onGrant={onGrant}
                onDelete={onDelete}
                canDelete={canDelete}
                className="max-w-[16rem] justify-end"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

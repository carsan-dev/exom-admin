import { Tag } from '@/components/ui/tag'
import { getChallengeRuleLabel, getChallengeScopeLabel, getChallengeTypeLabel } from '../types'
import { ResourceApprovalIndicator } from '../../approval-requests/components/resource-approval-indicator'
import { formatDeadline } from './challenge-display'
import { ChallengeProgressMeter } from './challenge-progress-meter'
import { ChallengeRowActions } from './challenge-row-actions'
import type { ChallengesListProps } from './challenges-table'

/** Filas apiladas por debajo de md; mismos datos y acciones que la tabla. */
export function ChallengesMobileList({
  items,
  approvalById = {},
  onEdit,
  onAssign,
  onViewProgress,
  onDelete,
}: ChallengesListProps) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((challenge) => (
        <li key={challenge.id} className="space-y-3 py-4">
          <div className="space-y-1.5">
            <p className="break-words font-medium text-foreground">{challenge.title}</p>
            <ResourceApprovalIndicator pendingActions={approvalById[challenge.id]?.pending_approval_actions ?? []} />
            <p className="break-words text-sm text-foreground-secondary">{challenge.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Tag>{getChallengeTypeLabel(challenge.type)}</Tag>
            <Tag>{challenge.is_manual ? 'Manual' : 'Automático'}</Tag>
          </div>
          <p className="text-xs text-foreground-muted">
            {getChallengeRuleLabel(challenge.rule_key)} · {getChallengeScopeLabel(challenge.is_global)} ·{' '}
            {formatDeadline(challenge.deadline)}
          </p>
          <ChallengeProgressMeter challenge={challenge} />
          <ChallengeRowActions
            challenge={challenge}
            onEdit={onEdit}
            onAssign={onAssign}
            onViewProgress={onViewProgress}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ul>
  )
}

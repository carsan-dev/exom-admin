import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { getChallengeRuleLabel, getChallengeScopeLabel, getChallengeTypeLabel } from '../types'
import { ResourceApprovalIndicator } from '../../approval-requests/components/resource-approval-indicator'
import { formatDeadline } from './challenge-display'
import { ChallengeProgressMeter } from './challenge-progress-meter'
import { ChallengeRowActions } from './challenge-row-actions'
import type { ChallengesListProps } from './challenges-table'

/** Tabla desde md; las columnas secundarias pasan a una línea bajo el título hasta xl. */
export function ChallengesDesktopTable({
  items,
  approvalById = {},
  onEdit,
  onAssign,
  onViewProgress,
  onDelete,
}: ChallengesListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Reto</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="hidden xl:table-cell">Modo</TableHead>
          <TableHead className="hidden xl:table-cell">Alcance</TableHead>
          <TableHead>Progreso</TableHead>
          <TableHead className="hidden xl:table-cell">Límite</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((challenge) => (
          <TableRow key={challenge.id}>
            <TableCell className="align-top">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{challenge.title}</p>
                  <Tag>{challenge.is_manual ? 'Manual' : 'Automático'}</Tag>
                  <ResourceApprovalIndicator pendingActions={approvalById[challenge.id]?.pending_approval_actions ?? []} />
                </div>
                <p className="max-w-lg text-sm text-foreground-secondary">{challenge.description}</p>
                <p className="text-xs text-foreground-muted xl:hidden">
                  {getChallengeRuleLabel(challenge.rule_key)} · {getChallengeScopeLabel(challenge.is_global)} ·{' '}
                  {formatDeadline(challenge.deadline)}
                </p>
              </div>
            </TableCell>
            <TableCell className="align-top">
              <Tag>{getChallengeTypeLabel(challenge.type)}</Tag>
            </TableCell>
            <TableCell className="hidden align-top text-sm text-foreground-secondary xl:table-cell">
              {getChallengeRuleLabel(challenge.rule_key)}
            </TableCell>
            <TableCell className="hidden align-top text-sm text-foreground-secondary xl:table-cell">
              {getChallengeScopeLabel(challenge.is_global)}
            </TableCell>
            <TableCell className="align-top">
              <ChallengeProgressMeter challenge={challenge} className="min-w-[160px]" />
            </TableCell>
            <TableCell className="hidden align-top text-sm tabular-nums text-foreground-secondary xl:table-cell">
              {formatDeadline(challenge.deadline)}
            </TableCell>
            <TableCell className="align-top">
              <ChallengeRowActions
                challenge={challenge}
                onEdit={onEdit}
                onAssign={onAssign}
                onViewProgress={onViewProgress}
                onDelete={onDelete}
                className="max-w-[16rem] justify-end"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

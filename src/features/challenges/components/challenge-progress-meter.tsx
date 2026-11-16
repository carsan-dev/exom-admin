import { cn } from '@/lib/utils'
import { getChallengeProgressVariant, type ChallengeListItem } from '../types'
import { getProgressClass } from './challenge-display'

export function ChallengeProgressMeter({ challenge, className }: { challenge: ChallengeListItem; className?: string }) {
  const variant = getChallengeProgressVariant(challenge.completion_rate)
  const width = Math.min(challenge.completion_rate, 100)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3 text-xs tabular-nums text-foreground-muted">
        <span>
          {challenge.completed_clients}/{challenge.assigned_clients} clientes
        </span>
        <span>{challenge.completion_rate}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
        aria-label={`Clientes que han completado ${challenge.title}`}
        className="h-1.5 rounded-none bg-border"
      >
        <div
          className={cn('h-1.5 rounded-none transition-all', getProgressClass(variant))}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getApprovalActionLabel } from '../types'

interface ResourceApprovalIndicatorProps {
  pendingActions: string[]
  className?: string
}

export function ResourceApprovalIndicator({ pendingActions, className }: ResourceApprovalIndicatorProps) {
  if (pendingActions.length === 0) {
    return null
  }

  const tooltipText = pendingActions
    .map((action) => `${getApprovalActionLabel(action)} pendiente de aprobación`)
    .join(' · ')

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn('gap-1 border-amber-500/20 bg-amber-500/10 text-amber-700', className)}
        >
          <AlertTriangle className="h-3 w-3" />
          Pendiente
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  )
}

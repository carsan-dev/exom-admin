import { ErrorState } from '@/components/page'
import type { AssignmentsViewMode } from '../types'

interface AssignmentsPeriodErrorCardProps {
  viewMode: AssignmentsViewMode
  message: string
  onRetry: () => void
}

export function AssignmentsPeriodErrorCard({
  viewMode,
  message,
  onRetry,
}: AssignmentsPeriodErrorCardProps) {
  return (
    <ErrorState
      className="border-y border-border"
      title={viewMode === 'week' ? 'No se ha podido cargar la semana' : 'No se ha podido cargar el mes'}
      description={message}
      onRetry={onRetry}
    />
  )
}

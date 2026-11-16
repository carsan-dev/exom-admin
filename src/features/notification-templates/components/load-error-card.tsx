import { ErrorState } from '@/components/page'
import { getApiErrorMessage } from '../api'

interface LoadErrorCardProps {
  error: unknown
  onRetry: () => void
}

export function LoadErrorCard({ error, onRetry }: LoadErrorCardProps) {
  return (
    <ErrorState
      className="border-y border-border"
      title="No se pudieron cargar las plantillas"
      description={getApiErrorMessage(error, 'Reintenta en unos segundos')}
      onRetry={onRetry}
    />
  )
}

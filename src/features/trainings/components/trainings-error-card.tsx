import { ErrorState } from '@/components/page'

interface TrainingsErrorCardProps {
  message: string
  onRetry: () => void
}

export function TrainingsErrorCard({ message, onRetry }: TrainingsErrorCardProps) {
  return (
    <ErrorState
      className="border-y border-border"
      title="No se ha podido cargar el catálogo"
      description={message}
      onRetry={onRetry}
    />
  )
}

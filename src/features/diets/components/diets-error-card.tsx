import { ErrorState } from '@/components/page'

interface DietsErrorCardProps {
  message: string
  onRetry: () => void
}

export function DietsErrorCard({ message, onRetry }: DietsErrorCardProps) {
  return (
    <ErrorState
      className="border-y border-border"
      title="No se ha podido cargar el catálogo"
      description={message}
      onRetry={onRetry}
    />
  )
}

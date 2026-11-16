import { ErrorState } from '@/components/page'

interface AssignmentsClientsErrorCardProps {
  isSuperAdmin: boolean
  message: string
  onRetry: () => void
}

export function AssignmentsClientsErrorCard({
  isSuperAdmin,
  message,
  onRetry,
}: AssignmentsClientsErrorCardProps) {
  return (
    <ErrorState
      className="border-y border-border"
      title={isSuperAdmin ? 'No se ha podido cargar el listado de clientes' : 'No se ha podido cargar la cartera'}
      description={message}
      onRetry={onRetry}
    />
  )
}

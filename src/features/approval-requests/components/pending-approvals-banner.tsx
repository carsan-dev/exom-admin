import { Link } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMyApprovalRequests } from '../api'

export function PendingApprovalsBanner() {
  const pendingQuery = useMyApprovalRequests({ status: 'PENDING', page: 1, limit: 1 })
  const pendingCount = pendingQuery.data?.total ?? 0

  if (pendingCount === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-status-warning/30 bg-status-warning-soft p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-status-warning-soft p-2 text-status-warning">
          <ShieldAlert aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            Tienes {pendingCount} solicitud{pendingCount === 1 ? '' : 'es'} pendiente{pendingCount === 1 ? '' : 's'} de aprobación
          </p>
          <p className="text-sm text-muted-foreground">
            Puedes revisar el motivo de la solicitud, cancelar una pendiente o ver por qué fue rechazada o falló.
          </p>
        </div>
      </div>

      <Button asChild variant="outline">
        <Link to="/approval-requests">Ver solicitudes</Link>
      </Button>
    </div>
  )
}

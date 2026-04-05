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
    <div className="flex flex-col gap-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-500/15 p-2 text-amber-700">
          <ShieldAlert className="h-5 w-5" />
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

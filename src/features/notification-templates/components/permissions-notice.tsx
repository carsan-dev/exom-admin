import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function PermissionsNotice() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Plantillas de notificaciones</h1>
        <p className="text-sm text-muted-foreground">
          Solo super admins pueden cambiar plantillas.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 p-6 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
          <p>No tienes permisos para modificar plantillas.</p>
        </CardContent>
      </Card>
    </div>
  )
}

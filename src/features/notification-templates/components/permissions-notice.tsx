import { Bell, ShieldOff } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState, PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'

export function PermissionsNotice() {
  return (
    <div>
      <PageHeader
        title="Plantillas de notificaciones"
        description="Solo super admins pueden cambiar plantillas."
      />
      <EmptyState
        className="border-y border-border"
        icon={<ShieldOff aria-hidden="true" />}
        title="No tienes permisos para modificar plantillas."
        description="Puedes seguir usando las plantillas guardadas al enviar una notificación."
        action={
          <Button variant="secondary" className="max-md:h-11" asChild>
            <Link to="/notifications">
              <Bell aria-hidden="true" />
              Ir a Notificaciones
            </Link>
          </Button>
        }
      />
    </div>
  )
}

import { EmptyState, PageHeader } from '@/components/page'

export function PermissionsNotice() {
  return (
    <div>
      <PageHeader
        title="Plantillas de notificaciones"
        description="Solo super admins pueden cambiar plantillas."
      />
      <EmptyState
        className="border-y border-border"
        title="No tienes permisos para modificar plantillas."
      />
    </div>
  )
}

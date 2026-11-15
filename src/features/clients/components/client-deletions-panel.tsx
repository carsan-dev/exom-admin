import { Button } from '@/components/ui/button'
import { useClientDeletions } from '../deletion-api'

export function ClientDeletionsPanel() {
  const query = useClientDeletions()
  if (query.isError) return <div role="alert" className="flex flex-col gap-3 border-y border-border py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
    <span>No se pudo consultar el estado de las eliminaciones.</span> <Button variant="outline" size="sm" className="max-md:h-11 self-start" onClick={() => query.refetch()}>Actualizar estado</Button>
  </div>
  if (!query.data?.length) return null
  return <section className="space-y-3 border-y border-border py-4" aria-label="Eliminaciones recientes">
    <h2 className="font-display text-lg font-bold uppercase leading-none text-foreground">Eliminaciones recientes</h2>
    <p className="text-[13px] text-foreground-secondary">La limpieza pendiente se reintenta automáticamente. Hasta 100 operaciones; las completadas se muestran durante 7 días.</p>
    <ul className="divide-y divide-border border-t border-border">
      {query.data.map((operation) => <li key={operation.id} className="min-w-0 space-y-1 py-3 text-sm">
        <p className="[overflow-wrap:anywhere]">Cliente: {operation.client_id}</p>
        <p role="status" className={operation.status === 'BLOCKED' ? 'text-destructive' : 'text-foreground-secondary'}>
          {operation.status === 'COMPLETED' ? 'Eliminación completada' : operation.status === 'BLOCKED'
            ? 'Acceso retirado. La limpieza de la cuenta y sus archivos requiere verificación técnica; la eliminación aún no está completada.'
            : operation.last_error === 'STORAGE_TRANSFER_PENDING'
              ? 'Acceso retirado. Hay transferencias cuyo cierre aún no se ha podido confirmar. La limpieza se reintenta automáticamente; la eliminación sigue pendiente.'
            : operation.last_error === 'CREDENTIALS_EXPIRING'
              ? 'Acceso retirado. La eliminación finalizará automáticamente cuando caduquen los accesos anteriores. No tienes que hacer nada más.'
              : 'Eliminación en curso. La limpieza de la cuenta y sus archivos se comprueba y reintenta automáticamente.'}
        </p>
      </li>)}
    </ul>
  </section>
}

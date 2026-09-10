import { Button } from '@/components/ui/button'
import { useClientDeletions } from '../deletion-api'

export function ClientDeletionsPanel() {
  const query = useClientDeletions()
  if (query.isError) return <div role="alert" className="rounded-xl border border-border p-4 text-sm">
    No se pudo consultar el estado de las eliminaciones. <Button variant="outline" size="sm" onClick={() => query.refetch()}>Actualizar estado</Button>
  </div>
  if (!query.data?.length) return null
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4" aria-label="Eliminaciones recientes">
    <h2 className="font-semibold">Eliminaciones recientes</h2>
    <p className="text-sm text-muted-foreground">La limpieza pendiente se reintenta automáticamente. Hasta 100 operaciones; las completadas se muestran durante 7 días.</p>
    {query.data.map((operation) => <div key={operation.id} className="space-y-1 border-t border-border pt-3 text-sm">
      <p>Cliente: {operation.client_id}</p>
      <p role="status" className={operation.status === 'BLOCKED' ? 'text-destructive' : 'text-muted-foreground'}>
        {operation.status === 'COMPLETED' ? 'Eliminación completada' : operation.status === 'BLOCKED'
          ? 'Acceso retirado. La limpieza de la cuenta y sus archivos requiere verificación técnica; la eliminación aún no está completada.'
          : 'Eliminación en curso. Pendiente de confirmar la limpieza de la cuenta y sus archivos.'}
      </p>
    </div>)}
  </section>
}

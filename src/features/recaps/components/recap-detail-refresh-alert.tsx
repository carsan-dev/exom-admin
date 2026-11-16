import { Button } from '@/components/ui/button'

export function RecapDetailRefreshAlert({ isFetching, onRetry }: { isFetching: boolean; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-status-warning/30 bg-status-warning-soft p-3 text-sm text-foreground">
      <p className="min-w-0 [overflow-wrap:anywhere]">No se pudo actualizar el recap. Se conservan tus cambios.</p>
      <Button variant="outline" disabled={isFetching} onClick={onRetry}>Reintentar consulta</Button>
    </div>
  )
}

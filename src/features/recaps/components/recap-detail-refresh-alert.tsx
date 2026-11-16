import { Button } from '@/components/ui/button'

export function RecapDetailRefreshAlert({ isFetching, onRetry }: { isFetching: boolean; onRetry: () => void }) {
  return <div role="alert" className="space-y-2 text-sm"><p>No se pudo actualizar el recap. Se conservan tus cambios.</p><Button variant="outline" disabled={isFetching} onClick={onRetry}>Reintentar consulta</Button></div>
}

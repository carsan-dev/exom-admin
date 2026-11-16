import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getApiErrorMessage } from '../api'

interface LoadErrorCardProps {
  error: unknown
  onRetry: () => void
}

export function LoadErrorCard({ error, onRetry }: LoadErrorCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-error" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">No se pudieron cargar las plantillas</p>
            <p className="text-sm text-muted-foreground">
              {getApiErrorMessage(error, 'Reintenta en unos segundos')}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCcw className="h-4 w-4" />
          Reintentar
        </Button>
      </CardContent>
    </Card>
  )
}

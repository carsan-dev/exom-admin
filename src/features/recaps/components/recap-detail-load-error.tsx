import { Link } from 'react-router'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface RecapDetailLoadErrorProps {
  message: string
  backTo: string
  backLabel: string
  onRetry: () => void
}

export function RecapDetailLoadError({ message, backTo, backLabel, onRetry }: RecapDetailLoadErrorProps) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
        <div className="rounded-full bg-status-error/10 p-4 text-status-error">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Error al cargar el recap</h1>
          <p className="max-w-xl text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" asChild>
            <Link to={backTo}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
          <Button onClick={onRetry}>Reintentar</Button>
        </div>
      </CardContent>
    </Card>
  )
}

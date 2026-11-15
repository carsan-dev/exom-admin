import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface UsersListErrorCardProps {
  title: string
  message: string
  onRetry: () => void
}

export function UsersListErrorCard({ title, message, onRetry }: UsersListErrorCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
        <div className="rounded-full bg-status-error/10 p-4 text-status-error">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="max-w-xl text-sm text-muted-foreground">{message}</p>
        </div>
        <Button onClick={onRetry}>Reintentar</Button>
      </CardContent>
    </Card>
  )
}

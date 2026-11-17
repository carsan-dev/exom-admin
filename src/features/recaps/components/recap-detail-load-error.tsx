import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { ErrorState } from '@/components/page'
import { Button } from '@/components/ui/button'

interface RecapDetailLoadErrorProps {
  message: string
  backTo: string
  backLabel: string
  onRetry: () => void
}

export function RecapDetailLoadError({ message, backTo, backLabel, onRetry }: RecapDetailLoadErrorProps) {
  return (
    <div className="border-y border-border">
      <ErrorState title="Error al cargar el recap" description={message} onRetry={onRetry} />
      <div className="flex justify-center pb-14">
        <Button variant="outline" asChild>
          <Link to={backTo}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>
    </div>
  )
}

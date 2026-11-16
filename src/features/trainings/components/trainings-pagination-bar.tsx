import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TrainingsPaginationBarProps {
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}

export function TrainingsPaginationBar({
  page,
  totalPages,
  onPrevious,
  onNext,
}: TrainingsPaginationBarProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onPrevious} disabled={page === 1}>
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button variant="outline" onClick={onNext} disabled={page >= totalPages}>
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

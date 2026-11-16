import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Pagination } from '@/components/page'
import { Button } from '@/components/ui/button'

interface DietsPaginationBarProps {
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}

export function DietsPaginationBar({
  page,
  totalPages,
  onPrevious,
  onNext,
}: DietsPaginationBarProps) {
  // El listado siempre indica en qué página está y conserva Anterior/Siguiente (deshabilitados
  // con una sola página); el componente compartido no pinta nada en ese caso.
  if (totalPages <= 1) {
    return (
      <nav
        aria-label="Paginación"
        className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-[13px] tabular-nums text-foreground-muted">
          Página {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onPrevious} disabled={page <= 1}>
            <ChevronLeft aria-hidden="true" />
            Anterior
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages}>
            Siguiente
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </nav>
    )
  }

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      onPageChange={(nextPage) => (nextPage < page ? onPrevious() : onNext())}
    />
  )
}

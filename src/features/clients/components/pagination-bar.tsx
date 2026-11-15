import { Pagination } from '@/components/page'

interface PaginationBarProps {
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}

export function PaginationBar({ page, totalPages, onPrevious, onNext }: PaginationBarProps) {
  // El listado siempre indica en qué página está, también cuando solo hay una.
  if (totalPages <= 1) {
    return (
      <p className="pt-4 text-[13px] tabular-nums text-foreground-muted">
        Página {page} de {totalPages}
      </p>
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

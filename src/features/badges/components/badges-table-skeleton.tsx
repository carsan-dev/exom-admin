import { Skeleton } from '@/components/ui/skeleton'

export function BadgesTableSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border border-y border-border">
      <span className="sr-only">Cargando valores</span>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} aria-hidden="true" className="flex items-center gap-3 py-3">
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-40 max-w-[50%]" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export function ExercisesListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border border-y border-border">
      <span className="sr-only">Cargando ejercicios</span>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} aria-hidden="true" className="flex items-center gap-3 py-3">
          <Skeleton className="h-9 w-12 flex-none" />
          <Skeleton className="h-4 w-40 max-w-[50%]" />
          <Skeleton className="ml-auto hidden h-4 w-24 md:block" />
        </div>
      ))}
    </div>
  )
}

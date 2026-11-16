import { Skeleton } from '@/components/ui/skeleton'

export function DietsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="divide-y divide-border border-y border-border">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="my-3 h-8 w-full" />
        ))}
      </div>
    </div>
  )
}

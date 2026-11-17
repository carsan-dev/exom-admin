import { Skeleton } from '@/components/ui/skeleton'
import type { AssignmentsViewMode } from '../types'

export function AssignmentsPageSkeleton({ viewMode }: { viewMode: AssignmentsViewMode }) {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <div className="grid gap-4 xl:grid-cols-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {viewMode === 'week' ? (
        <div className="grid border-y border-border md:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-52 md:h-[26rem]" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-6" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: 35 }).map((_, index) => (
              <Skeleton key={index} className="min-h-[110px]" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

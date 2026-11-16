import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AssignmentsViewMode } from '../types'

export function AssignmentsPageSkeleton({ viewMode }: { viewMode: AssignmentsViewMode }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <div className="grid gap-4 xl:grid-cols-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      {viewMode === 'week' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-6 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <Skeleton key={index} className="min-h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

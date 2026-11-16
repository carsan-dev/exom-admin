import { Skeleton } from '@/components/ui/skeleton'

export function RecapDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-8 w-40" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-[420px] w-full rounded-2xl" />
    </div>
  )
}

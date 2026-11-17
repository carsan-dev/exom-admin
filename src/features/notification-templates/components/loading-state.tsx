import { Skeleton } from '@/components/ui/skeleton'

export function LoadingState() {
  return (
    <div className="grid border-t border-border-strong xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4 py-4 xl:border-r xl:border-border xl:pr-4">
        <Skeleton className="h-10 w-full" />
        <div className="border-t border-border">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2 border-b border-border px-3 py-3.5">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </div>
      <div className="min-w-0 space-y-6 py-5 xl:pl-8">
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

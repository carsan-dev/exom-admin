import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function LoadingState() {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

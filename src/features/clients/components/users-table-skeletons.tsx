import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ClientsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid gap-4 rounded-xl border border-border/60 p-4 lg:grid-cols-[2fr_1.4fr_1fr_1fr_1fr_1fr_1.7fr]"
          >
            {Array.from({ length: 7 }).map((__, columnIndex) => (
              <Skeleton key={columnIndex} className="h-10 w-full" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function AdminsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid gap-4 rounded-xl border border-border/60 p-4 lg:grid-cols-[2fr_1.4fr_1fr_1fr_1fr_1.8fr]"
          >
            {Array.from({ length: 6 }).map((__, columnIndex) => (
              <Skeleton key={columnIndex} className="h-10 w-full" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

/** Filas con filetes, sin tarjeta: el mismo ritmo que la lista real. */
function UsersListSkeleton({ columns }: { columns: number }) {
  return (
    <div aria-hidden="true" className="divide-y divide-border border-y border-border">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 py-4">
          <Skeleton className="size-10 flex-none rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-[60%]" />
            <Skeleton className="h-3 w-72 max-w-[85%]" />
          </div>
          <div className="hidden flex-none gap-4 md:flex">
            {Array.from({ length: columns - 2 }).map((__, columnIndex) => (
              <Skeleton key={columnIndex} className="h-5 w-16" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ClientsTableSkeleton() {
  return <UsersListSkeleton columns={7} />
}

export function AdminsTableSkeleton() {
  return <UsersListSkeleton columns={6} />
}

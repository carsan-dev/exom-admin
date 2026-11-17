import { ShieldCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tag } from '@/components/ui/tag'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, ErrorState, Pagination } from '@/components/page'
import { useMediaQuery } from '@/hooks/use-media-query'
import { getApiErrorMessage } from '@/lib/api-utils'
import {
  getApprovalActionLabel,
  getApprovalActorInitials,
  getApprovalActorName,
  getApprovalResourceLabel,
  getApprovalResourceName,
  type ApprovalRequest,
} from '../types'
import { ApprovalDate } from './approval-date'
import { ApprovalStatusBadge } from './approval-status-badge'

interface ApprovalRequestsListProps {
  items: ApprovalRequest[]
  isLoading: boolean
  isError: boolean
  error: unknown
  isSuperAdmin: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
  onRetry: () => void
}

type RowsProps = Pick<ApprovalRequestsListProps, 'items' | 'isSuperAdmin' | 'onSelect'>

function RequesterCell({ request }: { request: ApprovalRequest }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-9 w-9 flex-none border border-border/60">
        <AvatarImage
          src={request.requester.profile?.avatar_url ?? undefined}
          alt={getApprovalActorName(request.requester)}
        />
        <AvatarFallback>{getApprovalActorInitials(request.requester)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="font-medium text-foreground [overflow-wrap:anywhere]">{getApprovalActorName(request.requester)}</p>
        <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{request.requester.email}</p>
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border border-y border-border">
      <span className="sr-only">Cargando solicitudes...</span>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} aria-hidden="true" className="space-y-2 px-1 py-4 md:px-3">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      ))}
    </div>
  )
}

function RequestsTable({ items, isSuperAdmin, onSelect }: RowsProps) {
  return (
    <div className="border-y border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {isSuperAdmin ? <TableHead>Solicitante</TableHead> : null}
            <TableHead>Acción</TableHead>
            <TableHead>Recurso</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((request) => (
            <TableRow key={request.id}>
              {isSuperAdmin ? (
                <TableCell className="min-w-[14rem]">
                  <RequesterCell request={request} />
                </TableCell>
              ) : null}
              <TableCell className="min-w-[12rem]">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{getApprovalActionLabel(request.action_type)}</p>
                  <Tag>{getApprovalResourceLabel(request.resource_type)}</Tag>
                </div>
              </TableCell>
              <TableCell className="min-w-[10rem] text-sm text-muted-foreground [overflow-wrap:anywhere]">
                {getApprovalResourceName(request)}
              </TableCell>
              <TableCell>
                <ApprovalStatusBadge status={request.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-foreground-secondary">
                <ApprovalDate value={request.created_at} stacked />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => onSelect(request.id)}>
                  Ver detalle
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RequestsRows({ items, isSuperAdmin, onSelect }: RowsProps) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((request) => (
        <li key={request.id} className="min-w-0 space-y-3 px-1 py-4">
          {isSuperAdmin ? <RequesterCell request={request} /> : null}
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-foreground">{getApprovalActionLabel(request.action_type)}</p>
              <Tag>{getApprovalResourceLabel(request.resource_type)}</Tag>
            </div>
            <ApprovalStatusBadge status={request.status} />
          </div>
          <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{getApprovalResourceName(request)}</p>
          <div className="text-sm text-foreground-secondary">
            <ApprovalDate value={request.created_at} stacked />
          </div>
          <Button variant="outline" className="h-11 w-full" onClick={() => onSelect(request.id)}>
            Ver detalle
          </Button>
        </li>
      ))}
    </ul>
  )
}

export function ApprovalRequestsList({
  items,
  isLoading,
  isError,
  error,
  isSuperAdmin,
  page,
  totalPages,
  onPageChange,
  onSelect,
  onRetry,
}: ApprovalRequestsListProps) {
  // Una sola variante montada por breakpoint: tabla desde md, filas apiladas por debajo.
  const isDesktop = useMediaQuery('(min-width: 768px)', true)

  if (isLoading) {
    return <ListSkeleton />
  }

  if (isError) {
    return (
      <ErrorState
        className="border-y border-border"
        title={getApiErrorMessage(error, 'No se pudieron cargar las solicitudes')}
        onRetry={onRetry}
      />
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        className="border-y border-border"
        icon={<ShieldCheck aria-hidden="true" />}
        title="No hay solicitudes que coincidan con los filtros actuales."
      />
    )
  }

  return (
    <div>
      {isDesktop ? (
        <RequestsTable items={items} isSuperAdmin={isSuperAdmin} onSelect={onSelect} />
      ) : (
        <RequestsRows items={items} isSuperAdmin={isSuperAdmin} onSelect={onSelect} />
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}

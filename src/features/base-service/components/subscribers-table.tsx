import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getGoalLabel, getSendBlock } from '../labels'
import type { BaseRoute, BaseSubscriber } from '../types'
import { DeliveryStatusBadge } from './delivery-status-badge'

interface SubscribersTableProps {
  subscribers: BaseSubscriber[]
  routes: BaseRoute[] | undefined
  routesFailed: boolean
  onSend: (subscriber: BaseSubscriber) => void
  onView: (subscriber: BaseSubscriber) => void
}

export function SubscribersTable({ subscribers, routes, routesFailed, onSend, onView }: SubscribersTableProps) {
  return (
    <TooltipProvider>
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Objetivo</TableHead>
            <TableHead>Días/semana</TableHead>
            <TableHead>Último mes enviado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscribers.map((subscriber) => {
            const block = getSendBlock(subscriber, routes, routesFailed)
            const reasonId = `send-reason-${subscriber.id}`
            return (
              <TableRow key={subscriber.id} className={subscriber.is_archived ? 'opacity-70' : undefined}>
                <TableCell className="whitespace-nowrap font-mono text-xs">{subscriber.order_code}</TableCell>
                <TableCell className="font-medium">{subscriber.name}</TableCell>
                <TableCell className="text-muted-foreground">{subscriber.email}</TableCell>
                <TableCell>{getGoalLabel(subscriber.goal)}</TableCell>
                <TableCell>{subscriber.days_per_week}</TableCell>
                <TableCell>{subscriber.last_sent_month ?? '—'}</TableCell>
                <TableCell>
                  <DeliveryStatusBadge status={subscriber.latest_delivery?.status ?? null} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {block ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} aria-describedby={reasonId} className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <Button size="sm" disabled tabIndex={-1} className="pointer-events-none">
                              Enviar mes {subscriber.next_month}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{block.text}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button size="sm" onClick={() => onSend(subscriber)}>
                        Enviar mes {subscriber.next_month}
                      </Button>
                    )}
                    {block && (
                      <span id={reasonId} className="sr-only">
                        {block.text}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Ver ${subscriber.name}`}
                      onClick={() => onView(subscriber)}
                    >
                      Ver
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
  )
}

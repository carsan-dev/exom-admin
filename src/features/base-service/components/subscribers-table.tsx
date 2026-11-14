import { Eye, MoreHorizontal, Pencil, RotateCw, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { canResendDelivery, getGoalLabel, getSendBlock } from '../labels'
import type { BaseRoute, BaseSubscriber } from '../types'
import { useWideScreen } from '../use-wide-screen'
import { DeliveryStatusBadge } from './delivery-status-badge'

interface SubscribersTableProps {
  subscribers: BaseSubscriber[]
  routes: BaseRoute[] | undefined
  routesFailed: boolean
  onSend: (subscriber: BaseSubscriber) => void
  onResend: (subscriber: BaseSubscriber) => void
  onEdit: (subscriber: BaseSubscriber) => void
  onView: (subscriber: BaseSubscriber) => void
}

export function SubscribersTable({
  subscribers,
  routes,
  routesFailed,
  onSend,
  onResend,
  onEdit,
  onView,
}: SubscribersTableProps) {
  const wide = useWideScreen()

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
            const latest = subscriber.latest_delivery
            const resendMonth = latest && canResendDelivery(latest, subscriber) ? latest.month : null
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
                <TableCell className="w-px whitespace-nowrap">
                  {wide ? (
                    <div className="flex items-center justify-end gap-2">
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
                      {resendMonth !== null && (
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Reenviar mes ${resendMonth} de ${subscriber.name}`}
                          data-resend-trigger={subscriber.id}
                          onClick={() => onResend(subscriber)}
                        >
                          Reenviar mes {resendMonth}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Editar ${subscriber.name}`}
                        data-focus-anchor={subscriber.id}
                        onClick={() => onEdit(subscriber)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Ver ${subscriber.name}`}
                        onClick={() => onView(subscriber)}
                      >
                        Ver
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            aria-label={`Acciones de ${subscriber.name}`}
                            data-focus-anchor={subscriber.id}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-64 overflow-y-auto bg-background shadow-lg"
                          collisionPadding={8}
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              disabled={block !== null}
                              aria-label={
                                block
                                  ? `Enviar mes ${subscriber.next_month}. ${block.text}`
                                  : `Enviar mes ${subscriber.next_month}`
                              }
                              onSelect={() => onSend(subscriber)}
                            >
                              <Send aria-hidden="true" />
                              <span className="flex flex-col">
                                <span>Enviar mes {subscriber.next_month}</span>
                                {block && (
                                  <span className="whitespace-normal text-xs text-muted-foreground">{block.text}</span>
                                )}
                              </span>
                            </DropdownMenuItem>
                            {resendMonth !== null && (
                              <DropdownMenuItem
                                aria-label={`Reenviar mes ${resendMonth} de ${subscriber.name}`}
                                onSelect={() => onResend(subscriber)}
                              >
                                <RotateCw aria-hidden="true" />
                                Reenviar mes {resendMonth}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              aria-label={`Editar ${subscriber.name}`}
                              onSelect={() => onEdit(subscriber)}
                            >
                              <Pencil aria-hidden="true" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem aria-label={`Ver ${subscriber.name}`} onSelect={() => onView(subscriber)}>
                              <Eye aria-hidden="true" />
                              Ver
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
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

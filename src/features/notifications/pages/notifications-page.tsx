import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { NotificationsFilters } from '../components/notifications-filters'
import { NotificationsList } from '../components/notifications-list'
import { NotificationsStatsCards } from '../components/notifications-stats-cards'
import { SendNotificationDialog } from '../components/send-notification-dialog'
import type { NotificationStatusFilter } from '../types'

function getStatusFilter(value: string | null): NotificationStatusFilter {
  if (value === 'SENT' || value === 'FAILED') {
    return value
  }

  return 'ALL'
}

function getPage(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const recipientId = searchParams.get('recipientId') ?? ''
  const status = getStatusFilter(searchParams.get('status'))
  const search = searchParams.get('search') ?? ''
  const page = getPage(searchParams.get('page'))

  const updateSearchParams = (updates: {
    recipientId?: string
    status?: NotificationStatusFilter
    search?: string
    page?: number
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (updates.recipientId !== undefined) {
      if (updates.recipientId) {
        nextSearchParams.set('recipientId', updates.recipientId)
      } else {
        nextSearchParams.delete('recipientId')
      }
    }

    if (updates.status !== undefined) {
      if (updates.status === 'ALL') {
        nextSearchParams.delete('status')
      } else {
        nextSearchParams.set('status', updates.status)
      }
    }

    if (updates.search !== undefined) {
      if (updates.search.trim()) {
        nextSearchParams.set('search', updates.search)
      } else {
        nextSearchParams.delete('search')
      }
    }

    if (updates.page !== undefined) {
      if (updates.page <= 1) {
        nextSearchParams.delete('page')
      } else {
        nextSearchParams.set('page', String(updates.page))
      }
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Envía recordatorios a tu cartera y controla el historial de entregas desde un único lugar.
          </p>
        </div>

        <Button onClick={() => setIsDialogOpen(true)}>Enviar notificación</Button>
      </div>

      <NotificationsStatsCards />

      <NotificationsFilters
        recipientId={recipientId}
        status={status}
        search={search}
        onRecipientChange={(nextRecipientId) => updateSearchParams({ recipientId: nextRecipientId, page: 1 })}
        onStatusChange={(nextStatus) => updateSearchParams({ status: nextStatus, page: 1 })}
        onSearchChange={(nextSearch) => updateSearchParams({ search: nextSearch, page: 1 })}
      />

      <NotificationsList
        recipientId={recipientId || undefined}
        status={status}
        search={search || undefined}
        page={page}
        onPageChange={(nextPage) => updateSearchParams({ page: nextPage })}
      />

      <SendNotificationDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  )
}

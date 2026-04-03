import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { FeedbackDetailDialog } from '../components/feedback-detail-dialog'
import { FeedbackFilters } from '../components/feedback-filters'
import { FeedbackList } from '../components/feedback-list'
import { FeedbackStatsCards } from '../components/feedback-stats-cards'
import type { FeedbackItem, FeedbackStatusFilter } from '../types'

function getStatusFilter(value: string | null): FeedbackStatusFilter {
  if (value === 'PENDING' || value === 'REVIEWED') {
    return value
  }

  return 'ALL'
}

function getPage(value: string | null) {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function FeedbackPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null)

  const clientId = searchParams.get('clientId') ?? ''
  const status = getStatusFilter(searchParams.get('status'))
  const page = getPage(searchParams.get('page'))

  const updateSearchParams = (updates: {
    clientId?: string
    status?: FeedbackStatusFilter
    page?: number
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (updates.clientId !== undefined) {
      if (updates.clientId) {
        nextSearchParams.set('clientId', updates.clientId)
      } else {
        nextSearchParams.delete('clientId')
      }
    }

    if (updates.status !== undefined) {
      if (updates.status === 'ALL') {
        nextSearchParams.delete('status')
      } else {
        nextSearchParams.set('status', updates.status)
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

  const handleClientChange = (nextClientId: string) => {
    updateSearchParams({ clientId: nextClientId, page: 1 })
  }

  const handleStatusChange = (nextStatus: FeedbackStatusFilter) => {
    updateSearchParams({ status: nextStatus, page: 1 })
  }

  const handlePageChange = (nextPage: number) => {
    updateSearchParams({ page: nextPage })
  }

  const handleSelectItem = (item: FeedbackItem) => {
    setSelectedItem(item)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Feedback multimedia</h1>
        <p className="text-sm text-muted-foreground">
          Revisa el feedback multimedia enviado por tus clientes y responde desde el panel.
        </p>
      </div>

      <FeedbackStatsCards />

      <FeedbackFilters
        clientId={clientId}
        status={status}
        onClientChange={handleClientChange}
        onStatusChange={handleStatusChange}
      />

      <FeedbackList
        clientId={clientId || undefined}
        status={status}
        page={page}
        onPageChange={handlePageChange}
        onSelect={handleSelectItem}
      />

      <FeedbackDetailDialog
        item={selectedItem}
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null)
          }
        }}
      />
    </div>
  )
}

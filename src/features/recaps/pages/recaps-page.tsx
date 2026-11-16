import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/page'
import { PeriodStatsHeader } from '@/components/stats/period-stats-header'
import { useStatsPeriod } from '@/components/stats/use-stats-period'
import { RecapsFilters } from '../components/recaps-filters'
import { RecapsList } from '../components/recaps-list'
import { RecapsStatsCards } from '../components/recaps-stats-cards'
import type { RecapStatusFilter } from '../types'

function getStatusFilter(value: string | null): RecapStatusFilter {
  if (value === 'SUBMITTED' || value === 'REVIEWED') {
    return value
  }

  return 'ALL'
}

function getPage(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function getArchived(value: string | null) {
  return value === 'true'
}

export function RecapsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const statsPeriod = useStatsPeriod('recaps')
  const clientId = searchParams.get('clientId') ?? ''
  const status = getStatusFilter(searchParams.get('status'))
  const archived = getArchived(searchParams.get('archived'))
  const page = getPage(searchParams.get('page'))

  const updateSearchParams = (updates: {
    clientId?: string
    status?: RecapStatusFilter
    archived?: boolean
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

    if (updates.archived !== undefined) {
      if (updates.archived) {
        nextSearchParams.set('archived', 'true')
      } else {
        nextSearchParams.delete('archived')
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
      <PageHeader
        className="mb-6 md:mb-6"
        eyebrow="Seguimiento"
        title="Recaps semanales"
        description="Revisa recaps enviados o ya revisados, comenta cada caso y archiva los ya resueltos."
      />

      <div className="space-y-4">
        <PeriodStatsHeader period={statsPeriod} filtered={Boolean(clientId)} />
        <RecapsStatsCards params={{ ...statsPeriod.params, ...(clientId ? { client_id: clientId } : {}) }} />
      </div>

      <RecapsFilters
        clientId={clientId}
        status={status}
        archived={archived}
        onClientChange={(nextClientId) => updateSearchParams({ clientId: nextClientId, page: 1 })}
        onStatusChange={(nextStatus) => updateSearchParams({ status: nextStatus, page: 1 })}
        onArchivedChange={(nextArchived) => updateSearchParams({ archived: nextArchived, page: 1 })}
      />

      <RecapsList
        clientId={clientId || undefined}
        status={status}
        archived={archived}
        page={page}
        onPageChange={(nextPage) => updateSearchParams({ page: nextPage })}
      />
    </div>
  )
}

import { useSearchParams } from 'react-router'
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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Recaps semanales</h1>
        <p className="text-sm text-muted-foreground">
          Revisa recaps enviados o ya revisados, comenta cada caso y archiva los ya resueltos.
        </p>
      </div>

      <RecapsStatsCards />

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

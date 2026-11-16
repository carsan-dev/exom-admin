import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/page'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented'
import { useAuth } from '@/hooks/use-auth'
import { useApprovalRequests, useMyApprovalRequests } from '../api'
import {
  getApprovalStatusFilterOptions,
  type ApprovalStatusFilter,
  type ResourceType,
} from '../types'
import { ApprovalDetailDialog } from '../components/approval-detail-dialog'
import { ApprovalRequestsList } from '../components/approval-requests-list'
import { PendingApprovalsBanner } from '../components/pending-approvals-banner'

const PAGE_SIZE = 20

function getPage(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function getStatusFilter(value: string | null): ApprovalStatusFilter {
  return getApprovalStatusFilterOptions().includes(value as ApprovalStatusFilter)
    ? (value as ApprovalStatusFilter)
    : 'PENDING'
}

function getResourceTypeFilter(value: string | null): ResourceType | 'ALL' {
  return value === 'training' ||
    value === 'diet' ||
    value === 'exercise' ||
    value === 'ingredient' ||
    value === 'meal' ||
    value === 'challenge' ||
    value === 'achievement' ||
    value === 'notification'
    ? value
    : 'ALL'
}

export function ApprovalRequestsPage() {
  const currentUserRole = useAuth((state) => state.user?.role ?? 'ADMIN')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  const page = getPage(searchParams.get('page'))
  const status = getStatusFilter(searchParams.get('status'))
  const resourceType = getResourceTypeFilter(searchParams.get('resourceType'))

  const filters = {
    status,
    resource_type: resourceType === 'ALL' ? undefined : resourceType,
    page,
    limit: PAGE_SIZE,
  }

  const superAdminRequestsQuery = useApprovalRequests(filters, currentUserRole === 'SUPER_ADMIN')
  const adminRequestsQuery = useMyApprovalRequests(filters, currentUserRole !== 'SUPER_ADMIN')
  const approvalRequestsQuery = currentUserRole === 'SUPER_ADMIN'
    ? superAdminRequestsQuery
    : adminRequestsQuery
  const data = approvalRequestsQuery.data
  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const updateSearchParams = (updates: {
    status?: ApprovalStatusFilter
    resourceType?: ResourceType | 'ALL'
    page?: number
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (updates.status !== undefined) {
      if (updates.status === 'PENDING') {
        nextSearchParams.delete('status')
      } else {
        nextSearchParams.set('status', updates.status)
      }
    }

    if (updates.resourceType !== undefined) {
      if (updates.resourceType === 'ALL') {
        nextSearchParams.delete('resourceType')
      } else {
        nextSearchParams.set('resourceType', updates.resourceType)
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

  const statusOptions = getApprovalStatusFilterOptions().map((value) => ({
    value,
    label:
      value === 'ALL'
        ? 'Todas'
        : value === 'PENDING'
          ? 'Pendientes'
          : value === 'APPROVED'
            ? 'Aprobadas'
            : value === 'REJECTED'
              ? 'Rechazadas'
              : 'Fallidas',
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-6 md:mb-6"
        eyebrow="Control"
        title="Solicitudes"
        description={
          currentUserRole === 'SUPER_ADMIN'
            ? 'Revisa las acciones sensibles pendientes, compara el estado actual con el cambio propuesto y decide si deben ejecutarse.'
            : 'Consulta el estado de tus solicitudes, revisa rechazos o fallos y cancela las que ya no quieras mantener pendientes.'
        }
      />

      {currentUserRole === 'ADMIN' ? <PendingApprovalsBanner /> : null}

      <section aria-label="Solicitudes" className="min-w-0 space-y-4">
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="min-w-0 max-md:overflow-x-auto">
            <SegmentedControl
              aria-label="Estado de la solicitud"
              value={status}
              onValueChange={(value) => updateSearchParams({ status: value, page: 1 })}
              options={statusOptions}
              className="max-md:[&>button]:h-11 max-md:[&>button]:px-4"
            />
          </div>

          <div className="w-full md:w-64">
            <Select value={resourceType} onValueChange={(value) => updateSearchParams({ resourceType: value as ResourceType | 'ALL', page: 1 })}>
              <SelectTrigger aria-label="Tipo de recurso" className="max-md:h-11">
                <SelectValue placeholder="Tipo de recurso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los recursos</SelectItem>
                <SelectItem value="training">Entrenamientos</SelectItem>
                <SelectItem value="diet">Dietas</SelectItem>
                <SelectItem value="exercise">Ejercicios</SelectItem>
                <SelectItem value="ingredient">Ingredientes</SelectItem>
                <SelectItem value="meal">Comidas</SelectItem>
                <SelectItem value="challenge">Retos</SelectItem>
                <SelectItem value="achievement">Logros</SelectItem>
                <SelectItem value="notification">Notificaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ApprovalRequestsList
          items={items}
          isLoading={approvalRequestsQuery.isLoading}
          isError={approvalRequestsQuery.isError}
          error={approvalRequestsQuery.error}
          isSuperAdmin={currentUserRole === 'SUPER_ADMIN'}
          page={page}
          totalPages={totalPages}
          onPageChange={(nextPage) => updateSearchParams({ page: nextPage })}
          onSelect={setSelectedRequestId}
          onRetry={() => void approvalRequestsQuery.refetch()}
        />
      </section>

      <ApprovalDetailDialog
        requestId={selectedRequestId}
        open={Boolean(selectedRequestId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedRequestId(null)
          }
        }}
      />
    </div>
  )
}

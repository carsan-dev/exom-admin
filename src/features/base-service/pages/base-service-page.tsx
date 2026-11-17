import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Mail, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getPageSearchParam, replacePaginationSearchParams } from '@/lib/pagination-search-params'
import { getApiErrorMessage, isNotConfiguredError, useBaseRoutes, useBaseSubscribers } from '../api'
import { RowResendDialog } from '../components/row-resend-dialog'
import { SendMonthDialog } from '../components/send-month-dialog'
import { SubscriberDetailDialog } from '../components/subscriber-detail-dialog'
import { SubscriberFormDialog } from '../components/subscriber-form-dialog'
import { SubscribersTable } from '../components/subscribers-table'
import { NOT_CONFIGURED_HELP, NOT_CONFIGURED_TITLE } from '../labels'
import type { ArchiveFilter, BaseSubscriber } from '../types'
import { useDebouncedValue } from '../use-debounced-value'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

const ARCHIVE_OPTIONS: { value: ArchiveFilter; label: string }[] = [
  { value: 'visible', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
  { value: 'all', label: 'Todos' },
]

function getArchiveFilter(value: string | null): ArchiveFilter {
  return value === 'archived' || value === 'all' ? value : 'visible'
}

export function BaseServicePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchText, setSearchText] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [sendTarget, setSendTarget] = useState<BaseSubscriber | null>(null)
  const [resendSubscriber, setResendSubscriber] = useState<BaseSubscriber | null>(null)
  const [form, setForm] = useState<{ open: boolean; subscriber: BaseSubscriber | null }>({
    open: false,
    subscriber: null,
  })

  const archive = getArchiveFilter(searchParams.get('archive'))
  const page = getPageSearchParam(searchParams.get('page'))
  const q = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS)

  const subscribersQuery = useBaseSubscribers({ q, archive, page, limit: PAGE_SIZE })
  const routesQuery = useBaseRoutes()

  const setArchive = (value: ArchiveFilter) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === 'visible') next.delete('archive')
        else next.set('archive', value)
        next.delete('page')
        return next
      },
      { replace: true },
    )

  const subscribers = subscribersQuery.data?.data ?? []
  const totalPages = subscribersQuery.data?.totalPages ?? 1
  const notConfigured = isNotConfiguredError(subscribersQuery.error) || isNotConfiguredError(routesQuery.error)
  const hasFilters = q !== '' || archive !== 'visible'

  const openCreate = () => setForm({ open: true, subscriber: null })

  const renderContent = () => {
    if (notConfigured) {
      return (
        <div role="status" className="rounded-lg border p-6 text-sm">
          <p className="font-medium text-foreground">{NOT_CONFIGURED_TITLE}</p>
          <p className="mt-1 text-muted-foreground">{NOT_CONFIGURED_HELP}</p>
        </div>
      )
    }

    if (subscribersQuery.isLoading) {
      return (
        <div className="space-y-2 rounded-lg border p-4" aria-busy="true" aria-label="Cargando suscriptores">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      )
    }

    if (subscribersQuery.isError) {
      return (
        <div role="alert" className="flex h-40 flex-col items-center justify-center gap-3 rounded-lg border text-sm text-muted-foreground">
          <p>{getApiErrorMessage(subscribersQuery.error, 'Error al cargar los suscriptores.')}</p>
          <Button size="sm" variant="outline" onClick={() => void subscribersQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      )
    }

    if (subscribers.length === 0) {
      return (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border px-4 text-center">
          <Mail aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? 'No hay suscriptores que coincidan con la búsqueda.'
              : 'Todavía no hay suscriptores del servicio base.'}
          </p>
          {!hasFilters && <Button onClick={openCreate}>Crea el primer suscriptor</Button>}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <SubscribersTable
          subscribers={subscribers}
          routes={routesQuery.data}
          routesFailed={routesQuery.isError}
          onSend={setSendTarget}
          onResend={setResendSubscriber}
          onEdit={(subscriber) => setForm({ open: true, subscriber })}
          onView={(subscriber) => setDetailId(subscriber.id)}
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => replacePaginationSearchParams(setSearchParams, { page: page - 1 })}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => replacePaginationSearchParams(setSearchParams, { page: page + 1 })}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Servicio base</h1>
          <p className="text-sm text-muted-foreground">Suscriptores del programa mensual en PDF</p>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nuevo suscriptor
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:min-w-[260px] sm:max-w-md">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Buscar suscriptores"
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value)
              replacePaginationSearchParams(setSearchParams, { page: 1 })
            }}
            placeholder="Buscar por nombre, email o pedido"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2" role="group" aria-label="Estado de los suscriptores">
          {ARCHIVE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={archive === option.value ? 'default' : 'outline'}
              aria-pressed={archive === option.value}
              onClick={() => setArchive(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {renderContent()}

      <SubscriberFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((current) => ({ ...current, open }))}
        subscriber={form.subscriber}
        routes={routesQuery.data}
        routesError={routesQuery.isError}
      />
      <SendMonthDialog
        subscriber={sendTarget}
        open={sendTarget !== null}
        onOpenChange={(open) => !open && setSendTarget(null)}
      />
      <RowResendDialog subscriber={resendSubscriber} onClose={() => setResendSubscriber(null)} />
      <SubscriberDetailDialog
        subscriberId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(subscriber) => {
          setDetailId(null)
          setForm({ open: true, subscriber })
        }}
      />
    </div>
  )
}

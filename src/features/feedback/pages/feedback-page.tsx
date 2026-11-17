import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page'
import { PeriodStatsHeader } from '@/components/stats/period-stats-header'
import { useStatsPeriod } from '@/components/stats/use-stats-period'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { getApiErrorMessage } from '@/lib/api-utils'
import { useFeedbackList, useRespondFeedback } from '../api'
import { FeedbackDetailDialog } from '../components/feedback-detail-dialog'
import { FeedbackDetailPane } from '../components/feedback-detail-pane'
import { FeedbackFilters } from '../components/feedback-filters'
import { FeedbackList } from '../components/feedback-list'
import { FeedbackStatsCards } from '../components/feedback-stats-cards'
import { getNextPendingItem, getSiblingItem } from '../feedback-selection'
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
  // Elemento seleccionado (copia): mantiene montado el detalle aunque la lista se refresque
  // sin él (p. ej. filtro Pendientes tras responder). Se resuelve contra la lista cargada.
  const [selected, setSelected] = useState<FeedbackItem | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  // Elementos con una respuesta en vuelo: el estado «Enviando...» es por elemento.
  const [respondingIds, setRespondingIds] = useState<ReadonlySet<string>>(() => new Set())
  const { mutateAsync: respondAsync } = useRespondFeedback()
  // La guarda cubre los borradores de todos los elementos, no solo el visible.
  const hasUnsentDraft = Object.values(drafts).some((value) => value.trim() !== '')
  useUnsavedChanges('feedback-response', hasUnsentDraft || respondingIds.size > 0)
  // Panel junto al listado desde lg; por debajo, diálogo. Solo se monta una variante.
  const isDesktop = useMediaQuery('(min-width: 1024px)', true)

  const statsPeriod = useStatsPeriod('feedback')
  const clientId = searchParams.get('clientId') ?? ''
  const status = getStatusFilter(searchParams.get('status'))
  const page = getPage(searchParams.get('page'))

  const { data, isLoading, isError, refetch } = useFeedbackList(clientId || undefined, status, page)
  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const current = selected ? (items.find((item) => item.id === selected.id) ?? selected) : null

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
    setSelected(null)
    updateSearchParams({ clientId: nextClientId, page: 1 })
  }

  const handleStatusChange = (nextStatus: FeedbackStatusFilter) => {
    setSelected(null)
    updateSearchParams({ status: nextStatus, page: 1 })
  }

  const handlePageChange = (nextPage: number) => {
    setSelected(null)
    updateSearchParams({ page: nextPage })
  }

  const handleDraftChange = (id: string, value: string) => {
    setDrafts((previous) => {
      if (value === '') {
        const rest = { ...previous }
        delete rest[id]
        return rest
      }
      return { ...previous, [id]: value }
    })
  }

  // P11: tras responder, abre el siguiente pendiente de la lista cargada (en su orden,
  // y si no hay posterior, el primero pendiente restante) o avisa de que no quedan.
  // `listAtSubmit` es la lista del momento del envío (previa al refetch), que aún contiene el
  // elemento respondido. Solo se cambia la selección si sigue en el elemento respondido: si el
  // usuario eligió otro (o cerró el detalle) mientras se enviaba, se respeta su elección.
  const handleResponded = (
    respondedItem: FeedbackItem,
    response: string,
    listAtSubmit: FeedbackItem[],
    desktopAtSubmit: boolean,
  ) => {
    const nextPending = getNextPendingItem(listAtSubmit, respondedItem.id)
    if (nextPending) {
      setSelected((previous) => (previous?.id === respondedItem.id ? nextPending : previous))
      return
    }

    toast.info('No quedan feedbacks pendientes en esta lista.')
    const answered: FeedbackItem | null = desktopAtSubmit
      ? { ...respondedItem, status: 'REVIEWED', admin_response: response }
      : null
    setSelected((previous) => (previous?.id === respondedItem.id ? answered : previous))
  }

  // La mutación vive en la página (siempre montada) para que el resultado se notifique aunque el
  // detalle se haya cerrado o cambiado. Se usa la promesa de mutateAsync porque los callbacks de
  // mutate() se pierden si el observer cambia de mutación o se desmonta.
  const handleRespond = (item: FeedbackItem, response: string) => {
    if (respondingIds.has(item.id)) return
    const listAtSubmit = items
    const desktopAtSubmit = isDesktop
    setRespondingIds((previous) => new Set(previous).add(item.id))
    respondAsync({ id: item.id, admin_response: response })
      .then(
        () => {
          toast.success('Respuesta enviada correctamente')
          handleDraftChange(item.id, '')
          handleResponded(item, response, listAtSubmit, desktopAtSubmit)
        },
        (error: unknown) => {
          // El borrador se conserva para poder reintentar.
          toast.error(getApiErrorMessage(error, 'No se ha podido enviar la respuesta'))
        },
      )
      .finally(() => {
        setRespondingIds((previous) => {
          const next = new Set(previous)
          next.delete(item.id)
          return next
        })
      })
  }

  const previousItem = current ? getSiblingItem(items, current.id, -1) : null
  const nextItem = current ? getSiblingItem(items, current.id, 1) : null
  const position = current ? items.findIndex((item) => item.id === current.id) + 1 : 0
  const currentDraft = current ? (drafts[current.id] ?? '') : ''
  const currentResponding = current ? respondingIds.has(current.id) : false
  const handleCurrentDraftChange = (value: string) => {
    if (current) handleDraftChange(current.id, value)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-6 md:mb-6"
        eyebrow="Seguimiento"
        title="Feedback multimedia"
        description="Revisa el feedback multimedia enviado por tus clientes y responde desde el panel."
      />

      <div className="space-y-4">
        <PeriodStatsHeader period={statsPeriod} filtered={Boolean(clientId)} />
        <FeedbackStatsCards params={{ ...statsPeriod.params, ...(clientId ? { client_id: clientId } : {}) }} />
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-0">
        <section aria-label="Feedback recibido" className="min-w-0 space-y-4 lg:border-r lg:border-border lg:pr-6">
          <FeedbackFilters
            clientId={clientId}
            status={status}
            onClientChange={handleClientChange}
            onStatusChange={handleStatusChange}
          />

          <FeedbackList
            items={items}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            clientId={clientId || undefined}
            status={status}
            page={page}
            totalPages={totalPages}
            selectedId={current?.id}
            controlsId={isDesktop ? 'feedback-detail' : undefined}
            onPageChange={handlePageChange}
            onSelect={setSelected}
          />
        </section>

        {isDesktop ? (
          <FeedbackDetailPane
            item={current}
            draft={currentDraft}
            onDraftChange={handleCurrentDraftChange}
            onRespond={handleRespond}
            isResponding={currentResponding}
          />
        ) : (
          <FeedbackDetailDialog
            item={current}
            open={Boolean(current)}
            onOpenChange={(open) => {
              if (!open) {
                // Con un envío en vuelo, el borrador se conserva hasta conocer el resultado.
                if (!currentResponding) handleCurrentDraftChange('')
                setSelected(null)
              }
            }}
            draft={currentDraft}
            onDraftChange={handleCurrentDraftChange}
            onRespond={handleRespond}
            isResponding={currentResponding}
            position={position}
            total={items.length}
            onPrevious={previousItem ? () => setSelected(previousItem) : undefined}
            onNext={nextItem ? () => setSelected(nextItem) : undefined}
          />
        )}
      </div>
    </div>
  )
}

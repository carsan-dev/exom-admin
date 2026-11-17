import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page'
import { PeriodStatsHeader } from '@/components/stats/period-stats-header'
import { useStatsPeriod } from '@/components/stats/use-stats-period'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { getApiErrorMessage } from '@/lib/api-utils'
import { useRecapsList, useReviewRecap } from '../api'
import type { RecapFocusRequest, RecapReplyValues } from '../components/recap-quick-view'
import { RecapQuickViewDialog } from '../components/recap-quick-view-dialog'
import { RECAP_QUICK_VIEW_PANE_ID, RecapQuickViewPane } from '../components/recap-quick-view-pane'
import { RecapsFilters } from '../components/recaps-filters'
import { RecapsInboxList } from '../components/recaps-inbox-list'
import { RecapsStatsCards } from '../components/recaps-stats-cards'
import { getNextPendingRecap, getRecapRowId, getSiblingRecap } from '../recaps-selection'
import type { RecapListItem, RecapStatusFilter } from '../types'

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

function sameReply(a: RecapReplyValues, b: RecapReplyValues) {
  return a.clientFeedback === b.clientFeedback && a.internalNote === b.internalNote
}

export function RecapsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  // Recap seleccionado (copia): mantiene montada la vista rápida aunque la lista se refresque
  // sin él (p. ej. filtro Por revisar tras responder). Se resuelve contra la lista cargada.
  const [selected, setSelected] = useState<RecapListItem | null>(null)
  // Respuestas locales sin enviar, por recap. Sobreviven al cambio de selección y al cierre del diálogo.
  const [drafts, setDrafts] = useState<Record<string, RecapReplyValues>>({})
  // Recaps con un envío en vuelo: el estado «Enviando...» es por recap.
  const [sendingIds, setSendingIds] = useState<ReadonlySet<string>>(() => new Set())
  const [focusRequest, setFocusRequest] = useState<{ id: string; mode: RecapFocusRequest } | null>(null)
  const { mutateAsync: reviewAsync } = useReviewRecap()
  const hasAnyDraft = Object.keys(drafts).length > 0
  useUnsavedChanges('recaps-quick-reply', hasAnyDraft || sendingIds.size > 0)
  // Panel junto al listado desde lg; por debajo, diálogo. Solo se monta una variante.
  const isDesktop = useMediaQuery('(min-width: 1024px)', true)

  // Selección vigente para resolver respuestas asíncronas sin pisar una elección posterior.
  const selectedIdRef = useRef<string | null>(null)
  useEffect(() => {
    selectedIdRef.current = selected?.id ?? null
  }, [selected])
  // Fila que abrió el diálogo, para devolverle el foco al cerrarlo.
  const dialogOpenerIdRef = useRef<string | null>(null)

  const statsPeriod = useStatsPeriod('recaps')
  const clientId = searchParams.get('clientId') ?? ''
  const status = getStatusFilter(searchParams.get('status'))
  const archived = getArchived(searchParams.get('archived'))
  const page = getPage(searchParams.get('page'))

  const { data, isLoading, isError, isRefetching, refetch } = useRecapsList(
    clientId || undefined,
    status,
    archived,
    page,
  )
  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const current = selected ? (items.find((item) => item.id === selected.id) ?? selected) : null

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

  const clearSelection = () => {
    setSelected(null)
    setFocusRequest(null)
  }

  const handleSelect = (item: RecapListItem) => {
    if (isDesktop) {
      setFocusRequest({ id: item.id, mode: 'select' })
    } else {
      // El diálogo es modal: una fila solo se puede pulsar con él cerrado.
      dialogOpenerIdRef.current = item.id
    }
    setSelected(item)
  }

  const handleFocusHandled = useCallback(() => setFocusRequest(null), [])

  // El borrador se crea en la primera edición y desaparece si vuelve a coincidir con lo guardado.
  const handleDraftChange = (id: string, values: RecapReplyValues, saved: RecapReplyValues) => {
    setDrafts((previous) => {
      if (!sameReply(values, saved)) return { ...previous, [id]: values }
      if (!(id in previous)) return previous
      const rest = { ...previous }
      delete rest[id]
      return rest
    })
  }

  const dropDraft = useCallback((id: string) => {
    setDrafts((previous) => {
      if (!(id in previous)) return previous
      const rest = { ...previous }
      delete rest[id]
      return rest
    })
  }, [])

  // Tras revisar, abre el siguiente recap por revisar de la lista del momento del envío (previa al
  // refetch, aún contiene el revisado) o avisa de que no quedan. Solo se cambia la selección si sigue
  // en el recap revisado: si el usuario eligió otro (o cerró el diálogo) mientras se enviaba, se respeta.
  const handleReviewed = (reviewedItem: RecapListItem, listAtSubmit: RecapListItem[], desktopAtSubmit: boolean) => {
    const stillSelected = selectedIdRef.current === reviewedItem.id
    const nextPending = getNextPendingRecap(listAtSubmit, reviewedItem.id)
    if (nextPending) {
      if (stillSelected) {
        setSelected(nextPending)
        setFocusRequest({ id: nextPending.id, mode: 'advance' })
      }
      return
    }

    toast.info('No quedan recaps por revisar en esta lista.')
    if (!stillSelected) return
    if (desktopAtSubmit) {
      setSelected({ ...reviewedItem, status: 'REVIEWED' })
      setFocusRequest({ id: reviewedItem.id, mode: 'heading' })
    } else {
      clearSelection()
    }
  }

  // La mutación vive en la página (siempre montada) para que el resultado se notifique aunque la vista
  // rápida se haya cerrado o cambiado. Se usa la promesa de mutateAsync porque los callbacks de mutate()
  // se pierden si el observer cambia de mutación o se desmonta.
  const handleSend = (item: RecapListItem, values: RecapReplyValues) => {
    if (sendingIds.has(item.id)) return
    const listAtSubmit = items
    const desktopAtSubmit = isDesktop
    setSendingIds((previous) => new Set(previous).add(item.id))
    reviewAsync({ id: item.id, admin_comments: values.internalNote, client_feedback_text: values.clientFeedback })
      .then(
        () => {
          toast.success('Recap revisado correctamente')
          dropDraft(item.id)
          handleReviewed(item, listAtSubmit, desktopAtSubmit)
        },
        (error: unknown) => {
          // El borrador se conserva para poder reintentar.
          toast.error(getApiErrorMessage(error, 'No se ha podido revisar el recap'))
        },
      )
      .finally(() => {
        setSendingIds((previous) => {
          const next = new Set(previous)
          next.delete(item.id)
          return next
        })
      })
  }

  const handleDialogCloseAutoFocus = (event: Event) => {
    const openerId = dialogOpenerIdRef.current
    dialogOpenerIdRef.current = null
    const opener = openerId ? document.getElementById(getRecapRowId(openerId)) : null
    if (opener) {
      event.preventDefault()
      opener.focus()
    }
  }

  const previousItem = current ? getSiblingRecap(items, current.id, -1) : null
  const nextItem = current ? getSiblingRecap(items, current.id, 1) : null
  const position = current ? items.findIndex((item) => item.id === current.id) + 1 : 0
  const currentDraft = current ? drafts[current.id] : undefined
  const currentSending = current ? sendingIds.has(current.id) : false
  const currentFocusRequest = current && focusRequest?.id === current.id ? focusRequest.mode : null
  const draftIds = new Set(Object.keys(drafts))

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
        onClientChange={(nextClientId) => {
          clearSelection()
          updateSearchParams({ clientId: nextClientId, page: 1 })
        }}
        onStatusChange={(nextStatus) => {
          clearSelection()
          updateSearchParams({ status: nextStatus, page: 1 })
        }}
        onArchivedChange={(nextArchived) => {
          clearSelection()
          updateSearchParams({ archived: nextArchived, page: 1 })
        }}
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-0">
        <section aria-label="Recaps recibidos" className="min-w-0 space-y-4 lg:border-r lg:border-border lg:pr-6">
          <RecapsInboxList
            items={items}
            isLoading={isLoading}
            isError={isError}
            isRefetching={isRefetching}
            onRetry={() => void refetch()}
            clientId={clientId || undefined}
            status={status}
            archived={archived}
            page={page}
            totalPages={totalPages}
            selectedId={current?.id}
            draftIds={draftIds}
            controlsId={isDesktop ? RECAP_QUICK_VIEW_PANE_ID : undefined}
            onPageChange={(nextPage) => {
              clearSelection()
              updateSearchParams({ page: nextPage })
            }}
            onSelect={handleSelect}
          />
        </section>

        {isDesktop ? (
          <RecapQuickViewPane
            item={current}
            draft={currentDraft}
            onDraftChange={handleDraftChange}
            onSend={handleSend}
            onDraftDiscard={dropDraft}
            isSending={currentSending}
            focusRequest={currentFocusRequest}
            onFocusHandled={handleFocusHandled}
          />
        ) : (
          <RecapQuickViewDialog
            item={current}
            open={Boolean(current)}
            onOpenChange={(open) => {
              // Cerrar conserva el borrador: es por recap y la fila lo marca.
              if (!open) clearSelection()
            }}
            onCloseAutoFocus={handleDialogCloseAutoFocus}
            draft={currentDraft}
            onDraftChange={handleDraftChange}
            onSend={handleSend}
            onDraftDiscard={dropDraft}
            isSending={currentSending}
            focusRequest={currentFocusRequest}
            onFocusHandled={handleFocusHandled}
            position={position}
            total={items.length}
            onPrevious={
              previousItem
                ? () => {
                    setSelected(previousItem)
                    setFocusRequest(null)
                  }
                : undefined
            }
            onNext={
              nextItem
                ? () => {
                    setSelected(nextItem)
                    setFocusRequest(null)
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  )
}

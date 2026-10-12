import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ImageUploadField } from '@/components/uploads/image-upload-field'
import { getApiErrorMessage } from '@/features/uploads/api'
import {
  createProgressPhotoOperationId,
  useAssociateClientProgressPhoto,
  useClientProgressPhotoHistory,
  useCreateClientProgressPhotoSession,
} from '../api'
import type { ProgressPhoto, ProgressPhotoSession, ProgressPhotoView } from '../types'
import { ProgressPhotosImage } from './progress-photos-image'
import { ProgressPhotosWorkspace } from './progress-photos-workspace'

const HISTORY_PAGE_SIZE = 20
const MAX_LOADED_COMPARISON_SESSIONS = HISTORY_PAGE_SIZE * 5

const PHOTO_VIEWS: Array<{ value: ProgressPhotoView; label: string }> = [
  { value: 'FRONT', label: 'Frontal' },
  { value: 'LEFT', label: 'Lateral izquierda' },
  { value: 'RIGHT', label: 'Lateral derecha' },
  { value: 'BACK', label: 'Espalda' },
]

interface PendingPhotoAction {
  sessionId: string
  view: ProgressPhotoView
  upload_operation_id: string
  replaces_photo_id?: string
}

interface PendingAssociation extends PendingPhotoAction {
  upload_id: string
  operation_id: string
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function activePhoto(session: ProgressPhotoSession | undefined, view: ProgressPhotoView) {
  return session?.photos.find((photo) => photo.view === view && photo.state === 'ACTIVE')
}

function sessionMissingViews(session: ProgressPhotoSession) {
  return PHOTO_VIEWS.filter(({ value }) => !activePhoto(session, value))
}

function statusLabel(session: ProgressPhotoSession) {
  const missing = sessionMissingViews(session)
  if (missing.length === 0) {
    return session.is_complete ? 'Completa · 4 de 4 vistas' : '4 de 4 vistas · finalización no confirmada'
  }
  return `Incompleta · faltan ${missing.length} de 4 vistas`
}

function sessionWithDifferentDate(sessions: ProgressPhotoSession[], session: ProgressPhotoSession | undefined) {
  return sessions.find((candidate) => candidate.session_date !== session?.session_date)
}

export function ProgressPhotosPanel({ clientId }: { clientId: string }) {
  return <ClientProgressPhotosPanel key={clientId} clientId={clientId} />
}

function ClientProgressPhotosPanel({ clientId }: { clientId: string }) {
  const [historyPage, setHistoryPage] = useState(1)
  const currentHistoryPage = historyPage
  const enlargeTrigger = useRef<HTMLButtonElement | null>(null)
  const history = useClientProgressPhotoHistory(clientId, currentHistoryPage, HISTORY_PAGE_SIZE)
  const createSession = useCreateClientProgressPhotoSession(clientId)
  const associatePhoto = useAssociateClientProgressPhoto(clientId)
  const sessions = useMemo(() => history.data?.data ?? [], [history.data])
  const totalPages = Math.max(1, history.data?.totalPages ?? 1)
  const [loadedComparisonSessions, setLoadedComparisonSessions] = useState<ProgressPhotoSession[]>([])
  const [olderSessionId, setOlderSessionId] = useState('')
  const [newerSessionId, setNewerSessionId] = useState('')
  const [selectedView, setSelectedView] = useState<ProgressPhotoView>('FRONT')
  const [uploadSessionId, setUploadSessionId] = useState('')
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [createOperation, setCreateOperation] = useState<{ date: string; operation_id: string } | null>(null)
  const createOperationRef = useRef<{ date: string; operation_id: string } | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingPhotoAction | null>(null)
  const pendingActionRef = useRef<PendingPhotoAction | null>(null)
  const [pendingAssociation, setPendingAssociation] = useState<PendingAssociation | null>(null)
  const pendingAssociationRef = useRef<PendingAssociation | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [replaceCandidate, setReplaceCandidate] = useState<{ sessionId: string; view: ProgressPhotoView; photo: ProgressPhoto } | null>(null)
  const [enlarged, setEnlarged] = useState<{ photo: ProgressPhoto; label: string; date: string } | null>(null)

  const setCurrentAction = (action: PendingPhotoAction | null) => {
    pendingActionRef.current = action
    setPendingAction(action)
  }

  const setCurrentAssociation = (association: PendingAssociation | null) => {
    pendingAssociationRef.current = association
    setPendingAssociation(association)
  }

  useEffect(() => () => {
    // Invalidate callbacks from requests/uploads belonging to an unmounted client.
    createOperationRef.current = null
    pendingActionRef.current = null
    pendingAssociationRef.current = null
  }, [])

  useEffect(() => {
    if (history.data && currentHistoryPage > totalPages) {
      setHistoryPage(totalPages)
    }
  }, [currentHistoryPage, history.data, totalPages])

  useEffect(() => {
    if (!history.data) return

    setLoadedComparisonSessions((current) => {
      const selectedIds = new Set([olderSessionId, newerSessionId].filter(Boolean))
      const merged = new Map<string, ProgressPhotoSession>()
      for (const session of [...history.data.data, ...current]) {
        if (!merged.has(session.id)) merged.set(session.id, session)
      }
      const selected = [...merged.values()].filter((session) => selectedIds.has(session.id))
      const remaining = [...merged.values()].filter((session) => !selectedIds.has(session.id))
      return [...selected, ...remaining].slice(0, Math.max(MAX_LOADED_COMPARISON_SESSIONS, selected.length))
    })
  }, [history.data, newerSessionId, olderSessionId])

  useEffect(() => {
    if (loadedComparisonSessions.length === 0) return

    const currentNewer = loadedComparisonSessions.find((session) => session.id === newerSessionId)
    const currentOlder = loadedComparisonSessions.find((session) => session.id === olderSessionId)
    const nextNewer = currentNewer ?? loadedComparisonSessions[0]
    const nextOlder = currentOlder && currentOlder.session_date !== nextNewer.session_date
      ? currentOlder
      : sessionWithDifferentDate(loadedComparisonSessions, nextNewer)

    const reversed = nextOlder && nextOlder.session_date > nextNewer.session_date
    const earlier = reversed ? nextNewer : nextOlder
    const later = reversed ? nextOlder : nextNewer
    if (later.id !== newerSessionId) setNewerSessionId(later.id)
    if (earlier?.id !== olderSessionId) setOlderSessionId(earlier?.id ?? '')
  }, [loadedComparisonSessions, newerSessionId, olderSessionId])

  useEffect(() => {
    if (sessions.length === 0) return
    setUploadSessionId((current) => sessions.some((session) => session.id === current) ? current : sessions[0].id)
  }, [sessions])

  const olderSession = useMemo(
    () => loadedComparisonSessions.find((session) => session.id === olderSessionId),
    [loadedComparisonSessions, olderSessionId],
  )
  const newerSession = useMemo(
    () => loadedComparisonSessions.find((session) => session.id === newerSessionId),
    [loadedComparisonSessions, newerSessionId],
  )
  const uploadSession = useMemo(
    () => sessions.find((session) => session.id === uploadSessionId),
    [sessions, uploadSessionId],
  )
  const comparisonSessions = olderSession && newerSession && olderSession.session_date !== newerSession.session_date
    ? [olderSession, newerSession].sort((a, b) => a.session_date.localeCompare(b.session_date))
    : newerSession ? [newerSession] : []
  const enlargementPhotos = comparisonSessions.flatMap((session) => PHOTO_VIEWS.flatMap(({ value, label }) => {
    const photo = activePhoto(session, value)
    return photo ? [{ photo, label, date: session.session_date }] : []
  }))
  const enlargedIndex = enlargementPhotos.findIndex((item) => item.photo.id === enlarged?.photo.id)

  function navigateEnlargement(offset: number) {
    const next = enlargementPhotos[enlargedIndex + offset]
    if (next) setEnlarged(next)
  }
  const photoActionBusy = Boolean(pendingAction) || Boolean(pendingAssociation) || associatePhoto.isPending

  async function createDatedSession() {
    const payload = createOperationRef.current?.date === sessionDate
      ? createOperationRef.current
      : { date: sessionDate, operation_id: createProgressPhotoOperationId('session') }
    createOperationRef.current = payload
    setCreateOperation(payload)

    try {
      const created = await createSession.mutateAsync({ session_date: payload.date, operation_id: payload.operation_id })
      if (createOperationRef.current?.operation_id !== payload.operation_id) return
      setUploadSessionId(created.id)
      createOperationRef.current = null
      setCreateOperation(null)
    } catch {
      // Keep this identity for the explicit retry of this dated-session command.
    }
  }

  async function associatePendingPhoto(payload: PendingAssociation) {
    try {
      await associatePhoto.mutateAsync(payload)
      if (pendingAssociationRef.current?.operation_id !== payload.operation_id) return
      setCurrentAssociation(null)
      setCurrentAction(null)
      setUploadPreview(null)
    } catch {
      if (pendingAssociationRef.current?.operation_id === payload.operation_id) {
        setCurrentAssociation(payload)
      }
    }
  }

  function startPhotoAction(action: Omit<PendingPhotoAction, 'upload_operation_id'>) {
    if (photoActionBusy) return
    setCurrentAction({ ...action, upload_operation_id: createProgressPhotoOperationId('upload') })
    setCurrentAssociation(null)
    setUploadPreview(null)
  }

  function onUploadComplete(action: PendingPhotoAction, imageUrl: string, uploadId?: string) {
    if (pendingActionRef.current?.upload_operation_id !== action.upload_operation_id) return

    if (!imageUrl) {
      setUploadPreview(null)
      return
    }
    if (!uploadId) return

    setUploadPreview(imageUrl)
    const association: PendingAssociation = {
      ...action,
      upload_id: uploadId,
      operation_id: createProgressPhotoOperationId('association'),
    }
    setCurrentAssociation(association)
    void associatePendingPhoto(association)
  }

  function chooseComparisonSession(kind: 'older' | 'newer', sessionId: string) {
    const selected = loadedComparisonSessions.find((session) => session.id === sessionId)
    if (!selected) return
    setEnlarged(null)

    const currentOther = kind === 'older' ? newerSession : olderSession
    const other = currentOther?.session_date === selected.session_date
      ? sessionWithDifferentDate(loadedComparisonSessions, selected)
      : currentOther
    if (!other) {
      setOlderSessionId('')
      setNewerSessionId(selected.id)
      return
    }
    // Keep the controls and the displayed columns in the same civil-date order.
    const [earlier, later] = [selected, other].sort((a, b) => a.session_date.localeCompare(b.session_date))
    setOlderSessionId(earlier.id)
    setNewerSessionId(later.id)
  }

  if (history.isLoading) {
    return <Card><CardContent className="space-y-4 py-8 text-sm text-muted-foreground" role="status"><p>Cargando fotos de progreso…</p><div aria-hidden="true" className="grid gap-4 sm:grid-cols-2"><div className="h-64 rounded bg-muted/50" /><div className="h-64 rounded bg-muted/50" /></div></CardContent></Card>
  }

  if (history.isError) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8">
          <p role="alert">No se han podido cargar las fotos: {getApiErrorMessage(history.error)}</p>
          <Button variant="outline" onClick={() => void history.refetch()}><RefreshCw className="h-4 w-4" />Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-w-0 space-y-6 motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">Fotos de progreso</h2>
        <p className="max-w-prose text-sm text-muted-foreground">Revisa fechas, vistas disponibles y contexto antes de comparar. Completar o reemplazar fotos requiere una acción explícita.</p>
        <p className="text-sm tabular-nums">{history.data?.total ?? 0} sesiones en el historial · {sessions.length} en esta página · {sessions.filter((session) => session.is_complete && sessionMissingViews(session).length === 0).length} completas en esta página</p>
      </header>
      {sessions.length > 0 && <ProgressPhotosWorkspace
        sessions={loadedComparisonSessions} olderId={olderSessionId} newerId={newerSessionId}
        selectedView={selectedView} views={PHOTO_VIEWS} formatDate={formatDate}
        onOlderChange={(id) => chooseComparisonSession('older', id)}
        onNewerChange={(id) => chooseComparisonSession('newer', id)}
        onViewChange={(view) => { setSelectedView(view); setEnlarged(null) }}
        onEnlarge={(photo, label, date, trigger) => { enlargeTrigger.current = trigger; setEnlarged({ photo, label, date }) }}
      />}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial y nueva sesión</CardTitle>
          <CardDescription>Consulta otras fechas o crea una sesión para añadir las cuatro vistas. Crear una sesión no añade fotos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium">Nueva sesión fechada
              <input aria-label="Fecha de nueva sesión" type="date" value={sessionDate} disabled={createSession.isPending} onChange={(event) => {
                setSessionDate(event.target.value)
                createOperationRef.current = null
                setCreateOperation(null)
                createSession.reset()
              }} className="mt-1 block min-h-11 rounded-md border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <Button onClick={() => void createDatedSession()} disabled={createSession.isPending || !sessionDate}>
              <ImagePlus className="h-4 w-4" />{createSession.isPending ? 'Creando…' : createOperation ? 'Reintentar crear sesión' : 'Crear sesión incompleta'}
            </Button>
          </div>
          {createSession.isError && <p role="alert" className="text-sm text-status-error">{getApiErrorMessage(createSession.error, 'No se ha podido crear la sesión. Puedes reintentarlo sin duplicarla.')}</p>}

          {sessions.length === 0 ? (
            <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">Aún no hay sesiones de fotos. Crea una sesión fechada para añadir las cuatro vistas.</p>
          ) : (
            <>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Historial de sesiones de fotos">
                {sessions.map((session) => {
                  const missing = sessionMissingViews(session)
                  return (
                    <li key={session.id} className="min-w-0 border-b py-3">
                      <p className="font-medium">{formatDate(session.session_date)}</p>
                      <p className="mt-1 text-sm" aria-label={`Estado ${formatDate(session.session_date)}`}>{statusLabel(session)}</p>
                      {missing.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Pendientes: {missing.map(({ label }) => label).join(', ')}</p>}
                    </li>
                  )
                })}
              </ul>
              <div className="flex items-center justify-between gap-3" aria-label="Paginación del historial de fotos">
                <Button type="button" variant="outline" size="sm" onClick={() => setHistoryPage((page) => Math.max(1, page - 1))} disabled={currentHistoryPage <= 1 || photoActionBusy}>Anterior</Button>
                <p className="text-sm text-muted-foreground">Página {currentHistoryPage} de {totalPages}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setHistoryPage((page) => Math.min(totalPages, page + 1))} disabled={currentHistoryPage >= totalPages || photoActionBusy}>Siguiente</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {sessions.length > 0 && <>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completar sesión</CardTitle>
            <CardDescription>Las acciones de foto se procesan de una en una: reintenta una asociación pendiente antes de iniciar otra.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm font-medium">Sesión a completar
              <select aria-label="Sesión a completar" value={uploadSessionId} onChange={(event) => { setUploadSessionId(event.target.value); setCurrentAction(null); setCurrentAssociation(null); setUploadPreview(null); setReplaceCandidate(null) }} disabled={photoActionBusy} className="mt-1 block min-h-11 w-full rounded-md border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {sessions.map((session) => <option key={session.id} value={session.id}>{formatDate(session.session_date)} · {statusLabel(session)}</option>)}
              </select>
            </label>
            {uploadSession && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {PHOTO_VIEWS.map(({ value, label }) => {
                const photo = activePhoto(uploadSession, value)
                const actionMatches = pendingAction?.sessionId === uploadSession.id && pendingAction.view === value
                return <div key={value} className="rounded-lg border p-3">
                  <p className="font-medium">{label}</p>
                  {photo ? <>
                    <div className="mt-2"><ProgressPhotosImage key={`${uploadSession.id}:${photo.id}:${photo.image_url}`} src={photo.image_url} alt={`${label} activo del ${formatDate(uploadSession.session_date)}`} /></div>
                    <Button type="button" className="mt-3 w-full" variant="outline" onClick={() => setReplaceCandidate({ sessionId: uploadSession.id, view: value, photo })} disabled={photoActionBusy}>Reemplazar {label}</Button>
                  </> : <>
                    <p className="mt-2 text-sm text-muted-foreground">Pendiente · sin imagen</p>
                    <Button type="button" className="mt-3 w-full" variant="outline" onClick={() => startPhotoAction({ sessionId: uploadSession.id, view: value })} disabled={photoActionBusy}>Subir {label}</Button>
                  </>}
                  {actionMatches && <div className="mt-3"><ImageUploadField value={uploadPreview ?? ''} onChange={(url, uploadId) => onUploadComplete(pendingAction, url, uploadId)} fileKeyPrefix={`progress-photos/${clientId}/${uploadSession.id}/${value.toLowerCase()}`} purpose="PROGRESS_PHOTO" managedOnly managedUploadOperationId={pendingAction.upload_operation_id} label={`Nueva imagen ${label}`} disabled={associatePhoto.isPending} /></div>}
                </div>
              })}
            </div>}
            {pendingAssociation && associatePhoto.isError && <div className="rounded-md border border-status-error/40 p-3 text-sm" role="alert">
              <p>{getApiErrorMessage(associatePhoto.error, 'No se ha podido asociar la imagen. Reintenta la misma operación; no subas otra foto.')}</p>
              <Button className="mt-2" variant="outline" onClick={() => void associatePendingPhoto(pendingAssociation)} disabled={associatePhoto.isPending}>Reintentar asociación</Button>
            </div>}
          </CardContent>
        </Card>
      </>}

      <AlertDialog open={Boolean(replaceCandidate)} onOpenChange={(open) => { if (!open) setReplaceCandidate(null) }}>
        <AlertDialogContent className="motion-reduce:animate-none motion-reduce:transition-none motion-reduce:[&_*]:transition-none">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reemplazar esta foto activa?</AlertDialogTitle>
            <AlertDialogDescription>La foto actual dejará de ser la vista activa. Esta acción solo continúa con la identidad de la foto que estás viendo como precondición.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => {
              event.preventDefault()
              if (!replaceCandidate || !uploadSession || replaceCandidate.sessionId !== uploadSession.id || photoActionBusy) return
              startPhotoAction({ sessionId: uploadSession.id, view: replaceCandidate.view, replaces_photo_id: replaceCandidate.photo.id })
              setReplaceCandidate(null)
            }}>Confirmar reemplazo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(enlarged)} onOpenChange={(open) => { if (!open) setEnlarged(null) }}>
        <DialogContent className="max-w-3xl motion-reduce:animate-none motion-reduce:transition-none motion-reduce:[&_*]:transition-none" onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (enlargeTrigger.current?.isConnected) enlargeTrigger.current.focus()
        }} onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); navigateEnlargement(-1) }
          if (event.key === 'ArrowRight') { event.preventDefault(); navigateEnlargement(1) }
        }}>
          <DialogHeader>
            <DialogTitle aria-live="polite">{enlarged ? `${enlarged.label} · ${formatDate(enlarged.date)}` : 'Foto de progreso'}</DialogTitle>
            <DialogDescription>Imagen ampliada de la sesión seleccionada. Pulsa Escape o el botón de cerrar para volver al comparador.</DialogDescription>
          </DialogHeader>
          {enlarged && <ProgressPhotosImage key={`${enlarged.photo.id}:${enlarged.photo.image_url}`} src={enlarged.photo.image_url} alt={`${enlarged.label} ampliada del ${formatDate(enlarged.date)}`} enlarged />}
          <nav aria-label="Navegación de imágenes ampliadas" className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="outline" className="motion-reduce:transition-none" disabled={enlargedIndex <= 0} onClick={() => navigateEnlargement(-1)}>Imagen anterior</Button>
            <span className="text-sm tabular-nums">{enlargedIndex + 1} de {enlargementPhotos.length} fotos disponibles</span>
            <Button type="button" variant="outline" className="motion-reduce:transition-none" disabled={enlargedIndex < 0 || enlargedIndex >= enlargementPhotos.length - 1} onClick={() => navigateEnlargement(1)}>Imagen siguiente</Button>
            <Button type="button" variant="ghost" className="motion-reduce:transition-none" onClick={() => setEnlarged(null)}>Cerrar ampliación</Button>
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  )
}

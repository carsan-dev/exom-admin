import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { getApiErrorMessage } from '@/lib/api-utils'
import { getRecapForReview, recapIdentity, usePublishRecapReview, useRecapIdentity, useSaveRecapReviewDraft } from '../api'
import type { RecapReviewRecord } from '../types'
import { RecapSectionCard } from './recap-section-card'

const fields = {
  coach_summary: 'Resumen del coach', changes: 'Cambios realizados', next_week_goals: 'Objetivos de la próxima semana',
} as const
interface ReviewValues { coach_summary: string; changes: string; next_week_goals: string }
function valuesOf(recap: RecapReviewRecord): ReviewValues {
  return { coach_summary: recap.draft_coach_summary ?? '', changes: recap.draft_changes ?? '', next_week_goals: recap.draft_next_week_goals ?? '' }
}
const sameValues = (a: ReviewValues, b: ReviewValues) => Object.keys(fields).every((key) => a[key as keyof ReviewValues] === b[key as keyof ReviewValues])
interface Props { recap: RecapReviewRecord; archived: boolean; onDirty: (dirty: boolean) => void; onPending?: (pending: boolean) => void; disabled?: boolean }
export function RecapReviewEditor({ recap, archived, onDirty, onPending, disabled = false }: Props) {
  const identity = useRecapIdentity()
  const owner = useRef(identity).current
  const live = useRef(false)
  const busy = useRef(false)
  const save = useSaveRecapReviewDraft()
  const publish = usePublishRecapReview()
  const [record, setRecord] = useState(recap)
  const [values, setValues] = useState(() => valuesOf(recap))
  const [baseline, setBaseline] = useState(() => valuesOf(recap))
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [server, setServer] = useState<RecapReviewRecord | null>(null)
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState('')
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  const current = () => live.current && recapIdentity() === owner
  const pending = save.isPending || publish.isPending
  useEffect(() => { onPending?.(pending); return () => onPending?.(false) }, [pending, onPending])
  const dirty = !sameValues(values, baseline) || pending || Boolean(error)
  useEffect(() => { onDirty(dirty); return () => onDirty(false) }, [dirty, onDirty])
  const version = record.review_version
  const available = !disabled && !archived && recap.status !== 'DRAFT' && identity === owner && Boolean(identity.split(':')[0]) && Number.isInteger(version)
  const stale = (recap.review_version ?? 0) > (version ?? -1)
  const canPublish = available && saved && !dirty && !pending && !stale
  async function readServer() {
    if (!current() || busy.current) return
    busy.current = true; setReading(true); setReadError('')
    try {
      const result = await getRecapForReview(recap.id, owner)
      if (current()) setServer(result)
    } catch (cause) {
      if (current()) setReadError(`No se pudo consultar la versión del servidor. ${getApiErrorMessage(cause, 'Reintenta la consulta; no se ha enviado otra operación.')}`)
    } finally { busy.current = false; if (current()) setReading(false) }
  }
  async function command(isPublication: boolean) {
    if (!current() || busy.current || !available || pending || error || version === undefined || (isPublication && !canPublish)) return
    busy.current = true
    setConfirm(false)
    try {
      const result = isPublication
        ? await publish.mutateAsync({ id: recap.id, expected_version: version, confirm: true })
        : await save.mutateAsync({ id: recap.id, expected_version: version,
          coach_summary: values.coach_summary || null, changes: values.changes || null, next_week_goals: values.next_week_goals || null })
      if (!current()) return
      setRecord(result); setValues(valuesOf(result)); setBaseline(valuesOf(result)); setSaved(!isPublication)
    } catch (cause) {
      if (!current()) return
      setSaved(false)
      setError(`${getApiErrorMessage(cause, 'No se pudo confirmar la operación.')} Se conserva tu borrador y su versión. Consulta el servidor antes de continuar; no se reintentará la publicación automáticamente.`)
      busy.current = false
      await readServer()
    } finally { busy.current = false }
  }
  function discard() {
    if (!current() || !server || reading || !window.confirm('Descartar tu borrador privado y cargar la versión consultada del servidor?')) return
    setRecord(server); setValues(valuesOf(server)); setBaseline(valuesOf(server)); setSaved(false); setError(''); setServer(null); setReadError('')
  }
  // Only confirmed server fields enter this preview; local draft values never do.
  const published = record.review_version !== undefined && (record.review_version > (recap.review_version ?? -1)) ? record : recap
  return <RecapSectionCard title="Revisión compartible" description="El borrador es privado. El cliente mantiene la última publicación hasta que confirmes una nueva revisión.">
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Borrador: versión {version ?? 'no disponible'}</p>
      {Object.entries(fields).map(([key, label]) => <label key={key} className="block space-y-2 text-sm font-medium">
        <span>{label} · borrador privado</span>
        <textarea rows={4} maxLength={3000} value={values[key as keyof ReviewValues]} disabled={!available || pending || reading}
          onChange={(event) => { setValues((old) => ({ ...old, [key]: event.target.value })); setSaved(false) }}
          className="flex w-full resize-y rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />
      </label>)}
      {recap.status === 'DRAFT' && <p className="text-sm text-muted-foreground">El cliente debe enviar el recap antes de que puedas redactar o publicar su revisión.</p>}
      {archived && <p className="text-sm text-muted-foreground">Recap archivado: revisión en modo lectura.</p>}
      {version === undefined && <p role="alert">Versión no disponible. Recarga el recap antes de editar.</p>}
      {stale && !error && <div role="alert" className="space-y-2 text-sm"><p>La revisión cambió. Se conserva tu borrador. Consulta la versión del servidor antes de continuar.</p><Button variant="outline" disabled={reading} onClick={() => void readServer()}>Consultar versión del servidor</Button></div>}
      {error && <div role="alert" className="space-y-2 text-sm"><p>{error}</p><Button variant="outline" disabled={reading} onClick={() => void readServer()}>{reading ? 'Consultando...' : 'Consultar versión del servidor'}</Button></div>}
      {readError && <p role="status" className="text-sm">{readError}</p>}
      {server && <div className="space-y-2 border-y py-3 text-sm"><p>Servidor: versión {server.review_version ?? 'no disponible'}</p><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{server.draft_coach_summary || 'Sin resumen guardado'}</p><Button variant="outline" disabled={reading} onClick={discard}>Descartar borrador y cargar versión</Button></div>}
      <div className="flex flex-wrap gap-3">
        <Button disabled={!available || pending || reading || Boolean(error) || stale} onClick={() => void command(false)}>{save.isPending ? 'Guardando borrador...' : 'Guardar borrador privado'}</Button>
        <Button variant="outline" disabled={!canPublish} onClick={() => setConfirm(true)}>{publish.isPending ? 'Publicando...' : 'Publicar revisión'}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Guarda el borrador actual antes de publicar. Guardarlo no cambia lo que ve el cliente ni envía el feedback anterior.</p>
      <section aria-label="Última revisión publicada" className="space-y-3 border-t pt-4">
        <h3 className="font-semibold">Última revisión publicada · visible para el cliente</h3>
        <dl className="space-y-3">{Object.entries(fields).map(([key, label]) => <div key={key}><dt className="text-sm font-medium">{label}</dt><dd className="whitespace-pre-wrap text-sm text-muted-foreground [overflow-wrap:anywhere]">{published[`published_${key}` as keyof Pick<RecapReviewRecord, 'published_coach_summary' | 'published_changes' | 'published_next_week_goals'>] || 'Sin contenido publicado'}</dd></div>)}</dl>
      </section>
    </div>
    <AlertDialog open={confirm} onOpenChange={setConfirm}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Publicar revisión para el cliente?</AlertDialogTitle><AlertDialogDescription>Reemplazarás la última revisión visible por este borrador guardado. El feedback anterior y las notas internas se conservan por separado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={!canPublish} onClick={() => void command(true)}>Confirmar publicación</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </RecapSectionCard>
}

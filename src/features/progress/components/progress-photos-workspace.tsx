import { Button } from '@/components/ui/button'
import type { ProgressPhoto, ProgressPhotoSession, ProgressPhotoView } from '../types'
import { ProgressPhotosImage } from './progress-photos-image'

interface PhotoViewOption {
  value: ProgressPhotoView
  label: string
}

interface ProgressPhotosWorkspaceProps {
  sessions: ProgressPhotoSession[]
  olderId: string
  newerId: string
  selectedView: ProgressPhotoView
  views: PhotoViewOption[]
  formatDate: (date: string) => string
  onOlderChange: (id: string) => void
  onNewerChange: (id: string) => void
  onViewChange: (view: ProgressPhotoView) => void
  onEnlarge: (photo: ProgressPhoto, label: string, date: string, trigger: HTMLButtonElement) => void
}

export function ProgressPhotosWorkspace({ sessions, olderId, newerId, selectedView, views, formatDate, onOlderChange, onNewerChange, onViewChange, onEnlarge }: ProgressPhotosWorkspaceProps) {
  const older = sessions.find((session) => session.id === olderId)
  const newer = sessions.find((session) => session.id === newerId)
  const comparison = older && newer && older.session_date !== newer.session_date
  const displayed = comparison ? [older, newer].sort((a, b) => a.session_date.localeCompare(b.session_date)) : newer ? [newer] : []
  const label = views.find((view) => view.value === selectedView)?.label ?? selectedView
  const controls = [
    { label: 'Fecha anterior', value: olderId, other: newer, onChange: onOlderChange },
    { label: 'Fecha posterior', value: newerId, other: older, onChange: onNewerChange },
  ]

  return <section aria-label="Espacio de comparación de fotos" className="min-w-0 space-y-5 rounded-lg border bg-card p-4 sm:p-6">
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Comparador</h2>
      <p className="max-w-prose text-sm text-muted-foreground">Elige dos sesiones de fechas civiles distintas. La vista seleccionada se mantiene en ambas columnas. Las imágenes se muestran completas, sin recorte.</p>
      <p className="text-sm">Contexto de captura: no proporcionado</p>
      <p className="max-w-prose text-sm text-muted-foreground">No hay datos sobre postura, iluminación o distancia. Estas condiciones pueden variar; las fotos no permiten establecer por sí solas cambios físicos.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {controls.map((control) => <label key={control.label} className="min-w-0 text-sm font-medium">{control.label}
        <select aria-label={control.label} value={control.value} onChange={(event) => control.onChange(event.target.value)}
          className="mt-1 block min-h-11 w-full rounded-md border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">Seleccionar otra fecha</option>
          {sessions.map((session) => <option key={session.id} value={session.id} disabled={session.id !== control.value && session.session_date === control.other?.session_date}>
            {formatDate(session.session_date)} · sesión {session.id.slice(0, 8)}
          </option>)}
        </select>
      </label>)}
    </div>
    {!comparison && <p role="status" className="rounded-md bg-muted/50 p-3 text-sm">Una sola fecha disponible para esta selección. Crea o consulta una sesión de otra fecha para comparar dos fechas distintas.</p>}
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium">Vista comparada</legend>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {views.map(({ value, label: viewLabel }) => <Button key={value} type="button" variant={value === selectedView ? 'default' : 'outline'}
          className="h-auto min-h-11 whitespace-normal motion-reduce:transition-none" aria-pressed={value === selectedView} onClick={() => onViewChange(value)}>{viewLabel}</Button>)}
      </div>
    </fieldset>
    <p role="status" aria-live="polite" className="text-sm font-medium">Vista seleccionada: {label} · {displayed.filter((session) => session.photos.some((photo) => photo.state === 'ACTIVE' && photo.view === selectedView)).length} de {displayed.length} sesiones con esta vista</p>
    <div className="grid items-start gap-5 md:grid-cols-2">
      {displayed.map((session, index) => {
        const photo = session.photos.find((photo) => photo.view === selectedView && photo.state === 'ACTIVE')
        const available = views.filter((view) => session.photos.some((photo) => photo.state === 'ACTIVE' && photo.view === view.value))
        return <article key={session.id} aria-label={`Sesión del ${formatDate(session.session_date)}`} className="min-w-0 space-y-3">
          <header className="space-y-1 border-b pb-3">
            <h3 className="text-base font-semibold"><time dateTime={session.session_date}>{formatDate(session.session_date)}</time></h3>
            <p className="text-sm text-muted-foreground">{comparison ? index === 0 ? 'Fecha anterior' : 'Fecha posterior' : 'Sesión seleccionada'} · {available.length} / 4 vistas disponibles</p>
            <p className="text-sm">{session.is_complete && available.length === 4 ? 'Sesión completa' : 'Sesión pendiente de completar o confirmar'}</p>
          </header>
          {photo ? <ProgressPhotosImage key={`${session.id}:${photo.id}:${photo.image_url}`} src={photo.image_url} alt={`${label} del ${formatDate(session.session_date)}`}
            onEnlarge={(trigger) => onEnlarge(photo, label, session.session_date, trigger)} /> : <div className="flex aspect-[3/4] max-h-[34rem] items-center justify-center rounded-md border border-dashed bg-muted/20 p-6 text-center">
            <div className="space-y-2"><p role="status" className="text-sm font-medium">Vista {label} no disponible en esta fecha.</p><p className="text-sm text-muted-foreground">No se ha proporcionado una foto activa de esta vista. No se sustituye por otra imagen.</p></div>
          </div>}
          <details key={`${session.id}:${selectedView}`} className="border-t pt-3 text-sm">
            <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Metadatos de {label} · {formatDate(session.session_date)}</summary>
            <dl className="mt-3 space-y-2 break-words text-muted-foreground">
              <div><dt className="font-medium text-foreground">Identificador de sesión</dt><dd>{session.id}</dd></div>
              <div><dt className="font-medium text-foreground">Formato del archivo</dt><dd>{photo?.content_type || 'No proporcionado'}</dd></div>
              <div><dt className="font-medium text-foreground">Tamaño del archivo</dt><dd>{photo && Number.isFinite(photo.bytes) && photo.bytes >= 0 ? `${new Intl.NumberFormat('es-ES').format(photo.bytes)} bytes` : 'No proporcionado'}</dd></div>
              <div><dt className="font-medium text-foreground">Momento de captura</dt><dd>No proporcionado · la fecha de sesión no confirma la hora de captura.</dd></div>
            </dl>
          </details>
        </article>
      })}
    </div>
    <p className="text-xs text-muted-foreground">Opciones limitadas a las sesiones consultadas. Recorre el historial para cargar otras fechas; las dos sesiones seleccionadas se conservan.</p>
  </section>
}

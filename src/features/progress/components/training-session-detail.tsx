import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { getApiErrorStatus } from '@/lib/api-utils'
import { useTrainingSessionDetail } from '../api'
import type { TrainingSession } from '../types'

export function TrainingSessionDetail({ clientId, session, onClose }: {
  clientId: string; session: TrainingSession; onClose: () => void
}) {
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const titleRef = useRef<HTMLHeadingElement>(null)
  const id = useId()
  const query = useTrainingSessionDetail(clientId, session.date, session.training_session_id, cursors[cursors.length - 1])
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }) }, [])

  return <section aria-labelledby={id} className="space-y-4 rounded-lg border bg-muted/30 p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h3 id={id} ref={titleRef} tabIndex={-1} className="max-w-prose rounded-sm text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Detalle: {session.training_name || 'Nombre no disponible'} · {formatDate(`${session.date}T00:00:00`, "d 'de' MMMM 'de' yyyy")}
      </h3>
      <Button variant="outline" onClick={onClose}>Cerrar detalle</Button>
    </div>
    {query.isPending ? <p role="status">Cargando detalle…</p> : query.isError ? <div role="alert">
      {getApiErrorStatus(query.error) === 403 ? 'No tienes acceso a esta sesión.' : 'No se pudo cargar el detalle.'}
      <Button variant="outline" onClick={() => void query.refetch()}>Reintentar</Button>
    </div> : !query.data ? <p>Sesión no disponible.</p> : <>
      <div className="space-y-2 border-y py-3 text-sm">
        <p className="font-medium tabular-nums">RPE: {query.data.rpe ?? 'Sin dato'}</p>
        <p className="whitespace-pre-wrap break-words">Nota: {query.data.note || 'Sin dato'}</p>
      </div>
      {query.data.page.length === 0 ? <p>Sin series registradas en esta página.</p> :
        <div className="overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" role="region" aria-label="Series de la sesión" tabIndex={0}>
          <table className="w-full min-w-[580px] text-left text-sm tabular-nums [&_th]:py-2 [&_th]:pr-4 [&_td]:py-3 [&_td]:pr-4">
            <caption className="sr-only">Series del entrenamiento</caption>
            <thead><tr><th scope="col">Ejercicio</th><th scope="col">Serie</th><th scope="col">Carga (kg)</th><th scope="col">Reps / segundos</th><th scope="col">RIR</th></tr></thead>
            <tbody>{query.data.page.map((item, index) => <tr key={`${item.training_exercise_id}-${item.set_number}-${index}`} className="border-t align-top">
              <th scope="row" className="max-w-64 whitespace-normal break-words font-medium">{item.exercise_name || 'Ejercicio sin nombre'}</th>
              <td>{item.set_number ?? 'Sin dato'}</td><td>{item.weight_kg === null ? 'Sin dato' : `${item.weight_kg} kg`}</td>
              <td>{item.seconds !== null ? `${item.seconds} s` : item.reps !== null ? `${item.reps} reps` : 'Sin dato'}</td><td>{item.rir ?? 'Sin dato'}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={cursors.length === 1} onClick={() => setCursors((current) => current.slice(0, -1))}>Más reciente</Button>
        <Button variant="outline" disabled={!query.data.nextCursor} onClick={() => { const nextCursor = query.data?.nextCursor; if (nextCursor) setCursors((current) => [...current, nextCursor]) }}>Más antiguo</Button>
      </div>
    </>}
  </section>
}

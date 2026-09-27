import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getApiErrorStatus } from '@/lib/api-utils'
import { useTrainingSessionDetail } from '../api'
import type { TrainingSession } from '../types'

export function TrainingSessionDetail({ clientId, session, onClose }: {
  clientId: string; session: TrainingSession; onClose: () => void
}) {
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const query = useTrainingSessionDetail(clientId, session.date, session.training_session_id, cursors[cursors.length - 1])
  return <Card><CardHeader><CardTitle>Detalle: {session.training_name || 'Entrenamiento sin nombre'} · {session.date}</CardTitle></CardHeader><CardContent className="space-y-3">
    <Button variant="outline" onClick={onClose}>Cerrar detalle</Button>
    {query.isPending ? <p role="status">Cargando detalle…</p> : query.isError ? <div role="alert">{getApiErrorStatus(query.error) === 403 ? 'No tienes acceso a esta sesión.' : 'No se pudo cargar el detalle.'} <Button variant="outline" onClick={() => void query.refetch()}>Reintentar</Button></div> : !query.data ? <p>Sesión no disponible.</p> : <>
      <p>RPE: {query.data.rpe ?? 'Sin dato'}</p><p>Nota: {query.data.note || 'Sin dato'}</p>
      {query.data.page.length === 0 ? <p>Sin series registradas en esta página.</p> : <div className="overflow-x-auto" role="region" aria-label="Series de la sesión" tabIndex={0}><table className="w-full min-w-[580px] text-left text-sm"><caption className="sr-only">Series del entrenamiento</caption><thead><tr><th>Ejercicio</th><th>Serie</th><th>Carga</th><th>Reps / segundos</th><th>RIR</th></tr></thead><tbody>{query.data.page.map((item, index) => <tr key={`${item.training_exercise_id}-${item.set_number}-${index}`} className="border-t"><th scope="row">{item.exercise_name || 'Ejercicio sin nombre'}</th><td>{item.set_number ?? 'Sin dato'}</td><td>{item.weight_kg === null ? 'Sin dato' : `${item.weight_kg} kg`}</td><td>{item.seconds !== null ? `${item.seconds} s` : item.reps !== null ? `${item.reps} reps` : 'Sin dato'}</td><td>{item.rir ?? 'Sin dato'}</td></tr>)}</tbody></table></div>}
      <div className="flex gap-2"><Button variant="outline" disabled={cursors.length === 1} onClick={() => setCursors((current) => current.slice(0, -1))}>Más reciente</Button><Button variant="outline" disabled={!query.data.nextCursor} onClick={() => { const nextCursor = query.data?.nextCursor; if (nextCursor) setCursors((current) => [...current, nextCursor]) }}>Más antiguo</Button></div>
    </>}
  </CardContent></Card>
}

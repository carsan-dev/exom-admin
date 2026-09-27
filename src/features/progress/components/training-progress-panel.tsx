import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getApiErrorStatus } from '@/lib/api-utils'
import { useTrainingOverview, useTrainingSessions } from '../api'
import type { TrainingSession } from '../types'
import { TrainingLoadEvolution } from './training-load-evolution'
import { TrainingSessionDetail } from './training-session-detail'

interface TrainingProgressPanelProps {
  clientId: string
  from: string
  to: string
  valid: boolean
}

const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const value = (amount: number | null | undefined, unit = '') => amount == null ? 'Sin dato' : `${number.format(amount)}${unit}`

export function TrainingProgressPanel({ clientId, from, to, valid }: TrainingProgressPanelProps) {
  const overviewScope = JSON.stringify([clientId, from, to])
  const [cursorState, setCursorState] = useState<{ scope: string; cursors: (string | null)[] }>({ scope: overviewScope, cursors: [null] })
  const [exerciseCursorState, setExerciseCursorState] = useState<{ scope: string; cursors: (string | null)[] }>({ scope: overviewScope, cursors: [null] })
  const [selected, setSelected] = useState<{ scope: string; session: TrainingSession } | null>(null)
  const cursors = cursorState.scope === overviewScope ? cursorState.cursors : [null]
  const exerciseCursors = exerciseCursorState.scope === overviewScope ? exerciseCursorState.cursors : [null]
  const exerciseCursor = exerciseCursors[exerciseCursors.length - 1]
  const currentSelection = selected?.scope === overviewScope ? selected.session : null
  const overview = useTrainingOverview(clientId, from, to, valid, exerciseCursor)
  const sessions = useTrainingSessions(valid ? clientId : '', from, to, cursors[cursors.length - 1])
  if (!valid) return <p role="alert">Selecciona un intervalo válido de hasta 366 días para Entrenamiento.</p>
  if (overview.isPending || sessions.isPending) return <p role="status">Cargando entrenamiento…</p>
  if (overview.isError || sessions.isError) {
    if (overview.isError && getApiErrorStatus(overview.error) === 413) {
      return <div role="alert">El periodo supera el límite del resumen de ejercicios. Reduce el intervalo de fechas.</div>
    }
    const error = overview.error ?? sessions.error
    return <div role="alert"><p>{getApiErrorStatus(error) === 403 ? 'No tienes acceso al entrenamiento de este cliente.' : 'No se pudo cargar el entrenamiento. Comprueba el periodo y vuelve a intentarlo.'}</p><Button variant="outline" onClick={() => { void overview.refetch(); void sessions.refetch() }}>Reintentar</Button></div>
  }
  const { indicators, exercises } = overview.data
  const cards = [
    { label: 'Entrenos completados', text: value(indicators.trainings_completed) },
    { label: 'Volumen', text: value(indicators.volume, ' kg·reps') },
    { label: 'RIR medio', text: value(indicators.mean_rir) },
    { label: 'RPE medio', text: value(indicators.mean_rpe) },
  ]
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((item) => <Card key={item.label}><CardHeader><CardTitle className="text-base">{item.label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{item.text}</p></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Ejercicios</CardTitle></CardHeader><CardContent>
      {exercises.length === 0 ? <p>Sin ejercicios registrados en este periodo.</p> : <div role="region" tabIndex={0} aria-label="Tabla de ejercicios desplazable" className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Resumen de ejercicios del periodo</caption><thead><tr><th>Ejercicio</th><th>Carga</th><th>Reps o segundos</th><th>Series</th><th>RIR</th><th>Volumen</th><th>PR</th></tr></thead><tbody>{exercises.map((item) => <tr key={item.exercise_id} className="border-t"><th scope="row" className="py-2">{item.exercise_name || 'Ejercicio sin nombre'}</th><td>{value(item.pr?.weight_kg, ' kg')}</td><td>{item.max_seconds !== null ? value(item.max_seconds, ' s') : value(item.max_reps, ' reps')}</td><td>{value(item.sets)}</td><td>{value(item.mean_rir)}</td><td>{value(item.volume, ' kg·reps')}</td><td>{item.pr ? `${value(item.pr.weight_kg, ' kg')} × ${value(item.pr.reps, ' reps')} · ${item.pr.date}` : 'Sin dato'}</td></tr>)}</tbody></table></div>}
      <div className="mt-3 flex gap-2"><Button variant="outline" disabled={exerciseCursors.length === 1} onClick={() => setExerciseCursorState({ scope: overviewScope, cursors: exerciseCursors.slice(0, -1) })}>Ejercicios anteriores</Button><Button variant="outline" disabled={!overview.data.next_cursor} onClick={() => { const nextCursor = overview.data.next_cursor; if (nextCursor) setExerciseCursorState({ scope: overviewScope, cursors: [...exerciseCursors, nextCursor] }) }}>Más ejercicios</Button></div>
    </CardContent></Card>
    <TrainingLoadEvolution key={JSON.stringify([clientId, from, to, exerciseCursor])} clientId={clientId} from={from} to={to} exercises={exercises} />
    <Card><CardHeader><CardTitle>Entrenamientos finalizados</CardTitle></CardHeader><CardContent className="space-y-3">
      {sessions.data.page.length === 0 ? <p>Sin sesiones finalizadas en esta página.</p> : <ul className="space-y-2">{sessions.data.page.map((session) => <li key={`${session.date}:${session.training_session_id}`} className="flex flex-wrap items-center justify-between gap-2 border-b py-2"><span>{session.date} · {session.training_name || 'Entrenamiento sin nombre'}</span><Button variant="outline" onClick={() => setSelected({ scope: overviewScope, session })}>Ver detalle de {session.training_name || 'entrenamiento'} del {session.date}</Button></li>)}</ul>}
      <div className="flex gap-2"><Button variant="outline" disabled={cursors.length === 1} onClick={() => { setSelected(null); setCursorState({ scope: overviewScope, cursors: cursors.slice(0, -1) }) }}>Más recientes</Button><Button variant="outline" disabled={!sessions.data.nextCursor} onClick={() => { if (sessions.data.nextCursor) { setSelected(null); setCursorState({ scope: overviewScope, cursors: [...cursors, sessions.data.nextCursor] }) } }}>Más antiguos</Button></div>
    </CardContent></Card>
    {currentSelection && <TrainingSessionDetail key={`${clientId}:${currentSelection.date}:${currentSelection.training_session_id}`} clientId={clientId} session={currentSelection} onClose={() => setSelected(null)} />}
  </div>
}

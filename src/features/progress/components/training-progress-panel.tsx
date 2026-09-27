import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { getApiErrorStatus } from '@/lib/api-utils'
import { useLegacyTrainingRecords, useTrainingOverview, useTrainingSessions } from '../api'
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
  const [legacyState, setLegacyState] = useState<{ scope: string; expanded: boolean; cursors: (string | null)[] }>({ scope: overviewScope, expanded: true, cursors: [null] })
  const legacyExpanded = legacyState.scope !== overviewScope || legacyState.expanded
  const legacyCursors = legacyState.scope === overviewScope ? legacyState.cursors : [null]
  const cursors = cursorState.scope === overviewScope ? cursorState.cursors : [null]
  const exerciseCursors = exerciseCursorState.scope === overviewScope ? exerciseCursorState.cursors : [null]
  const exerciseCursor = exerciseCursors[exerciseCursors.length - 1]
  const currentSelection = selected?.scope === overviewScope ? selected.session : null
  const overview = useTrainingOverview(clientId, from, to, valid, exerciseCursor)
  const sessions = useTrainingSessions(valid ? clientId : '', from, to, cursors[cursors.length - 1])
  const legacy = useLegacyTrainingRecords(clientId, from, to, valid, legacyExpanded, legacyCursors[legacyCursors.length - 1])
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
  const exerciseLabels = Object.fromEntries(exercises.map((item, index) => [item.exercise_id,
    item.exercise_name || `Nombre no disponible · Ref. ${exerciseCursors.length}.${index + 1}`]))
  const cards = [
    { label: 'Registros de entrenamiento', text: value(indicators.trainings_completed) },
    { label: 'Volumen', text: value(indicators.volume, ' kg·reps') },
    { label: 'RIR medio', text: value(indicators.mean_rir) },
    { label: 'RPE medio', text: value(indicators.mean_rpe) },
  ]
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((item) => <Card key={item.label}><CardHeader><CardTitle className="text-base">{item.label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{item.text}</p>{item.label === 'Registros de entrenamiento' && <p className="mt-2 text-sm text-muted-foreground">Puede incluir registros antiguos. El total no permite confirmar cuántos entrenamientos se finalizaron.</p>}{item.label === 'Volumen' && <p className="mt-2 text-sm text-muted-foreground">Suma de peso × repeticiones de series válidas; las series en segundos no suman kg·reps.</p>}</CardContent></Card>)}</div>
    <section aria-label="Historial de entrenamiento" className="space-y-4">
      <h2 className="text-lg font-semibold">Historial de entrenamiento</h2>
    <Card><CardHeader><CardTitle>Sesiones con detalle</CardTitle></CardHeader><CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">Consulta las series, cargas y valoraciones guardadas. El detalle disponible no confirma por sí solo la finalización de una sesión antigua.</p>
      {sessions.data.page.length === 0 ? <p>Sin sesiones con detalle en esta página.</p> : <ul className="space-y-2">{sessions.data.page.map((session) => <li key={`${session.date}:${session.training_session_id}`} className="flex flex-wrap items-center justify-between gap-2 border-b py-2"><span>{formatDate(`${session.date}T00:00:00`, "d 'de' MMMM 'de' yyyy")} · {session.training_name || 'Nombre no disponible'}</span><Button variant="outline" aria-label={`Ver detalle de ${session.training_name || 'entrenamiento'} del ${formatDate(`${session.date}T00:00:00`, "d 'de' MMMM 'de' yyyy")}`} onClick={() => setSelected({ scope: overviewScope, session })}>Ver detalle</Button></li>)}</ul>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={cursors.length === 1} onClick={() => { setSelected(null); setCursorState({ scope: overviewScope, cursors: cursors.slice(0, -1) }) }}>Más recientes</Button><Button variant="outline" disabled={!sessions.data.nextCursor} onClick={() => { if (sessions.data.nextCursor) { setSelected(null); setCursorState({ scope: overviewScope, cursors: [...cursors, sessions.data.nextCursor] }) } }}>Más antiguos</Button></div>
    </CardContent></Card>
    {currentSelection && <TrainingSessionDetail key={`${clientId}:${currentSelection.date}:${currentSelection.training_session_id}`} clientId={clientId} session={currentSelection} onClose={() => setSelected(null)} />}
    <Card><CardHeader><CardTitle>Registros históricos</CardTitle></CardHeader><CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">Registros antiguos sin detalle de la sesión. No permiten saber si el entrenamiento se terminó.</p>
      <Button variant="outline" aria-expanded={legacyExpanded} onClick={() => setLegacyState({ scope: overviewScope, expanded: !legacyExpanded, cursors: [null] })}>{legacyExpanded ? 'Ocultar registros históricos' : 'Mostrar registros históricos'}</Button>
      {legacyExpanded && <div className="space-y-3">
        {legacy.isPending ? <p role="status">Cargando registros históricos…</p> : legacy.isError ? <div role="alert"><p>{getApiErrorStatus(legacy.error) === 403 ? 'No tienes acceso a los registros históricos.' : getApiErrorStatus(legacy.error) === 404 ? 'Los registros históricos aún no están disponibles.' : 'No se pudieron cargar los registros históricos.'}</p><Button variant="outline" onClick={() => void legacy.refetch()}>Reintentar registros históricos</Button></div> : <>
          {legacy.data.page.length === 0 ? <p>Sin registros históricos en este periodo.</p> : <ul aria-label="Registros históricos" className="space-y-2">{legacy.data.page.map((record) => <li key={`${record.date}:${record.record_index}`} className="border-b py-2">{formatDate(`${record.date}T00:00:00`, "d 'de' MMMM 'de' yyyy")} · Registro antiguo{record.record_index > 1 || legacy.data.page.some((other) => other.date === record.date && other.record_index !== record.record_index) ? ` ${record.record_index}` : ''} · Detalle no disponible</li>)}</ul>}
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={legacyCursors.length === 1} onClick={() => setLegacyState({ scope: overviewScope, expanded: true, cursors: legacyCursors.slice(0, -1) })}>Registros históricos anteriores</Button><Button variant="outline" disabled={!legacy.data.nextCursor} onClick={() => { if (legacy.data.nextCursor) setLegacyState({ scope: overviewScope, expanded: true, cursors: [...legacyCursors, legacy.data.nextCursor] }) }}>Más registros históricos</Button></div>
        </>}
      </div>}
    </CardContent></Card>
    </section>
    <Card><CardHeader><CardTitle>Ejercicios</CardTitle></CardHeader><CardContent>
      {exercises.length === 0 ? <p>Sin ejercicios registrados en este periodo.</p> : <div role="region" tabIndex={0} aria-label="Tabla de ejercicios desplazable" className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Resumen de ejercicios del periodo</caption><thead><tr><th>Ejercicio</th><th>Carga</th><th>Reps o segundos</th><th>Series</th><th>RIR</th><th>Volumen</th><th>PR</th></tr></thead><tbody>{exercises.map((item) => <tr key={item.exercise_id} className="border-t"><th scope="row" className="py-2">{exerciseLabels[item.exercise_id]}</th><td>{value(item.pr?.weight_kg, ' kg')}</td><td>{item.max_seconds !== null ? value(item.max_seconds, ' s') : value(item.max_reps, ' reps')}</td><td>{value(item.sets)}</td><td>{value(item.mean_rir)}</td><td>{value(item.volume, ' kg·reps')}</td><td>{item.pr ? `${value(item.pr.weight_kg, ' kg')} × ${value(item.pr.reps, ' reps')} · ${formatDate(`${item.pr.date}T00:00:00`, "d 'de' MMMM 'de' yyyy")}` : 'Sin dato'}</td></tr>)}</tbody></table></div>}
      {exercises.some((item) => !item.exercise_name) && <p className="mt-2 text-sm text-muted-foreground">Conservamos las series y cargas aunque el nombre original no esté disponible. Las referencias distinguen los ejercicios de esta página; no son sus nombres.</p>}
      <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" disabled={exerciseCursors.length === 1} onClick={() => setExerciseCursorState({ scope: overviewScope, cursors: exerciseCursors.slice(0, -1) })}>Ejercicios anteriores</Button><Button variant="outline" disabled={!overview.data.next_cursor} onClick={() => { const nextCursor = overview.data.next_cursor; if (nextCursor) setExerciseCursorState({ scope: overviewScope, cursors: [...exerciseCursors, nextCursor] }) }}>Más ejercicios</Button></div>
    </CardContent></Card>
    <TrainingLoadEvolution key={JSON.stringify([clientId, from, to, exerciseCursor])} clientId={clientId} from={from} to={to} exercises={exercises} exerciseLabels={exerciseLabels} />
  </div>
}

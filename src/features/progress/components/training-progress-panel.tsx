import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { getApiErrorStatus } from '@/lib/api-utils'
import { useLegacyTrainingRecords, useTrainingOverview, useTrainingSessions } from '../api'
import type { TrainingSession } from '../types'
import { TrainingInfo } from './training-info'
import { TrainingExerciseTable } from './training-exercise-table'
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
  const [selected, setSelected] = useState<{ scope: string; session: TrainingSession } | null>(null)
  const [legacyState, setLegacyState] = useState<{ scope: string; expanded: boolean; cursors: (string | null)[] }>({ scope: overviewScope, expanded: false, cursors: [null] })
  const legacyExpanded = legacyState.scope === overviewScope && legacyState.expanded
  const legacyCursors = legacyState.scope === overviewScope ? legacyState.cursors : [null]
  const cursors = cursorState.scope === overviewScope ? cursorState.cursors : [null]
  const currentSelection = selected?.scope === overviewScope ? selected.session : null
  const overview = useTrainingOverview(clientId, from, to, valid, null, { limit: 1 })
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
  const { indicators } = overview.data
  const cards = [
    { label: 'Registros de entrenamiento', text: value(indicators.trainings_completed) },
    { label: 'Volumen', text: value(indicators.volume, ' kg·reps') },
    { label: 'RIR medio', text: value(indicators.mean_rir) },
    { label: 'RPE medio', text: value(indicators.mean_rpe) },
  ]
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((item) => <Card key={item.label}><CardHeader><CardTitle className="flex items-center justify-between gap-2 text-base"><span>{item.label}</span>{item.label === 'Registros de entrenamiento' && <TrainingInfo label={item.label}>Puede incluir registros antiguos. El total no permite confirmar cuántos entrenamientos se finalizaron.</TrainingInfo>}{item.label === 'Volumen' && <TrainingInfo label={item.label}>Suma de peso × repeticiones de series válidas; las series en segundos no suman kg·reps.</TrainingInfo>}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{item.text}</p></CardContent></Card>)}</div>
    <section aria-label="Historial de entrenamiento" className="space-y-4">
      <h2 className="text-lg font-semibold">Historial de entrenamiento</h2>
    <Card><CardHeader><CardTitle>Sesiones con detalle</CardTitle></CardHeader><CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">Consulta las series, cargas y valoraciones guardadas. El detalle disponible no confirma por sí solo la finalización de una sesión antigua.</p>
      {sessions.data.page.length === 0 ? <p>Sin sesiones con detalle en esta página.</p> : <ul className="space-y-2">{sessions.data.page.map((session) => <li key={`${session.date}:${session.training_session_id}`} className="flex flex-wrap items-center justify-between gap-2 border-b py-2"><span>{formatDate(`${session.date}T00:00:00`, "d 'de' MMMM 'de' yyyy")} · {session.training_name || 'Nombre no disponible'}</span><Button variant="outline" aria-label={`Ver detalle de ${session.training_name || 'entrenamiento'} del ${formatDate(`${session.date}T00:00:00`, "d 'de' MMMM 'de' yyyy")}`} onClick={() => setSelected({ scope: overviewScope, session })}>Ver detalle</Button></li>)}</ul>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={cursors.length === 1} onClick={() => { setSelected(null); setCursorState({ scope: overviewScope, cursors: cursors.slice(0, -1) }) }}>Más recientes</Button><Button variant="outline" disabled={!sessions.data.nextCursor} onClick={() => { if (sessions.data.nextCursor) { setSelected(null); setCursorState({ scope: overviewScope, cursors: [...cursors, sessions.data.nextCursor] }) } }}>Más antiguos</Button></div>
    </CardContent></Card>
    {currentSelection && <TrainingSessionDetail key={`${clientId}:${currentSelection.date}:${currentSelection.training_session_id}`} clientId={clientId} session={currentSelection} onClose={() => setSelected(null)} />}
    </section>
    <TrainingExerciseTable key={overviewScope} clientId={clientId} from={from} to={to} />
    <TrainingLoadEvolution key={overviewScope} clientId={clientId} from={from} to={to} />
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
  </div>
}

import { useId, useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { getApiErrorStatus } from '@/lib/api-utils'
import { useTrainingLoadHistory } from '../api'
import { TrainingExercisePicker } from './training-exercise-picker'
import type { TrainingExerciseSummary } from '../types'

const measures = {
  weight_kg: { label: 'Peso externo', unit: 'kg' },
  reps: { label: 'Repeticiones', unit: 'reps' },
  seconds: { label: 'Duración', unit: 's' },
} as const
type Measure = keyof typeof measures
const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const dateLabel = (date: string) => formatDate(`${date}T00:00:00`)

export function TrainingLoadEvolution({ clientId, from, to }: {
  clientId: string; from: string; to: string
}) {
  const id = useId()
  const [selected, setSelected] = useState<TrainingExerciseSummary | null>(null)
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [measure, setMeasure] = useState<Measure>('weight_kg')
  const exerciseId = selected?.exercise_id ?? ''
  const query = useTrainingLoadHistory(clientId, exerciseId, from, to, cursors[cursors.length - 1])
  const sets = query.data?.page ?? []
  const metric = measures[measure]
  // A point is one observed set, not a daily aggregate or an estimated value.
  const points = sets.flatMap((item) => {
    const amount = item[measure]
    const timestamp = item.date ? Date.parse(item.date) : NaN
    return item.date && amount !== null && Number.isFinite(amount) && Number.isFinite(timestamp)
      ? [{ timestamp, amount, date: item.date, set: item.set_number, reps: item.reps, seconds: item.seconds }]
      : []
  }).sort((a, b) => a.timestamp - b.timestamp)
  const measured = sets.filter((item) => item[measure] !== null && Number.isFinite(item[measure])).length
  const missingDates = measured - points.length

  return <section aria-labelledby={`${id}-title`} className="min-w-0 space-y-5 rounded-lg border bg-card p-4 sm:p-6">
    <div className="space-y-1">
      <h2 id={`${id}-title`} className="text-xl font-semibold">Evolución de cargas</h2>
      <p className="max-w-prose text-sm text-muted-foreground">Explora las series de un ejercicio. Cada punto es un registro; no un promedio ni una estimación entre fechas.</p>
    </div>
    <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,240px)]">
      <div className="space-y-2"><p className="text-sm font-medium">Ejercicio</p>
        <TrainingExercisePicker clientId={clientId} from={from} to={to} selected={selected} onSelect={(exercise) => { setSelected(exercise); setCursors([null]) }} />
      </div>
      <label className="space-y-2 text-sm font-medium">Medida de las series
        <select aria-label="Medida de las series" value={measure}
          onChange={(event) => {
            const next = event.target.value
            if (next === 'weight_kg' || next === 'reps' || next === 'seconds') setMeasure(next)
          }}
          className="block min-h-10 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {Object.entries(measures).map(([key, item]) => <option key={key} value={key}>{item.label} ({item.unit})</option>)}
        </select>
      </label>
    </div>
    <p className="text-xs text-muted-foreground">Peso externo en kg, distinto del peso corporal y del volumen en kg·reps. Repeticiones y duración usan ejes independientes.</p>
    {!selected ? <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Selecciona un ejercicio identificado para consultar sus cargas.</p> : <>
      {query.isPending ? <p role="status">Cargando cargas…</p> : query.isError ? <div role="alert">
        {getApiErrorStatus(query.error) === 403 ? 'No tienes acceso a estas cargas.' : 'No se pudieron cargar las cargas.'}
        <Button variant="outline" onClick={() => void query.refetch()}>Reintentar</Button>
      </div> : sets.length === 0 ? <p>Sin series registradas en esta página.</p> : <>
        <div className="space-y-2 border-y py-4 text-sm" aria-live="polite">
          <p className="font-medium">{selected.exercise_name} · {metric.label} ({metric.unit})</p>
          <p className="text-muted-foreground">Página {cursors.length} · {sets.length} series · {measured} con {metric.label.toLowerCase()} · {sets.length - measured} sin dato</p>
          {points.length > 0 && <p className="tabular-nums">Rango observado: {number.format(Math.min(...points.map((point) => point.amount)))}–{number.format(Math.max(...points.map((point) => point.amount)))} {metric.unit} · {dateLabel(points[0].date)} – {dateLabel(points[points.length - 1].date)}</p>}
          {points.length === 1 && <p>Una observación no permite establecer una tendencia.</p>}
          {points.length > 1 && <p className="text-muted-foreground">Las series pueden tener distintas repeticiones o duración; una variación de peso no implica por sí sola mejora o empeoramiento.</p>}
          {missingDates > 0 && <p>{missingDates} series con valor pero sin fecha disponible; consúltalas en la tabla.</p>}
        </div>
        {points.length === 0 ? <p className="rounded-md bg-muted p-4 text-sm">Sin observaciones fechadas de {metric.label.toLowerCase()} en esta página. Selecciona otra medida o consulta otras series.</p> :
          <div role="img" aria-label={`${metric.label} (${metric.unit}), ${points.length} observaciones. Valores disponibles en la tabla siguiente.`} className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" type="number" name="Fecha" scale="time" domain={['dataMin', 'dataMax']}
                  tickFormatter={(value: number) => dateLabel(new Date(value).toISOString().slice(0, 10))}
                  minTickGap={40} tick={{ fill: 'var(--foreground)', fontSize: 11 }} />
                <YAxis dataKey="amount" name={metric.label} unit={` ${metric.unit}`} width={70} domain={[0, 'auto']}
                  tick={{ fill: 'var(--foreground)', fontSize: 11 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name) => name === 'Fecha'
                    ? [dateLabel(new Date(Number(value)).toISOString().slice(0, 10)), 'Fecha']
                    : [`${number.format(Number(value))} ${metric.unit}`, metric.label]}
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                <Scatter data={points} name={metric.label} fill="var(--foreground-accent)" isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>}
        <details open className="border-t pt-4 text-sm">
          <summary className="cursor-pointer rounded-sm py-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Datos de las series · peso, repeticiones y duración</summary>
          <div className="mt-2 overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" role="region" aria-label="Datos de evolución de cargas" tabIndex={0}>
            <table className="w-full min-w-[480px] text-left text-sm tabular-nums [&_th]:py-2 [&_th]:pr-4 [&_td]:py-3 [&_td]:pr-4">
              <caption className="sr-only">Cargas del ejercicio seleccionado</caption>
              <thead><tr><th scope="col">Fecha</th><th scope="col">Carga (kg)</th><th scope="col">Reps</th><th scope="col">Segundos</th><th scope="col">Serie</th></tr></thead>
              <tbody>{sets.map((set, index) => <tr key={`${set.training_exercise_id}:${set.set_number}:${index}`} className="border-t">
                <td>{set.date ? dateLabel(set.date) : 'Sin dato'}</td><td>{set.weight_kg ?? 'Sin dato'}</td><td>{set.reps ?? 'Sin dato'}</td><td>{set.seconds ?? 'Sin dato'}</td><td>{set.set_number ?? 'Sin dato'}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </details>
      </>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={query.isPending || cursors.length === 1} onClick={() => setCursors((current) => current.slice(0, -1))}>Más reciente</Button>
        <Button variant="outline" disabled={query.isPending || query.isError || !query.data?.nextCursor} onClick={() => { const next = query.data?.nextCursor; if (next) setCursors((current) => [...current, next]) }}>Más antiguo</Button>
      </div>
    </>}
  </section>
}

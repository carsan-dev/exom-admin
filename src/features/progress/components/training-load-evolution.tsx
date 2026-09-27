import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { getApiErrorStatus } from '@/lib/api-utils'
import { useTrainingLoadHistory } from '../api'
import { TrainingExercisePicker } from './training-exercise-picker'
import type { TrainingExerciseSummary } from '../types'

export function TrainingLoadEvolution({ clientId, from, to }: {
  clientId: string; from: string; to: string
}) {
  const [selected, setSelected] = useState<TrainingExerciseSummary | null>(null)
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const exerciseId = selected?.exercise_id ?? ''
  const query = useTrainingLoadHistory(clientId, exerciseId, from, to, cursors[cursors.length - 1])
  const sets = query.data?.page ?? []
  const points = sets.filter((item) => item.weight_kg !== null && item.reps !== null)
    .map((item) => ({ date: item.date ? formatDate(`${item.date}T00:00:00`) : 'Sin dato', weight: item.weight_kg, reps: item.reps }))
  return <Card><CardHeader><CardTitle>Evolución de cargas</CardTitle></CardHeader><CardContent className="space-y-3">
    <TrainingExercisePicker clientId={clientId} from={from} to={to} selected={selected} onSelect={(exercise) => { setSelected(exercise); setCursors([null]) }} />
    {!selected ? <p className="text-sm text-muted-foreground">Selecciona un ejercicio identificado para consultar sus cargas.</p> : <>
      {query.isPending ? <p role="status">Cargando cargas…</p> : query.isError ? <div role="alert">{getApiErrorStatus(query.error) === 403 ? 'No tienes acceso a estas cargas.' : 'No se pudieron cargar las cargas.'} <Button variant="outline" onClick={() => void query.refetch()}>Reintentar</Button></div> : sets.length === 0 ? <p>Sin series registradas en esta página.</p> : <>
        {points.length > 0 && <div role="img" aria-label="Evolución de carga en kg; valores disponibles en la tabla siguiente" className="h-56"><ResponsiveContainer><LineChart data={points} accessibilityLayer><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fill: 'var(--foreground)' }} /><YAxis tick={{ fill: 'var(--foreground)' }} /><Tooltip contentStyle={{ backgroundColor: 'var(--card)', color: 'var(--foreground)' }} /><Line dataKey="weight" name="Carga (kg)" stroke="var(--foreground-accent)" isAnimationActive={false} /></LineChart></ResponsiveContainer></div>}
        <div className="overflow-x-auto" role="region" aria-label="Datos de evolución de cargas" tabIndex={0}><table className="w-full text-left text-sm"><caption className="sr-only">Cargas del ejercicio seleccionado</caption><thead><tr><th>Fecha</th><th>Carga (kg)</th><th>Reps</th><th>Segundos</th><th>Serie</th></tr></thead><tbody>{sets.map((set, index) => <tr key={index} className="border-t"><td>{set.date ? formatDate(`${set.date}T00:00:00`) : 'Sin dato'}</td><td>{set.weight_kg ?? 'Sin dato'}</td><td>{set.reps ?? 'Sin dato'}</td><td>{set.seconds ?? 'Sin dato'}</td><td>{set.set_number ?? 'Sin dato'}</td></tr>)}</tbody></table></div>
      </>}
      <div className="flex gap-2"><Button variant="outline" disabled={cursors.length === 1} onClick={() => setCursors((current) => current.slice(0, -1))}>Más reciente</Button><Button variant="outline" disabled={!query.data?.nextCursor} onClick={() => { if (query.data?.nextCursor) setCursors((current) => [...current, query.data.nextCursor]) }}>Más antiguo</Button></div>
    </>}
  </CardContent></Card>
}

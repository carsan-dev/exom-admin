import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { AdherenceDay, ComponentAdherence } from '@/features/clients/adherence.types'
import { ProgressChartTooltip } from './progress-chart-tooltip'
import { observationTimestamp, orderObservedRecords } from './observed-chart-series'

function percent(value: ComponentAdherence, closed: boolean) {
  return closed && value.status === 'evaluable' && value.ratio !== null && Number.isFinite(value.ratio) ? value.ratio * 100 : null
}
const format = (value: number) => `${new Intl.NumberFormat('es', { maximumFractionDigits: 2 }).format(value)} %`

export function AdherenceEvolution({ days }: { days: AdherenceDay[] }) {
  const points = orderObservedRecords(days.map((day) => {
    const timestamp = observationTimestamp(day.date)
    const closed = day.evaluation.period === 'closed' && Number.isFinite(timestamp)
    return { date: day.date, timestamp,
      global: percent(day.evaluation.global, closed),
      training: percent(day.evaluation.training, closed),
      nutrition: percent(day.evaluation.nutrition, closed) }
  }))
  const observations = points.filter((point) => point.global !== null).length
  return <section aria-label="Evolución diaria del periodo seleccionado" className="min-w-0 space-y-3">
    <h2 className="text-lg font-semibold">Evolución diaria del periodo seleccionado</h2>
    <p className="max-w-prose text-sm text-muted-foreground">Porcentajes diarios cerrados, no el veredicto de siete días. Los huecos no son ceros; hoy provisional y futuro no se trazan. Los pasos se consultan por semana.</p>
    {observations < 2 && <p className="text-sm">{observations === 1 ? 'Una observación global: no permite establecer una tendencia.' : 'Sin observaciones globales evaluables para mostrar una tendencia.'}</p>}
    {points.length > 0 ? <>
      {points.some((point) => Number.isFinite(point.timestamp)) && <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']}
              tickFormatter={(value: number) => new Date(value).toISOString().slice(5, 10)} tick={{ fill: 'var(--foreground)', fontSize: 12 }} />
            <YAxis domain={[0, 100]} unit=" %" tick={{ fill: 'var(--foreground)', fontSize: 12 }} width={52} />
            <ProgressChartTooltip labelFormatter={(label) => `${new Date(Number(label)).toISOString().slice(0, 10)} · UTC`} formatter={(value: number) => format(value)} />
            <Line type="linear" name="Global" dataKey="global" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
            <Line type="linear" name="Entrenamiento" dataKey="training" stroke="var(--foreground)" strokeDasharray="6 4" dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
            <Line type="linear" name="Nutrición" dataKey="nutrition" stroke="var(--muted-foreground)" strokeDasharray="2 4" dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>}
      <p className="text-xs text-muted-foreground">Global: línea continua · Entrenamiento: trazos · Nutrición: puntos. Escala común de 0 a 100 %. Las líneas son una guía entre observaciones diarias, no una reconstrucción de días sin datos.</p>
      <details className="border-t pt-3">
        <summary className="cursor-pointer text-sm font-medium rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver valores diarios en tabla</summary>
        <div className="overflow-x-auto pt-3">
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">Porcentajes diarios cerrados del periodo seleccionado</caption>
            <thead><tr>{['Fecha UTC', 'Global', 'Entrenamiento', 'Nutrición'].map((label) => <th key={label} scope="col" className="p-2 font-medium">{label}</th>)}</tr></thead>
            <tbody>{points.map((point) => <tr key={point.date} className="border-t"><th scope="row" className="p-2 font-medium">{point.date}</th>{[point.global, point.training, point.nutrition].map((value, index) => <td key={index} className="p-2">{value === null ? 'Sin dato evaluable' : format(value)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>
    </> : <p className="text-sm">No hay días disponibles en este periodo. Consulta otro rango o actualiza las evaluaciones.</p>}
  </section>
}

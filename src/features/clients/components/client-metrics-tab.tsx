import { useState } from 'react'
import { Activity, Pencil, Plus } from 'lucide-react'
import { MetricVisual } from '../../progress/components/metric-visual'
import type { MetricSeries, Observation } from '../../progress/metrics-overview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { BodyMetric } from '../types'
import { Button } from '@/components/ui/button'
import { ClientMetricDialog } from './client-metric-dialog'

interface ClientMetricsTabProps {
  clientId: string
  metrics: BodyMetric[]
}

const measurements = [
  ['weight_kg', 'Peso', 'kg'], ['muscle_mass_kg', 'Masa muscular', 'kg'],
  ['height_cm', 'Altura', 'cm'], ['sleep_hours', 'Sueño', 'h'],
  ['neck_cm', 'Cuello', 'cm'], ['shoulders_cm', 'Hombros', 'cm'], ['chest_cm', 'Pecho', 'cm'],
  ['arm_left_cm', 'Brazo izquierdo', 'cm'], ['arm_right_cm', 'Brazo derecho', 'cm'],
  ['forearm_left_cm', 'Antebrazo izquierdo', 'cm'], ['forearm_right_cm', 'Antebrazo derecho', 'cm'],
  ['waist_cm', 'Cintura', 'cm'], ['hips_cm', 'Cadera', 'cm'],
  ['thigh_left_cm', 'Muslo izquierdo', 'cm'], ['thigh_right_cm', 'Muslo derecho', 'cm'],
  ['calf_left_cm', 'Gemelo izquierdo', 'cm'], ['calf_right_cm', 'Gemelo derecho', 'cm'],
] as const

function bodySeries(metrics: BodyMetric[]): MetricSeries[] {
  const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date))
  return measurements.map(([key, label, unit]) => {
    const points: Observation[] = sorted.map((metric) => ({ date: metric.date.slice(0, 10), value: metric[key],
      quality: metric[key] === null ? 'missing' : 'complete', provenance: 'recorded' }))
    const complete = points.filter((point) => point.value !== null)
    const first = complete[0] ?? null
    const last = complete[complete.length - 1] ?? null
    return { key, label, unit, group: 'body', source: 'Mediciones corporales', points,
      count: complete.length, incomplete_count: points.length - complete.length, first, last,
      change: complete.length > 1 && first?.value != null && last?.value != null && first.date < last.date ? last.value - first.value : null }
  })
}

const tableDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatValue(value: number | null, unit: string) {
  if (value == null) {
    return 'Sin datos'
  }

  return `${value} ${unit}`
}

export function ClientMetricsTab(props: ClientMetricsTabProps) {
  return <ClientMetricsContent key={props.clientId} {...props} />
}

function ClientMetricsContent({ clientId, metrics }: ClientMetricsTabProps) {
  const [metricDialogOpen, setMetricDialogOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<BodyMetric | null>(null)

  function openCreateDialog() {
    setSelectedMetric(null)
    setMetricDialogOpen(true)
  }

  function openEditDialog(metric: BodyMetric) {
    setSelectedMetric(metric)
    setMetricDialogOpen(true)
  }

  if (metrics.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6 [--muted-foreground:var(--foreground-secondary)] [--primary-foreground:#30271e]">
            <p className="text-sm text-muted-foreground">
              Aún no hay métricas corporales registradas para este cliente.
            </p>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Añadir métricas
            </Button>
          </CardContent>
        </Card>
        <ClientMetricDialog
          clientId={clientId}
          metric={null}
          open={metricDialogOpen}
          onOpenChange={setMetricDialogOpen}
        />
      </>
    )
  }

  const series = bodySeries(metrics)
  const dates = metrics.map((metric) => metric.date).sort()
  const period = `${tableDateFormatter.format(new Date(dates[0]))} – ${tableDateFormatter.format(new Date(dates[dates.length - 1]))}`

  return (
    <div className="space-y-4 [--muted-foreground:var(--foreground-secondary)] [--primary-foreground:#30271e]">
      <p className="text-sm text-muted-foreground">Histórico reciente disponible: {metrics.length} registros. La comparación se limita a estas mediciones, no a todo el historial del cliente.</p>
      <MetricVisual series={series} period={period} chartPeriod={period} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-primary" />
                <CardTitle className="text-xl">Últimas 10 métricas</CardTitle>
              </div>
              <CardDescription>Historial reciente de composición corporal y medidas</CardDescription>
            </div>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Añadir métricas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div role="region" aria-label="Historial corporal desplazable" tabIndex={0} className="overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Table>
            <caption className="sr-only">Historial reciente de métricas corporales y acciones</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Masa muscular</TableHead>
                <TableHead>Altura</TableHead>
                <TableHead>Sueño</TableHead>
                <TableHead>Cuello</TableHead>
                <TableHead>Hombros</TableHead>
                <TableHead>Pecho</TableHead>
                <TableHead>Brazo izq.</TableHead>
                <TableHead>Brazo der.</TableHead>
                <TableHead>Antebrazo izq.</TableHead>
                <TableHead>Antebrazo der.</TableHead>
                <TableHead>Cintura</TableHead>
                <TableHead>Cadera</TableHead>
                <TableHead>Muslo izq.</TableHead>
                <TableHead>Muslo der.</TableHead>
                <TableHead>Gemelo izq.</TableHead>
                <TableHead>Gemelo der.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric) => (
                <TableRow key={metric.id}>
                  <TableCell>{tableDateFormatter.format(new Date(metric.date))}</TableCell>
                  <TableCell>{formatValue(metric.weight_kg, 'kg')}</TableCell>
                  <TableCell>{formatValue(metric.muscle_mass_kg, 'kg')}</TableCell>
                  <TableCell>{formatValue(metric.height_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.sleep_hours, 'h')}</TableCell>
                  <TableCell>{formatValue(metric.neck_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.shoulders_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.chest_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.arm_left_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.arm_right_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.forearm_left_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.forearm_right_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.waist_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.hips_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.thigh_left_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.thigh_right_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.calf_left_cm, 'cm')}</TableCell>
                  <TableCell>{formatValue(metric.calf_right_cm, 'cm')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar métricas del ${tableDateFormatter.format(new Date(metric.date))}`}
                      onClick={() => openEditDialog(metric)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <ClientMetricDialog
        clientId={clientId}
        metric={selectedMetric}
        open={metricDialogOpen}
        onOpenChange={setMetricDialogOpen}
      />
    </div>
  )
}

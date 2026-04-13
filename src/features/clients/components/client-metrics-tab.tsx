import { Activity, Scale } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
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

interface ClientMetricsTabProps {
  metrics: BodyMetric[]
}

const chartDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
})

const tableDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function formatValue(value: number | null, unit: string) {
  if (value == null) {
    return '-'
  }

  return `${value} ${unit}`
}

export function ClientMetricsTab({ metrics }: ClientMetricsTabProps) {
  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Aún no hay métricas corporales registradas para este cliente.
        </CardContent>
      </Card>
    )
  }

  const chartData = [...metrics]
    .filter((metric) => metric.weight_kg != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((metric) => ({
      date: chartDateFormatter.format(new Date(metric.date)),
      weight: metric.weight_kg,
    }))

  return (
    <div className="space-y-4">
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-brand-primary" />
              <CardTitle className="text-xl">Evolución del peso</CardTitle>
            </div>
            <CardDescription>Últimas mediciones con peso registrado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--brand-primary)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--brand-primary)', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-primary" />
            <CardTitle className="text-xl">Últimas 10 métricas</CardTitle>
          </div>
          <CardDescription>Historial reciente de composición corporal y medidas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

import { Scale, TrendingUp } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { BODY_FIELD_LABELS, type BodyField } from '../types'
import { useClientBodyHistory, useClientWeightHistory } from '../api'

const chartDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
})

function formatDate(dateStr: string) {
  return chartDateFormatter.format(new Date(dateStr + 'T00:00:00'))
}

interface MetricsChartsProps {
  clientId: string
  selectedField: BodyField
  onFieldChange: (field: BodyField) => void
}

export function MetricsCharts({ clientId, selectedField, onFieldChange }: MetricsChartsProps) {
  const { data: weightData, isLoading: weightLoading } = useClientWeightHistory(clientId)
  const { data: bodyData, isLoading: bodyLoading } = useClientBodyHistory(clientId, selectedField)

  const weightChartData = (weightData ?? []).map((p) => ({
    date: formatDate(p.date),
    value: p.value,
  }))

  const bodyChartData = (bodyData ?? []).map((p) => ({
    date: formatDate(p.date),
    value: p.value,
  }))

  const bodyFields = Object.keys(BODY_FIELD_LABELS) as BodyField[]

  return (
    <div className="space-y-4">
      {/* Weight Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-brand-primary" />
            <CardTitle className="text-xl">Evolución del peso</CardTitle>
          </div>
          <CardDescription>Historial completo de peso registrado</CardDescription>
        </CardHeader>
        <CardContent>
          {weightLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : weightChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin registros de peso</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    formatter={(value) => [`${value} kg`, 'Peso']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--brand-primary)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--brand-primary)', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Body Metric Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-primary" />
              <CardTitle className="text-xl">Evolución corporal</CardTitle>
            </div>
            <Select
              value={selectedField}
              onValueChange={(v) => onFieldChange(v as BodyField)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bodyFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {BODY_FIELD_LABELS[field]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CardDescription>Historial de {BODY_FIELD_LABELS[selectedField].toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent>
          {bodyLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : bodyChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sin registros de {BODY_FIELD_LABELS[selectedField].toLowerCase()}
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={bodyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    formatter={(value) => [value, BODY_FIELD_LABELS[selectedField]]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--brand-primary)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--brand-primary)', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

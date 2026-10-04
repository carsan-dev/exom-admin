import { useState } from 'react'
import { Activity, ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useClientMetrics } from '../api'
import { ClientMetricDialog } from '../../clients/components/client-metric-dialog'
import type { BodyMetric } from '../../clients/types'

interface MetricsTableProps {
  clientId: string
  page: number
  onPageChange: (page: number) => void
}

const tableDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatValue(value: number | null, unit: string) {
  if (value == null) return 'Sin datos'
  return `${value} ${unit}`
}

export function MetricsTable(props: MetricsTableProps) {
  return <MetricsTableContent key={props.clientId} {...props} />
}

function MetricsTableContent({ clientId, page, onPageChange }: MetricsTableProps) {
  const { data, isLoading, isError, refetch } = useClientMetrics(clientId, page)
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-primary" />
                <CardTitle className="text-xl">Historial de métricas</CardTitle>
              </div>
              <CardDescription>Todas las métricas corporales registradas</CardDescription>
            </div>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Añadir métricas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
        {isLoading ? (
          <div className="space-y-2" role="status" aria-label="Cargando historial de métricas">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full motion-reduce:animate-none" />
            ))}
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-3">
            <p className="text-sm">No se pudo cargar el historial de métricas. Comprueba el acceso e inténtalo de nuevo.</p>
            <Button variant="outline" onClick={() => void refetch()}>Reintentar historial</Button>
          </div>
        ) : !data || data.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin métricas registradas</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">Registros corporales y edición. Desplaza la tabla para consultar todas las medidas y acciones.</p>
            <div className="overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" role="region" aria-label="Historial corporal desplazable" tabIndex={0}>
              <Table>
                <caption className="sr-only">Historial de métricas corporales y acciones</caption>
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
                  {data.data.map((metric) => (
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
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Página {data.page} de {data.totalPages} ({data.total} registros)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Página anterior de métricas"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Página siguiente de métricas"
                    disabled={page >= data.totalPages}
                    onClick={() => onPageChange(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        </CardContent>
      </Card>
      <ClientMetricDialog
        clientId={clientId}
        metric={selectedMetric}
        open={metricDialogOpen}
        onOpenChange={setMetricDialogOpen}
      />
    </>
  )
}

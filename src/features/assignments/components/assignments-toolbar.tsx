import { ChevronLeft, ChevronRight, Copy, Layers3, Plus, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getUserDisplayName } from '../../clients/types'
import type { AssignmentSummary, AssignmentsViewMode, ClientOption } from '../types'

interface AssignmentsToolbarProps {
  clients: ClientOption[]
  selectedClientId: string
  periodLabel: string
  viewMode: AssignmentsViewMode
  selectionCount: number
  summary: AssignmentSummary
  isBusy?: boolean
  canCopyWeek: boolean
  canAssign: boolean
  canSelectAll: boolean
  assignActionLabel: string
  canDeleteSelectedDay: boolean
  onClientChange: (clientId: string) => void
  onChangeView: (viewMode: AssignmentsViewMode) => void
  onPreviousPeriod: () => void
  onNextPeriod: () => void
  onOpenEditor: () => void
  onOpenCopyWeek: () => void
  onSelectAllVisible: () => void
  onDeleteSelectedDay: () => void
  onClearSelection: () => void
}

export function AssignmentsToolbar({
  clients,
  selectedClientId,
  periodLabel,
  viewMode,
  selectionCount,
  summary,
  isBusy = false,
  canCopyWeek,
  canAssign,
  canSelectAll,
  assignActionLabel,
  canDeleteSelectedDay,
  onClientChange,
  onChangeView,
  onPreviousPeriod,
  onNextPeriod,
  onOpenEditor,
  onOpenCopyWeek,
  onSelectAllVisible,
  onDeleteSelectedDay,
  onClearSelection,
}: AssignmentsToolbarProps) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-primary">Planificación de asignaciones</p>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Asignaciones</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Alterna entre la vista semanal y mensual, selecciona varios días y configura entrenamientos, dietas o descansos sin salir del modal.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onSelectAllVisible} disabled={!canSelectAll || isBusy}>
              <Layers3 className="h-4 w-4" />
              Seleccionar todos
            </Button>
            <Button variant="outline" onClick={onOpenCopyWeek} disabled={!canCopyWeek || isBusy}>
              <Copy className="h-4 w-4" />
              Copiar semana
            </Button>
            <Button onClick={onOpenEditor} disabled={!canAssign || isBusy}>
              <Plus className="h-4 w-4" />
              {assignActionLabel}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,320px)_minmax(0,220px)_minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Cliente</p>
            <Select value={selectedClientId || ''} onValueChange={onClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {getUserDisplayName(client)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Vista</p>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-background/60 p-1">
              <Button
                type="button"
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                onClick={() => onChangeView('week')}
                disabled={isBusy}
              >
                Semanal
              </Button>
              <Button
                type="button"
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                onClick={() => onChangeView('month')}
                disabled={isBusy}
              >
                Mensual
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/70 bg-background/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Periodo visible</p>
                <p className="text-sm text-muted-foreground">{periodLabel}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onPreviousPeriod} disabled={!selectedClientId || isBusy}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button variant="outline" onClick={onNextPeriod} disabled={!selectedClientId || isBusy}>
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-status-info/30 bg-status-info/10 text-status-info">
                {summary.training_days} días con entreno
              </Badge>
              <Badge variant="outline" className="border-status-success/30 bg-status-success/10 text-status-success">
                {summary.diet_days} días con dieta
              </Badge>
              <Badge variant="outline" className="border-brand-primary/30 bg-brand-soft/20 text-brand-primary">
                {summary.rest_days} descansos
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background text-foreground">
                {selectionCount} seleccionados
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button variant="outline" onClick={onClearSelection} disabled={selectionCount === 0 || isBusy}>
              <X className="h-4 w-4" />
              Limpiar selección
            </Button>
            <Button variant="outline" onClick={onDeleteSelectedDay} disabled={!canDeleteSelectedDay || isBusy}>
              <Trash2 className="h-4 w-4" />
              Limpiar día
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

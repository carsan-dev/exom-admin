import { ChevronLeft, ChevronRight, Copy, Layers3, Pencil, Plus, Repeat2, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented'
import { StatusChip } from '@/components/ui/status-chip'
import { SelectionBar } from '@/components/workspace/selection-bar'
import { getUserDisplayName } from '../../clients/types'
import type { AssignmentSummary, AssignmentsViewMode, AutoAssignmentRule, ClientOption } from '../types'

interface AssignmentsToolbarProps {
  clients: ClientOption[]
  selectedClientId: string
  periodLabel: string
  viewMode: AssignmentsViewMode
  selectionCount: number
  summary: AssignmentSummary
  isBusy?: boolean
  canCopyWeek: boolean
  canCopySelection: boolean
  canAssign: boolean
  canSelectAll: boolean
  assignActionLabel: string
  canDeleteSelectedDays: boolean
  activeAutoRule: AutoAssignmentRule | null
  isAutoRuleLoading: boolean
  onEditAutoRule: () => void
  onDeactivateAutoRule: () => void
  onClientChange: (clientId: string) => void
  onChangeView: (viewMode: AssignmentsViewMode) => void
  onPreviousPeriod: () => void
  onNextPeriod: () => void
  onOpenEditor: () => void
  onOpenCopyWeek: () => void
  onOpenCopySelection: () => void
  onSelectAllVisible: () => void
  onDeleteSelectedDays: () => void
  onClearSelection: () => void
}

const viewOptions: { value: AssignmentsViewMode; label: string }[] = [
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensual' },
]

export function AssignmentsToolbar({
  clients,
  selectedClientId,
  periodLabel,
  viewMode,
  selectionCount,
  summary,
  isBusy = false,
  canCopyWeek,
  canCopySelection,
  canAssign,
  canSelectAll,
  assignActionLabel,
  canDeleteSelectedDays,
  activeAutoRule,
  isAutoRuleLoading,
  onEditAutoRule,
  onDeactivateAutoRule,
  onClientChange,
  onChangeView,
  onPreviousPeriod,
  onNextPeriod,
  onOpenEditor,
  onOpenCopyWeek,
  onOpenCopySelection,
  onSelectAllVisible,
  onDeleteSelectedDays,
  onClearSelection,
}: AssignmentsToolbarProps) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        className="mb-0 md:mb-0"
        eyebrow="Planificación de asignaciones"
        title="Asignaciones"
        description="Alterna entre la vista semanal y mensual, selecciona varios días y configura entrenamientos, dietas o descansos sin salir del modal."
        actions={
          <>
            <Button variant="outline" onClick={onSelectAllVisible} disabled={!canSelectAll || isBusy}>
              <Layers3 className="h-4 w-4" />
              Seleccionar todos
            </Button>
            <Button variant="outline" onClick={onOpenCopyWeek} disabled={!canCopyWeek || isBusy}>
              <Copy className="h-4 w-4" />
              Copiar semana
            </Button>
          </>
        }
      />

      <div className="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-4">
        <div className="min-w-0 space-y-2 max-md:w-full md:w-72">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground-muted">Cliente</p>
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

        <div className="space-y-2 max-md:w-full">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground-muted">Vista</p>
          <SegmentedControl
            aria-label="Vista del calendario"
            value={viewMode}
            options={viewOptions.map((option) => ({ ...option, disabled: isBusy }))}
            onValueChange={onChangeView}
            className="max-md:flex max-md:w-full max-md:[&>button]:h-9 max-md:[&>button]:flex-1"
          />
        </div>

        <div className="min-w-0 space-y-2 max-md:w-full">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground-muted">Periodo visible</p>
          <div className="flex items-center gap-2 max-md:justify-between">
            <Button variant="outline" onClick={onPreviousPeriod} disabled={!selectedClientId || isBusy}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <p className="min-w-40 text-center text-sm font-semibold tabular-nums text-foreground max-md:min-w-0 max-md:flex-1">{periodLabel}</p>
            <Button variant="outline" onClick={onNextPeriod} disabled={!selectedClientId || isBusy}>
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-11 min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-2 text-[13px] text-foreground-secondary">
        <div role="group" aria-label="Resumen del periodo" className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
          <span>{`${summary.training_days} días con entreno`}</span>
          <span>{`${summary.diet_days} días con dieta`}</span>
          <span>{`${summary.rest_days} descansos`}</span>
        </div>
        {isAutoRuleLoading ? (
          <StatusChip variant="neutral" dot={false}>
            Cargando autoasignación
          </StatusChip>
        ) : activeAutoRule ? (
          <StatusChip variant="success">
            Autoasignación activa desde {activeAutoRule.starts_on}
            {activeAutoRule.ends_on ? ` hasta ${activeAutoRule.ends_on}` : ' · indefinida'}
          </StatusChip>
        ) : null}
        <div className="flex flex-wrap items-center gap-1 md:ml-auto">
          <Button variant="ghost" size="sm" onClick={onEditAutoRule} disabled={!activeAutoRule || isBusy}>
            <Pencil className="h-4 w-4" />
            Editar autoasignación
          </Button>
          <Button variant="ghost" size="sm" onClick={onDeactivateAutoRule} disabled={!activeAutoRule || isBusy}>
            <Repeat2 className="h-4 w-4" />
            Desactivar autoasignación
          </Button>
        </div>
      </div>

      <SelectionBar
        count={selectionCount}
        onClear={onClearSelection}
        formatCount={(count) => `${count} seleccionados`}
        aria-label="Acciones de la selección"
        className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] left-4 right-4 z-40 mt-0 w-auto flex-wrap max-md:overflow-x-visible md:bottom-6 md:left-1/2 md:right-auto md:w-auto md:min-w-96 md:-translate-x-1/2"
      >
        <Button onClick={onOpenEditor} disabled={!canAssign || isBusy}>
          <Plus className="h-4 w-4" />
          {assignActionLabel}
        </Button>
        <Button variant="outline" onClick={onOpenCopySelection} disabled={!canCopySelection || isBusy}>
          <Copy className="h-4 w-4" />
          <span className="max-md:sr-only">Copiar selección</span>
        </Button>
        <Button variant="outline" onClick={onDeleteSelectedDays} disabled={!canDeleteSelectedDays || isBusy}>
          <Trash2 className="h-4 w-4" />
          <span className="max-md:sr-only">{selectionCount > 1 ? 'Limpiar días' : 'Limpiar día'}</span>
        </Button>
      </SelectionBar>
    </div>
  )
}

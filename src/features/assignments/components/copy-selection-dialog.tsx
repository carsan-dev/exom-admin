import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AssignmentDay } from '../types'

export interface CopySelectionPreviewItem {
  day: AssignmentDay
  targetDate: string
  existingTarget: AssignmentDay | undefined
}

interface CopySelectionDialogProps {
  open: boolean
  targetDate: string
  preview: CopySelectionPreviewItem[]
  selectedCount: number
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onTargetDateChange: (value: string) => void
  onConfirm: () => void
}

export function CopySelectionDialog({
  open,
  targetDate: copyTargetDate,
  preview,
  selectedCount,
  isPending,
  onOpenChange,
  onTargetDateChange,
  onConfirm,
}: CopySelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableOutsideClose className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Copiar selección</DialogTitle>
          <DialogDescription>
            Primer día seleccionado irá a fecha destino. Resto conservará distancia entre fechas. Destinos existentes serán sobrescritos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="copy-selection-target" className="text-sm font-medium">Fecha destino inicial</label>
            <Input id="copy-selection-target" type="date" value={copyTargetDate} onChange={(event) => onTargetDateChange(event.target.value)} />
          </div>
          <div className="border-t border-border">
            {preview.map(({ day, targetDate, existingTarget }) => {
              const trainingNames = (day.trainings?.length ? day.trainings : day.training ? [day.training] : [])
                .map((training) => `${training.name}${training.is_active === false ? ' (retirado)' : ''}`)
                .join(' + ')
              const sourceLabel = day.is_rest_day ? 'Descanso' : [trainingNames, day.diet?.name].filter(Boolean).join(' + ') || 'Vacío (limpiará destino)'
              const targetBusy = Boolean(existingTarget && (existingTarget.training || existingTarget.diet || existingTarget.is_rest_day))
              return (
                <div key={day.date} className="border-b border-border py-3 text-sm">
                  <p className="font-semibold tabular-nums">{day.date} → {targetDate}</p>
                  <p className="text-foreground-muted">{sourceLabel}</p>
                  <p className={targetBusy ? 'text-status-warning' : 'text-foreground-muted'}>
                    {targetBusy ? 'Destino ocupado: será sobrescrito' : existingTarget ? 'Destino vacío' : 'Destino fuera del período visible; se sobrescribirá si está ocupado'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={!copyTargetDate || isPending}>
            {isPending ? 'Copiando...' : `Copiar ${selectedCount} días`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

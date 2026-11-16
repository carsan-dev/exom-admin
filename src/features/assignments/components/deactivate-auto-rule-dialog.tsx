import { Repeat2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeactivateAutoRuleDialogProps {
  open: boolean
  isPending: boolean
  hasActiveRule: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeactivateAutoRuleDialog({
  open,
  isPending,
  hasActiveRule,
  onOpenChange,
  onConfirm,
}: DeactivateAutoRuleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desactivar autoasignación semanal</DialogTitle>
          <DialogDescription>
            La regla dejará de generar nuevos entrenamientos, dietas o descansos para próximas semanas.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-foreground">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-status-warning/10 p-2 text-status-warning">
              <Repeat2 className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Las fechas automáticas pendientes se retirarán.</p>
              <p className="text-muted-foreground">
                El histórico y los cambios manuales se mantienen. Podrás activar otro patrón cuando quieras.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending || !hasActiveRule}
          >
            {isPending ? 'Desactivando...' : 'Desactivar autoasignación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteSelectionDialogProps {
  open: boolean
  selectedCount: number
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

export function DeleteSelectionDialog({
  open,
  selectedCount,
  isPending,
  onOpenChange,
  onConfirm,
}: DeleteSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Limpiar días seleccionados</DialogTitle>
          <DialogDescription>
            Se eliminarán las asignaciones de {selectedCount} días. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Limpiando...' : 'Limpiar días'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

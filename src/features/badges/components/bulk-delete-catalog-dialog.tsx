import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BulkDeleteCatalogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  catalogLabel: string
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function BulkDeleteCatalogDialog({
  open,
  onOpenChange,
  selectedCount,
  catalogLabel,
  isPending,
  onCancel,
  onConfirm,
}: BulkDeleteCatalogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar {selectedCount} valores</DialogTitle>
          <DialogDescription>
            Se quitarán de todos los {catalogLabel} activos donde estén asignados.
            Los recursos no se eliminarán. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Eliminando...</> : 'Eliminar selección'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

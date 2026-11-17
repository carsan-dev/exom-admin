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
import type { CatalogItem } from './catalog'

interface DeleteCatalogValueDialogProps {
  deletingItem: CatalogItem | null
  catalogLabel: string
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function DeleteCatalogValueDialog({
  deletingItem,
  catalogLabel,
  isPending,
  onConfirm,
  onClose,
}: DeleteCatalogValueDialogProps) {
  return (
    <Dialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Borrar valor</DialogTitle>
          <DialogDescription>
            Borrar "{deletingItem?.value}" de{' '}
            {catalogLabel}.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                Borrando...
              </>
            ) : (
              'Borrar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

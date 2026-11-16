import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface RecapArchiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  pending: boolean
}

export function RecapArchiveDialog({ open, onOpenChange, onConfirm, pending }: RecapArchiveDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Archivar recap?</AlertDialogTitle>
          <AlertDialogDescription>
            El recap dejará de aparecer en el listado activo y pasará a la vista de archivados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? 'Archivando...' : 'Archivar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

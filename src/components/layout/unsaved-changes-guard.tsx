import { useEffect } from 'react'
import { useBlocker } from 'react-router'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
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

export function UnsavedChangesGuard() {
  const hasUnsavedChanges = useUnsavedChangesStore((state) => state.hasUnsavedChanges)
  const blocker = useBlocker(hasUnsavedChanges)

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return (
    <AlertDialog open={blocker.state === 'blocked'}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hay cambios sin guardar</AlertDialogTitle>
          <AlertDialogDescription>
            Si sales ahora perderás los cambios introducidos. Guarda o cancela la edición para conservarlos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset?.()}>Permanecer</AlertDialogCancel>
          <AlertDialogAction onClick={() => blocker.proceed?.()}>Salir sin guardar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

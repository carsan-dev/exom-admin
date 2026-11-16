import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
import { useVersionChecker } from '@/hooks/use-version-checker'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function VersionUpdateBanner() {
  const { isUpdateAvailable } = useVersionChecker()
  const hasUnsavedChanges = useUnsavedChangesStore((state) => state.hasUnsavedChanges)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  if (!isUpdateAvailable) return null

  const handleReload = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true)
      return
    }

    window.location.reload()
  }

  return (
    <>
      {/* Con la barra inferior móvil presente, el aviso se coloca justo encima de ella. */}
      <div
        data-version-banner=""
        className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl flex-col gap-3 border border-border-strong bg-background-surface p-3 shadow-overlay [body:has([data-mobile-tabbar])_&]:bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] md:[body:has([data-mobile-tabbar])_&]:bottom-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-sm text-foreground">Nueva versión disponible. Recarga la página para aplicar los cambios.</p>
        <Button type="button" size="sm" className="shrink-0" onClick={handleReload}>
          <RefreshCw className="size-4" />
          Recargar
        </Button>
      </div>

      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Guarda o cancela la edición antes de recargar. El formulario se mantendrá intacto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Entendido</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

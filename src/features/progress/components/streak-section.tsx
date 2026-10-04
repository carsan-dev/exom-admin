import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClientStreakCard } from '../../clients/components/client-streak-card'
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
import { toast } from 'sonner'
import { useResetStreak } from '../api'
import type { Streak } from '../../clients/types'

interface StreakSectionProps {
  clientId: string
  streak: Streak | null | undefined
  isLoading?: boolean
}

export function StreakSection({ clientId, streak, isLoading }: StreakSectionProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const resetMutation = useResetStreak(clientId)

  async function handleReset() {
    try {
      await resetMutation.mutateAsync()
      toast.success('Racha reiniciada correctamente')
    } catch {
      toast.error('No se pudo reiniciar la racha')
    }
    setConfirmOpen(false)
  }

  return (
    <>
      <ClientStreakCard streak={streak} isLoading={isLoading} action={
        <Button variant="outline" size="sm" disabled={resetMutation.isPending}
          onClick={() => setConfirmOpen(true)}
          className="gap-2 text-status-error border-status-error/40 hover:bg-status-error/10">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reiniciar racha
        </Button>
      } />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reiniciar racha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción pondrá la racha actual del cliente a 0. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetMutation.isPending}
              className="bg-status-error hover:bg-status-error/90"
            >
              Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

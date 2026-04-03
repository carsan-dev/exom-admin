import { useState } from 'react'
import { CalendarClock, Flame, RotateCcw, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export function StreakSection({ clientId, streak }: StreakSectionProps) {
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

  if (!streak) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          El cliente todavía no tiene una racha registrada.
        </CardContent>
      </Card>
    )
  }

  const items = [
    {
      label: 'Racha actual',
      value: `${streak.current_days} días`,
      icon: Flame,
      accent: 'text-status-warning',
    },
    {
      label: 'Mejor récord',
      value: `${streak.longest_days} días`,
      icon: Trophy,
      accent: 'text-brand-primary',
    },
    {
      label: 'Última actividad',
      value: streak.last_active_date
        ? dateFormatter.format(new Date(streak.last_active_date))
        : 'Sin actividad',
      icon: CalendarClock,
      accent: 'text-status-info',
    },
  ]

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Racha del cliente</CardTitle>
              <CardDescription>Actividad reciente y mejor consistencia histórica</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="gap-2 text-status-error border-status-error/40 hover:bg-status-error/10"
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar racha
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Icon className={`h-4 w-4 ${item.accent}`} />
                  {item.label}
                </div>
                <p className="mt-3 text-2xl font-semibold text-foreground">{item.value}</p>
              </div>
            )
          })}
        </CardContent>
      </Card>

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

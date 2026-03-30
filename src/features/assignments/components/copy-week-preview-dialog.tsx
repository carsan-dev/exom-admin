import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Apple, Copy, Dumbbell, PauseCircle, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { CopyWeekPreview } from '../types'

interface CopyWeekPreviewDialogProps {
  open: boolean
  preview: CopyWeekPreview | null
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

function formatWeekRange(weekStart: string) {
  const start = parseISO(weekStart)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return `${format(start, "d 'de' MMMM", { locale: es })} - ${format(end, "d 'de' MMMM", { locale: es })}`
}

function formatDay(date: string) {
  return format(parseISO(date), "EEE d MMM", { locale: es })
}

export function CopyWeekPreviewDialog({
  open,
  preview,
  isSubmitting = false,
  onOpenChange,
  onConfirm,
}: CopyWeekPreviewDialogProps) {
  if (!preview) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vista previa de copia semanal</DialogTitle>
          <DialogDescription>
            Revisa como quedara la semana destino antes de sobrescribir sus dias.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Semana origen</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{formatWeekRange(preview.source_week_start)}</p>
          </div>
          <div className="rounded-2xl border border-brand-primary/20 bg-brand-soft/10 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-brand-primary">Semana destino</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{formatWeekRange(preview.target_week_start)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-status-info/30 bg-status-info/10 text-status-info">
            {preview.summary.training_days} dias con entreno
          </Badge>
          <Badge variant="outline" className="border-status-success/30 bg-status-success/10 text-status-success">
            {preview.summary.diet_days} dias con dieta
          </Badge>
          <Badge variant="outline" className="border-brand-primary/30 bg-brand-soft/20 text-brand-primary">
            {preview.summary.rest_days} descansos
          </Badge>
          <Badge variant="outline" className="border-status-error/30 bg-status-error/10 text-status-error">
            {preview.summary.cleared_days} dias se limpiaran
          </Badge>
        </div>

        <Separator />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {preview.days.map((day) => (
            <div key={day.target_date} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{formatDay(day.target_date)}</p>
                <p className="text-sm text-muted-foreground">Se copia desde {formatDay(day.source_date)}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {day.training && (
                  <Badge variant="outline" className="gap-1 border-status-info/30 bg-status-info/10 text-status-info">
                    <Dumbbell className="h-3 w-3" />
                    Entreno
                  </Badge>
                )}
                {day.diet && (
                  <Badge variant="outline" className="gap-1 border-status-success/30 bg-status-success/10 text-status-success">
                    <Apple className="h-3 w-3" />
                    Dieta
                  </Badge>
                )}
                {day.is_rest_day && (
                  <Badge variant="outline" className="gap-1 border-brand-primary/30 bg-brand-soft/20 text-brand-primary">
                    <PauseCircle className="h-3 w-3" />
                    Descanso
                  </Badge>
                )}
                {day.will_clear_day && (
                  <Badge variant="outline" className="gap-1 border-status-error/30 bg-status-error/10 text-status-error">
                    <Trash2 className="h-3 w-3" />
                    Limpiar
                  </Badge>
                )}
              </div>

              <div className="mt-4 space-y-3 text-sm">
                {day.training && (
                  <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Entrenamiento</p>
                    <p className="mt-1 font-medium text-foreground">{day.training.name}</p>
                  </div>
                )}

                {day.diet && (
                  <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan nutricional</p>
                    <p className="mt-1 font-medium text-foreground">{day.diet.name}</p>
                  </div>
                )}

                {day.is_rest_day && (
                  <div className="rounded-xl border border-brand-primary/20 bg-brand-soft/10 p-3">
                    <p className="font-medium text-foreground">Dia de descanso</p>
                  </div>
                )}

                {day.will_clear_day && (
                  <div className="rounded-xl border border-status-error/20 bg-status-error/5 p-3">
                    <p className="font-medium text-foreground">El dia destino quedara sin planificacion</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Volver
          </Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={isSubmitting}>
            <Copy className="h-4 w-4" />
            Confirmar copia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

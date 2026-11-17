import { useState } from 'react'
import { Check, Info, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useExerciseTrainingUsage } from '../api'
import type { Exercise } from '../types'

export function TrainingUsageCell({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false)
  const usage = useExerciseTrainingUsage(exercise.id, open && exercise.training_usage_count > 0)

  if (!exercise.is_used_in_training) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-status-error">
        <X aria-hidden="true" className="h-4 w-4" />
        Sin asignar
      </span>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Check className="h-4 w-4 text-status-success" aria-hidden="true" />
      <span className="font-display text-sm font-bold tabular-nums">{exercise.training_usage_count}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label={`Ver entrenamientos que usan ${exercise.name}`}
          >
            <Info aria-hidden="true" className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <p className="mb-2 font-medium">Usado en entrenamientos</p>
          {usage.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : usage.isError ? (
            <p className="text-sm text-status-error">No se pudo cargar el uso.</p>
          ) : usage.data?.trainings.length ? (
            <ul className="max-h-56 space-y-1 overflow-auto text-sm">
              {usage.data.trainings.map((training) => (
                <li key={training.id}>{training.name}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin entrenamientos activos.</p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

import { Button } from '@/components/ui/button'
import type { TrainingCompletionMode } from '../types'
import { COMPLETION_MODE_HELP, COMPLETION_MODE_OPTIONS } from './completion-mode'

interface CompletionModeFieldProps {
  id: string
  value: TrainingCompletionMode
  onChange: (mode: TrainingCompletionMode) => void
  disabled?: boolean
}

export function CompletionModeField({ id, value, onChange, disabled = false }: CompletionModeFieldProps) {
  const helpId = `${id}-help`

  return (
    <div className="space-y-2">
      <p id={id} className="text-sm font-medium leading-none">Modo de completado</p>
      <div role="group" aria-labelledby={id} aria-describedby={helpId} className="grid gap-2 sm:grid-cols-2">
        {COMPLETION_MODE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={value === option.value ? 'default' : 'outline'}
            aria-pressed={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <p id={helpId} className="text-[0.8rem] text-muted-foreground">{COMPLETION_MODE_HELP}</p>
    </div>
  )
}

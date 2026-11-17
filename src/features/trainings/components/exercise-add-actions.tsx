import { Plus, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExerciseAddActionsProps {
  onAddExercise: () => void
  onAddCircuit: () => void
}

export function ExerciseAddActions({ onAddExercise, onAddCircuit }: ExerciseAddActionsProps) {
  return (
    <div className="grid gap-2 pt-1 sm:grid-cols-2">
      <Button type="button" variant="outline" size="sm" className="w-full max-md:h-11" onClick={onAddExercise}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Agregar ejercicio
      </Button>
      <Button type="button" variant="outline" size="sm" className="w-full max-md:h-11" onClick={onAddCircuit}>
        <Repeat aria-hidden="true" className="h-4 w-4" />
        Agregar circuito
      </Button>
    </div>
  )
}

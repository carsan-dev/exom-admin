import { Plus, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExerciseAddActionsProps {
  onAddExercise: () => void
  onAddCircuit: () => void
}

export function ExerciseAddActions({ onAddExercise, onAddCircuit }: ExerciseAddActionsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={onAddExercise}>
        <Plus className="h-4 w-4" />
        Agregar ejercicio
      </Button>
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={onAddCircuit}>
        <Repeat className="h-4 w-4" />
        Agregar circuito
      </Button>
    </div>
  )
}

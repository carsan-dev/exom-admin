import { Search } from 'lucide-react'
import { Tag } from '@/components/ui/tag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { LEVEL_LABELS, type Exercise } from '../../exercises/types'
import type { TrainingItemFormValues } from '../schemas'

interface ExerciseSearchPanelProps {
  search: string
  onSearchChange: (value: string) => void
  isLoading: boolean
  filteredExercises: Exercise[]
  value: TrainingItemFormValues[]
  onAdd: (exerciseId: string) => void
  onCancel: () => void
}

export function ExerciseSearchPanel({
  search,
  onSearchChange,
  isLoading,
  filteredExercises,
  value,
  onAdd,
  onCancel,
}: ExerciseSearchPanelProps) {
  return (
    <div className="space-y-2 border border-border-strong bg-background-surface p-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Buscar ejercicio..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-2 text-center">Cargando ejercicios...</p>
      ) : filteredExercises.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 text-center">
          {search ? `No hay resultados para "${search}"` : 'No hay ejercicios disponibles'}
        </p>
      ) : (
        <div className="max-h-64 divide-y divide-border overflow-y-auto">
          {filteredExercises.map((exercise) => {
            const selectedCount = value.reduce((count, item) => {
              if (item.kind === 'EXERCISE') {
                return count + (item.exercise_id === exercise.id ? 1 : 0)
              }

              return (
                count + item.exercises.filter((nested) => nested.exercise_id === exercise.id).length
              )
            }, 0)

            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onAdd(exercise.id)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted max-md:min-h-11'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-foreground">{exercise.name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <Tag>{LEVEL_LABELS[exercise.level]}</Tag>
                    {exercise.muscle_groups.slice(0, 2).map((mg) => (
                      <Tag key={mg}>{mg}</Tag>
                    ))}
                  </div>
                </div>
                {selectedCount > 0 && (
                  <span className="text-xs text-muted-foreground flex-none">
                    Añadido {selectedCount} vez{selectedCount !== 1 ? 'es' : ''}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        onClick={onCancel}
      >
        Cancelar
      </Button>
    </div>
  )
}

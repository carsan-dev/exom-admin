import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { normalizeSearchText } from '@/lib/search'
import { getLevelBadgeClass, LEVEL_LABELS } from '../../exercises/types'
import { useExercisesList } from '../api'
import type { TrainingExerciseFormValues } from '../schemas'

interface ExercisePickerProps {
  value: TrainingExerciseFormValues[]
  onChange: (value: TrainingExerciseFormValues[]) => void
  error?: string
}

export function ExercisePicker({ value, onChange, error }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const exercisesQuery = useExercisesList()
  const allExercises = exercisesQuery.data?.data ?? []

  const exercisesById = useMemo(
    () => new Map(allExercises.map((ex) => [ex.id, ex])),
    [allExercises],
  )

  const selectedIds = new Set(value.map((ex) => ex.exercise_id))

  const normalizedSearch = normalizeSearchText(search.trim())
  const filteredExercises = normalizedSearch
    ? allExercises.filter(
        (ex) =>
          normalizeSearchText(ex.name).includes(normalizedSearch) ||
          ex.muscle_groups.some((mg) => normalizeSearchText(mg).includes(normalizedSearch)),
      )
    : allExercises

  const addExercise = (exerciseId: string) => {
    if (selectedIds.has(exerciseId)) return
    const newItem: TrainingExerciseFormValues = {
      exercise_id: exerciseId,
      order: value.length,
      sets: 3,
      reps_or_duration: '10',
      rest_seconds: 60,
    }
    onChange([...value, newItem])
    setSearch('')
    setPickerOpen(false)
  }

  const removeExercise = (index: number) => {
    const updated = value
      .filter((_, i) => i !== index)
      .map((ex, i) => ({ ...ex, order: i }))
    onChange(updated)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const updated = [...value]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    onChange(updated.map((ex, i) => ({ ...ex, order: i })))
  }

  const moveDown = (index: number) => {
    if (index === value.length - 1) return
    const updated = [...value]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    onChange(updated.map((ex, i) => ({ ...ex, order: i })))
  }

  const updateField = <K extends keyof TrainingExerciseFormValues>(
    index: number,
    field: K,
    fieldValue: TrainingExerciseFormValues[K],
  ) => {
    const updated = value.map((ex, i) => (i === index ? { ...ex, [field]: fieldValue } : ex))
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium leading-none">Ejercicios</p>
        {value.length > 0 && (
          <span className="text-xs text-muted-foreground">{value.length} ejercicio{value.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Exercise list */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => {
            const exercise = exercisesById.get(item.exercise_id)

            return (
              <div
                key={`${item.exercise_id}-${index}`}
                className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-3"
              >
                {/* Row: order controls + exercise name + delete */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => moveDown(index)}
                      disabled={index === value.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <span className="text-xs font-medium text-muted-foreground w-5 text-center">{index + 1}</span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {exercise?.name ?? <span className="text-muted-foreground italic">Ejercicio no encontrado</span>}
                    </p>
                    {exercise && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        <Badge
                          variant="outline"
                          className={cn('text-xs h-4 px-1', getLevelBadgeClass(exercise.level))}
                        >
                          {LEVEL_LABELS[exercise.level]}
                        </Badge>
                        {exercise.muscle_groups.slice(0, 2).map((mg) => (
                          <Badge
                            key={mg}
                            variant="outline"
                            className="text-xs h-4 px-1 border-brand-soft/40 bg-brand-soft/10 text-brand-primary"
                          >
                            {mg}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-status-error flex-none"
                    onClick={() => removeExercise(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Prescription fields */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Series</label>
                    <Input
                      type="number"
                      min={1}
                      value={item.sets}
                      onChange={(e) => updateField(index, 'sets', parseInt(e.target.value) || 1)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Reps / duración</label>
                    <Input
                      value={item.reps_or_duration}
                      onChange={(e) => updateField(index, 'reps_or_duration', e.target.value)}
                      placeholder="10 ó 30s"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Descanso entre series (s)</label>
                    <Input
                      type="number"
                      min={0}
                      value={item.rest_seconds}
                      onChange={(e) => updateField(index, 'rest_seconds', parseInt(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                    <p className="text-[11px] leading-tight text-muted-foreground">
                      Tiempo de descanso entre cada serie del ejercicio
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add exercise */}
      {pickerOpen ? (
        <div className="rounded-lg border border-border/70 bg-background p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar ejercicio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {exercisesQuery.isLoading ? (
            <p className="text-xs text-muted-foreground py-2 text-center">Cargando ejercicios...</p>
          ) : filteredExercises.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              {search ? `No hay resultados para "${search}"` : 'No hay ejercicios disponibles'}
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredExercises.map((exercise) => {
                const isSelected = selectedIds.has(exercise.id)
                return (
                  <button
                    key={exercise.id}
                    type="button"
                    disabled={isSelected}
                    onClick={() => addExercise(exercise.id)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                      isSelected
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-muted cursor-pointer',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-foreground">{exercise.name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        <Badge
                          variant="outline"
                          className={cn('text-xs h-4 px-1', getLevelBadgeClass(exercise.level))}
                        >
                          {LEVEL_LABELS[exercise.level]}
                        </Badge>
                        {exercise.muscle_groups.slice(0, 2).map((mg) => (
                          <Badge
                            key={mg}
                            variant="outline"
                            className="text-xs h-4 px-1 border-brand-soft/40 bg-brand-soft/10 text-brand-primary"
                          >
                            {mg}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-xs text-muted-foreground flex-none">Ya añadido</span>
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
            onClick={() => {
              setPickerOpen(false)
              setSearch('')
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Agregar ejercicio
        </Button>
      )}

      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}

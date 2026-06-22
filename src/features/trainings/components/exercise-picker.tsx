import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Repeat, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { normalizeSearchText } from '@/lib/search'
import { getLevelBadgeClass, LEVEL_LABELS } from '../../exercises/types'
import { useExercisesList } from '../api'
import type {
  TrainingCircuitExerciseFormValues,
  TrainingItemFormValues,
} from '../schemas'

interface ExercisePickerProps {
  value: TrainingItemFormValues[]
  onChange: (value: TrainingItemFormValues[]) => void
  error?: string
}

export function ExercisePicker({ value, onChange, error }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [targetCircuitIndex, setTargetCircuitIndex] = useState<number | null>(null)
  const exercisesQuery = useExercisesList()
  const allExercises = exercisesQuery.data?.data ?? []
  const trackedCount = value.reduce(
    (count, item) => count + (item.kind === 'CIRCUIT'
      ? item.exercises.filter((exercise) => exercise.request_set_tracking).length
      : (item.request_set_tracking ? 1 : 0)),
    0,
  )
  const exerciseCount = value.reduce(
    (count, item) => count + (item.kind === 'CIRCUIT' ? item.exercises.length : 1),
    0,
  )
  const allTracked = exerciseCount > 0 && trackedCount === exerciseCount

  const setAllTracking = (enabled: boolean) => {
    onChange(value.map((item) => item.kind === 'CIRCUIT'
      ? { ...item, exercises: item.exercises.map((exercise) => ({ ...exercise, request_set_tracking: enabled })) }
      : { ...item, request_set_tracking: enabled }))
  }

  const exercisesById = useMemo(
    () => new Map(allExercises.map((ex) => [ex.id, ex])),
    [allExercises],
  )

  const normalizedSearch = normalizeSearchText(search.trim())
  const filteredExercises = normalizedSearch
    ? allExercises.filter(
        (ex) =>
          normalizeSearchText(ex.name).includes(normalizedSearch) ||
          ex.muscle_groups.some((mg) => normalizeSearchText(mg).includes(normalizedSearch)),
      )
    : allExercises

  const addExercise = (exerciseId: string) => {
    if (targetCircuitIndex != null) {
      const updated = value.map((item, index) => {
        if (index !== targetCircuitIndex || item.kind !== 'CIRCUIT') return item
        const newExercise: TrainingCircuitExerciseFormValues = {
          exercise_id: exerciseId,
          reps_or_duration: '10',
          request_set_tracking: allTracked,
          rest_seconds: 15,
        }
        return { ...item, exercises: [...item.exercises, newExercise] }
      })
      onChange(updated)
      setSearch('')
      setPickerOpen(false)
      setTargetCircuitIndex(null)
      return
    }

    const newItem: TrainingItemFormValues = {
      kind: 'EXERCISE',
      exercise_id: exerciseId,
      order: value.length,
      sets: 3,
      reps_or_duration: '10',
      request_set_tracking: allTracked,
      rest_seconds: 60,
    }
    onChange([...value, newItem])
    setSearch('')
    setPickerOpen(false)
  }

  const addCircuit = () => {
    onChange([
      ...value,
      {
        kind: 'CIRCUIT',
        order: value.length,
        name: 'Circuito',
        rounds: 3,
        rest_between_rounds_seconds: 60,
        exercises: [],
      },
    ])
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

  const updateField = (index: number, field: string, fieldValue: unknown) => {
    const updated = value.map((ex, i) => (i === index ? { ...ex, [field]: fieldValue } : ex))
    onChange(updated as TrainingItemFormValues[])
  }

  const updateCircuitExercise = <K extends keyof TrainingCircuitExerciseFormValues>(
    circuitIndex: number,
    exerciseIndex: number,
    field: K,
    fieldValue: TrainingCircuitExerciseFormValues[K],
  ) => {
    onChange(value.map((item, index) => {
      if (index !== circuitIndex || item.kind !== 'CIRCUIT') return item
      return {
        ...item,
        exercises: item.exercises.map((exercise, nestedIndex) =>
          nestedIndex === exerciseIndex ? { ...exercise, [field]: fieldValue } : exercise,
        ),
      }
    }))
  }

  const removeCircuitExercise = (circuitIndex: number, exerciseIndex: number) => {
    onChange(value.map((item, index) => {
      if (index !== circuitIndex || item.kind !== 'CIRCUIT') return item
      return {
        ...item,
        exercises: item.exercises.filter((_, nestedIndex) => nestedIndex !== exerciseIndex),
      }
    }))
  }

  const moveCircuitExercise = (circuitIndex: number, exerciseIndex: number, direction: -1 | 1) => {
    onChange(value.map((item, index) => {
      if (index !== circuitIndex || item.kind !== 'CIRCUIT') return item
      const nextIndex = exerciseIndex + direction
      if (nextIndex < 0 || nextIndex >= item.exercises.length) return item
      const exercises = [...item.exercises]
      ;[exercises[exerciseIndex], exercises[nextIndex]] = [exercises[nextIndex], exercises[exerciseIndex]]
      return { ...item, exercises }
    }))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium leading-none">Ejercicios</p>
        {exerciseCount > 0 && <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={allTracked}
            ref={(node) => { if (node) node.indeterminate = trackedCount > 0 && !allTracked }}
            onChange={(event) => setAllTracking(event.target.checked)}
            className="h-4 w-4 rounded border-border accent-brand-primary"
          />
          Solicitar registro en todos
        </label>}
      </div>

      {/* Exercise list */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => {
            if (item.kind === 'CIRCUIT') {
              return (
                <div
                  key={`circuit-${index}`}
                  className="rounded-lg border border-brand-soft/40 bg-brand-soft/10 p-3 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveUp(index)} disabled={index === 0}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveDown(index)} disabled={index === value.length - 1}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <Repeat className="h-4 w-4 text-brand-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Circuito · {item.rounds} rondas</p>
                      <p className="text-xs text-muted-foreground">{item.exercises.length} ejercicio{item.exercises.length !== 1 ? 's' : ''}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-status-error" onClick={() => removeExercise(index)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Nombre</label>
                      <Input value={item.name} onChange={(e) => updateField(index, 'name', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Rondas</label>
                      <Input type="number" min={1} value={item.rounds} onChange={(e) => updateField(index, 'rounds', parseInt(e.target.value) || 1)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Descanso entre rondas (s)</label>
                      <Input type="number" min={0} value={item.rest_between_rounds_seconds} onChange={(e) => updateField(index, 'rest_between_rounds_seconds', parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                    </div>
                  </div>

                  <div className="space-y-2 rounded-md border border-border/60 bg-background/60 p-2">
                    {item.exercises.map((nested, nestedIndex) => {
                      const exercise = exercisesById.get(nested.exercise_id)
                      return (
                        <div key={`${nested.exercise_id}-${nestedIndex}`} className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveCircuitExercise(index, nestedIndex, -1)} disabled={nestedIndex === 0}>
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveCircuitExercise(index, nestedIndex, 1)} disabled={nestedIndex === item.exercises.length - 1}>
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">{nestedIndex + 1}</span>
                            <p className="flex-1 truncate text-sm font-medium text-foreground">{exercise?.name ?? 'Ejercicio no encontrado'}</p>
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-status-error" onClick={() => removeCircuitExercise(index, nestedIndex)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Reps / duración</label>
                              <Input value={nested.reps_or_duration} onChange={(e) => updateCircuitExercise(index, nestedIndex, 'reps_or_duration', e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Descanso tras ejercicio (s)</label>
                              <Input type="number" min={0} value={nested.rest_seconds} onChange={(e) => updateCircuitExercise(index, nestedIndex, 'rest_seconds', parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                            </div>
                          </div>
                          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                            <input type="checkbox" checked={nested.request_set_tracking} onChange={(event) => updateCircuitExercise(index, nestedIndex, 'request_set_tracking', event.target.checked)} className="h-4 w-4 accent-brand-primary" />
                            Solicitar reps y peso reales en cada ronda
                          </label>
                        </div>
                      )
                    })}
                    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => { setTargetCircuitIndex(index); setPickerOpen(true) }}>
                      <Plus className="h-4 w-4" />
                      Agregar ejercicio al circuito
                    </Button>
                  </div>
                </div>
              )
            }

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
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={item.request_set_tracking} onChange={(event) => updateField(index, 'request_set_tracking', event.target.checked)} className="h-4 w-4 accent-brand-primary" />
                  Solicitar reps y peso reales en cada serie
                </label>
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
                const selectedCount = value.reduce((count, item) => {
                  if (item.kind === 'EXERCISE') {
                    return count + (item.exercise_id === exercise.id ? 1 : 0)
                  }

                  return count + item.exercises.filter((nested) => nested.exercise_id === exercise.id).length
                }, 0)

                return (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => addExercise(exercise.id)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted cursor-pointer',
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
            onClick={() => {
              setPickerOpen(false)
              setSearch('')
              setTargetCircuitIndex(null)
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setTargetCircuitIndex(null)
              setPickerOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Agregar ejercicio
          </Button>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={addCircuit}>
            <Repeat className="h-4 w-4" />
            Agregar circuito
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}

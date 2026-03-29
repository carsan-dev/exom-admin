import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ChevronDown, LoaderCircle, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { LEVEL_LABELS, LEVEL_OPTIONS } from '../../exercises/types'
import { getApiErrorMessage, useCreateTraining, useTrainingTags, useUpdateTraining } from '../api'
import {
  getTrainingTagKey,
  normalizeTrainingTagLabel,
  normalizeTrainingTags,
  trainingSchema,
  type TrainingFormValues,
} from '../schemas'
import { TRAINING_TYPE_LABELS, TRAINING_TYPE_OPTIONS, type Training } from '../types'
import { ExercisePicker } from './exercise-picker'

interface TrainingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  training?: Training | null
  isDuplicate?: boolean
  onSaved?: () => void
}

const defaultValues: TrainingFormValues = {
  name: '',
  type: 'FUERZA',
  level: 'PRINCIPIANTE',
  estimated_duration_min: null,
  estimated_calories: null,
  warmup_description: '',
  warmup_duration_min: null,
  cooldown_description: '',
  tags: [],
  exercises: [],
}

function toFormValues(training: Training, isDuplicate: boolean): TrainingFormValues {
  return {
    name: isDuplicate ? `${training.name} (copia)` : training.name,
    type: training.type,
    level: training.level,
    estimated_duration_min: training.estimated_duration_min,
    estimated_calories: training.estimated_calories,
    warmup_description: training.warmup_description ?? '',
    warmup_duration_min: training.warmup_duration_min,
    cooldown_description: training.cooldown_description ?? '',
    tags: normalizeTrainingTags(training.tags),
    exercises: [...training.exercises]
      .sort((a, b) => a.order - b.order)
      .map((te) => ({
        exercise_id: te.exercise.id,
        order: te.order,
        sets: te.sets,
        reps_or_duration: te.reps_or_duration,
        rest_seconds: te.rest_seconds,
      })),
  }
}

interface TagsFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  error?: string
}

function TagsField({ value, onChange, error }: TagsFieldProps) {
  const [input, setInput] = useState('')
  const tagsQuery = useTrainingTags()
  const availableTags = tagsQuery.data ?? []

  const hasTag = (tag: string) => {
    const tagKey = getTrainingTagKey(tag)
    return value.some((currentTag) => getTrainingTagKey(currentTag) === tagKey)
  }

  const add = (rawTag = input) => {
    const normalizedTag = normalizeTrainingTagLabel(rawTag)

    if (normalizedTag && !hasTag(normalizedTag)) {
      onChange(normalizeTrainingTags([...value, normalizedTag]))
    }

    setInput('')
  }

  const remove = (tag: string) => {
    const tagKey = getTrainingTagKey(tag)
    onChange(value.filter((currentTag) => getTrainingTagKey(currentTag) !== tagKey))
  }

  const toggle = (tag: string) => {
    const normalizedTag = normalizeTrainingTagLabel(tag)

    if (!normalizedTag) {
      return
    }

    if (hasTag(normalizedTag)) {
      remove(normalizedTag)
      return
    }

    onChange(normalizeTrainingTags([...value, normalizedTag]))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-input px-3 py-2 min-h-10">
        {value.length === 0 && (
          <span className="text-sm text-muted-foreground self-center">Sin etiquetas</span>
        )}
        {value.map((tag) => (
          <Badge key={tag} variant="outline" className="gap-1 border-brand-soft/40 bg-brand-soft/10 text-brand-primary pr-1">
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="ml-0.5 rounded-full hover:bg-brand-soft/20 p-0.5"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="sm:w-auto">
              Etiquetas existentes
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-60 overflow-y-auto">
            <DropdownMenuLabel>Etiquetas guardadas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tagsQuery.isLoading ? (
              <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                <LoaderCircle className="h-3 w-3 animate-spin" />
                Cargando etiquetas...
              </div>
            ) : tagsQuery.isError ? (
              <div className="px-2 py-2 text-xs text-status-error">
                {getApiErrorMessage(tagsQuery.error, 'No se han podido cargar las etiquetas')}
              </div>
            ) : availableTags.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">Aun no hay etiquetas guardadas.</div>
            ) : (
              availableTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={hasTag(tag)}
                  onCheckedChange={() => toggle(tag)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-1 gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nueva etiqueta (Enter)"
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => add()}
            disabled={!normalizeTrainingTagLabel(input)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {tagsQuery.isError ? (
        <div className="flex items-center gap-2 text-xs text-status-error">
          <span>{getApiErrorMessage(tagsQuery.error, 'No se han podido cargar las etiquetas existentes')}.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0 text-xs"
            onClick={() => tagsQuery.refetch()}
          >
            Reintentar
          </Button>
        </div>
      ) : tagsQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando etiquetas existentes...</p>
      ) : availableTags.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aun no hay etiquetas guardadas. Puedes crear la primera.</p>
      ) : (
        <p className="text-xs text-muted-foreground">Selecciona etiquetas existentes o crea una nueva.</p>
      )}

      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}

export function TrainingFormDialog({
  open,
  onOpenChange,
  training,
  isDuplicate = false,
  onSaved,
}: TrainingFormDialogProps) {
  const isEditing = Boolean(training) && !isDuplicate
  const createTraining = useCreateTraining()
  const updateTraining = useUpdateTraining()
  const isPending = createTraining.isPending || updateTraining.isPending
  const generalSectionRef = useRef<HTMLDivElement | null>(null)
  const warmupSectionRef = useRef<HTMLDivElement | null>(null)
  const exercisesSectionRef = useRef<HTMLDivElement | null>(null)

  const dialogTitle = isEditing ? 'Editar entrenamiento' : isDuplicate ? 'Duplicar entrenamiento' : 'Nuevo entrenamiento'
  const dialogDescription = isEditing
    ? 'Modifica los campos y guarda los cambios.'
    : isDuplicate
      ? 'Se creará una copia del entrenamiento con el mismo contenido.'
      : 'Rellena los datos del nuevo entrenamiento.'

  const form = useForm<TrainingFormValues>({
    resolver: zodResolver(trainingSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
      return
    }

    if (training) {
      form.reset(toFormValues(training, isDuplicate))
      return
    }

    form.reset(defaultValues)
  }, [form, open, training, isDuplicate])

  const scrollToSection = (section: HTMLDivElement | null) => {
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSubmit = form.handleSubmit(
    async (values) => {
      try {
        if (isEditing && training) {
          await updateTraining.mutateAsync({ id: training.id, values })
          toast.success('Entrenamiento actualizado correctamente')
        } else {
          await createTraining.mutateAsync(values)
          toast.success(isDuplicate ? 'Entrenamiento duplicado correctamente' : 'Entrenamiento creado correctamente')
        }

        onSaved?.()
        onOpenChange(false)
      } catch (error) {
        const action = isEditing ? 'actualizar' : 'crear'
        toast.error(getApiErrorMessage(error, `No se ha podido ${action} el entrenamiento`))
      }
    },
    (errors) => {
      toast.error('Revisa los campos obligatorios antes de continuar')

      if (errors.exercises) {
        scrollToSection(exercisesSectionRef.current)
        return
      }

      if (errors.warmup_description || errors.warmup_duration_min || errors.cooldown_description) {
        scrollToSection(warmupSectionRef.current)
        return
      }

      scrollToSection(generalSectionRef.current)

      if (errors.name) {
        form.setFocus('name')
      }
    },
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
            {/* Info general */}
            <div ref={generalSectionRef} className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Información general</p>

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Full Body Fuerza A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type + Level */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TRAINING_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type} value={type}>
                              {TRAINING_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivel</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEVEL_OPTIONS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {LEVEL_LABELS[level]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Duration + Calories */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="estimated_duration_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración estimada (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="45"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_calories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calorías estimadas (kcal)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="300"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Etiquetas</FormLabel>
                    <FormControl>
                      <TagsField value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Warmup / Cooldown */}
            <div ref={warmupSectionRef} className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Calentamiento y vuelta a la calma</p>

              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <FormField
                  control={form.control}
                  name="warmup_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción calentamiento</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={2}
                          placeholder="Describe el calentamiento..."
                          className="flex w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="warmup_duration_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="10"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cooldown_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción vuelta a la calma</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={2}
                        placeholder="Describe la vuelta a la calma..."
                        className="flex w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Exercises */}
            <div ref={exercisesSectionRef}>
              <FormField
                control={form.control}
                name="exercises"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ExercisePicker
                        value={field.value}
                        onChange={field.onChange}
                        error={form.formState.errors.exercises?.message}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditing ? 'Guardando...' : isDuplicate ? 'Creando copia...' : 'Creando...'
                  : isEditing ? 'Guardar cambios' : isDuplicate ? 'Crear copia' : 'Crear entrenamiento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

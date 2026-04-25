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
import { isApprovalPendingError } from '@/lib/api-utils'
import {
  getApiErrorMessage,
  useCreateTraining,
  useTrainingTags,
  useTrainingTypes,
  useUpdateTraining,
} from '../api'
import {
  getTrainingTagKey,
  normalizeTrainingTags,
  normalizeTrainingTagLabel,
  trainingSchema,
  type TrainingFormValues,
} from '../schemas'
import {
  DEFAULT_TRAINING_TYPE,
  TRAINING_ACCENT_SWATCHES,
  getTrainingAccentStyle,
  getTrainingTypeBadgeClass,
  getTrainingTypeKey,
  getTrainingTypeLabel,
  normalizeTrainingAccentColor,
  normalizeTrainingTypeLabel,
  normalizeTrainingTypes,
  resolveTrainingTypes,
  type Training,
} from '../types'
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
  types: [DEFAULT_TRAINING_TYPE],
  accentColor: null,
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
    types: resolveTrainingTypes(training),
    accentColor: training.accentColor ?? null,
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

interface TrainingTypesFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  error?: string
}

interface AccentColorFieldProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  error?: string
}

function getFirstErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  if ('message' in error && typeof error.message === 'string' && error.message) {
    return error.message
  }

  if (Array.isArray(error)) {
    for (const item of error) {
      const nestedMessage = getFirstErrorMessage(item)

      if (nestedMessage) {
        return nestedMessage
      }
    }

    return undefined
  }

  for (const value of Object.values(error)) {
    const nestedMessage = getFirstErrorMessage(value)

    if (nestedMessage) {
      return nestedMessage
    }
  }

  return undefined
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 flex-wrap gap-1.5 rounded-md border border-input bg-input px-3 py-2">
        {value.length === 0 && (
          <span className="self-center text-sm text-muted-foreground">Sin etiquetas</span>
        )}
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="gap-1 border-brand-soft/40 bg-brand-soft/10 pr-1 text-brand-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-brand-soft/20"
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
              <div className="px-2 py-2 text-xs text-muted-foreground">
                Aun no hay etiquetas guardadas.
              </div>
            ) : (
              availableTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={hasTag(tag)}
                  onCheckedChange={() => toggle(tag)}
                  onSelect={(selectEvent) => selectEvent.preventDefault()}
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
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nueva etiqueta (Enter)"
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => add()}
            disabled={!normalizeTrainingTagLabel(input) || hasTag(input)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {tagsQuery.isError ? (
        <div className="flex items-center gap-2 text-xs text-status-error">
          <span>
            {getApiErrorMessage(tagsQuery.error, 'No se han podido cargar las etiquetas existentes')}
            .
          </span>
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
        <p className="text-xs text-muted-foreground">
          Aun no hay etiquetas guardadas. Puedes crear la primera.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Selecciona etiquetas existentes o crea una nueva.
        </p>
      )}

      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}

function TrainingTypesField({ value, onChange, error }: TrainingTypesFieldProps) {
  const [input, setInput] = useState('')
  const trainingTypesQuery = useTrainingTypes()
  const availableTypes = trainingTypesQuery.data ?? []
  const resolvedTypes = normalizeTrainingTypes([...value, ...availableTypes])

  const hasType = (type: string) => {
    const typeKey = getTrainingTypeKey(type)
    return value.some((currentType) => getTrainingTypeKey(currentType) === typeKey)
  }

  const add = (rawType = input) => {
    const normalizedType = normalizeTrainingTypeLabel(rawType)

    if (!normalizedType || hasType(normalizedType)) {
      setInput('')
      return
    }

    onChange(normalizeTrainingTypes([...value, normalizedType]))
    setInput('')
  }

  const remove = (type: string) => {
    const typeKey = getTrainingTypeKey(type)
    onChange(value.filter((currentType) => getTrainingTypeKey(currentType) !== typeKey))
  }

  const toggle = (type: string) => {
    const normalizedType = normalizeTrainingTypeLabel(type)

    if (!normalizedType) {
      return
    }

    if (hasType(normalizedType)) {
      remove(normalizedType)
      return
    }

    onChange(normalizeTrainingTypes([...value, normalizedType]))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 flex-wrap gap-1.5 rounded-md border border-input bg-input px-3 py-2">
        {value.length === 0 ? (
          <span className="self-center text-sm text-muted-foreground">Sin tipos</span>
        ) : (
          value.map((type) => (
            <Badge
              key={type}
              variant="outline"
              className={getTrainingTypeBadgeClass(type)}
            >
              {getTrainingTypeLabel(type)}
              <button
                type="button"
                onClick={() => remove(type)}
                className="ml-1 rounded-full p-0.5 hover:bg-foreground/10"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="sm:w-auto">
              Tipos existentes
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-60 overflow-y-auto">
            <DropdownMenuLabel>Tipos guardados</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {trainingTypesQuery.isLoading ? (
              <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                <LoaderCircle className="h-3 w-3 animate-spin" />
                Cargando tipos...
              </div>
            ) : trainingTypesQuery.isError ? (
              <div className="px-2 py-2 text-xs text-status-error">
                {getApiErrorMessage(trainingTypesQuery.error, 'No se han podido cargar los tipos')}
              </div>
            ) : resolvedTypes.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                Aun no hay tipos guardados.
              </div>
            ) : (
              resolvedTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={hasType(type)}
                  onCheckedChange={() => toggle(type)}
                  onSelect={(selectEvent) => selectEvent.preventDefault()}
                >
                  {getTrainingTypeLabel(type)}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-1 gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nuevo tipo (Enter)"
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => add()}
            disabled={!normalizeTrainingTypeLabel(input) || hasType(input)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {trainingTypesQuery.isError ? (
        <div className="flex items-center gap-2 text-xs text-status-error">
          <span>
            {getApiErrorMessage(trainingTypesQuery.error, 'No se han podido cargar los tipos existentes')}
            .
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0 text-xs"
            onClick={() => trainingTypesQuery.refetch()}
          >
            Reintentar
          </Button>
        </div>
      ) : trainingTypesQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando tipos existentes...</p>
      ) : resolvedTypes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aun no hay tipos guardados. Puedes crear el primero.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Selecciona varios tipos existentes o crea nuevos.
        </p>
      )}

      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}

function AccentColorField({ value, onChange, error }: AccentColorFieldProps) {
  const normalizedColor = normalizeTrainingAccentColor(value)
  const previewStyle = getTrainingAccentStyle(normalizedColor, 'solid')

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Preview del color</p>
            <p className="text-xs text-muted-foreground">
              {normalizedColor ?? 'Se usara fallback temporal por tipo en datos legacy.'}
            </p>
          </div>
          <div
            className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={
              previewStyle ?? {
                borderColor: 'rgba(197, 227, 132, 0.24)',
                backgroundColor: 'rgba(197, 227, 132, 0.08)',
                color: '#C5E384',
              }
            }
          >
            Vista previa
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {TRAINING_ACCENT_SWATCHES.map((swatch) => {
          const isSelected = normalizedColor === swatch

          return (
            <button
              key={swatch}
              type="button"
              onClick={() => onChange(swatch)}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-card px-2 py-3 transition-colors hover:border-brand-primary/50"
            >
              <span
                className="h-8 w-8 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: swatch }}
              />
              <span
                className={`text-[10px] font-medium ${
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {swatch.replace('#', '')}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-[88px_minmax(0,1fr)_auto]">
        <label className="flex items-center justify-center rounded-md border border-input bg-input p-1">
          <input
            type="color"
            value={normalizedColor ?? '#C5E384'}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 w-full cursor-pointer rounded border-0 bg-transparent"
          />
        </label>

        <Input
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
          placeholder="#C5E384"
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(null)}
          disabled={!value}
        >
          Limpiar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Usa swatches, picker o hex. El preview ajusta contraste del texto automaticamente.
      </p>

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

  const dialogTitle = isEditing
    ? 'Editar entrenamiento'
    : isDuplicate
      ? 'Duplicar entrenamiento'
      : 'Nuevo entrenamiento'
  const dialogDescription = isEditing
    ? 'Modifica los campos y guarda los cambios.'
    : isDuplicate
      ? 'Se creara una copia del entrenamiento con el mismo contenido.'
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
          toast.success(
            isDuplicate
              ? 'Entrenamiento duplicado correctamente'
              : 'Entrenamiento creado correctamente'
          )
        }

        onSaved?.()
        onOpenChange(false)
      } catch (error) {
        if (isApprovalPendingError(error)) {
          onOpenChange(false)
          return
        }

        const action = isEditing ? 'actualizar' : 'crear'
        toast.error(getApiErrorMessage(error, `No se ha podido ${action} el entrenamiento`))
      }
    },
    (errors) => {
      toast.error(
        getFirstErrorMessage(errors) ?? 'Revisa los campos obligatorios antes de continuar'
      )

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
    }
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
            <div ref={generalSectionRef} className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Informacion general
              </p>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Full Body Fuerza + Cardio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <FormField
                  control={form.control}
                  name="types"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Tipos</FormLabel>
                      <FormControl>
                        <TrainingTypesField
                          value={field.value}
                          onChange={field.onChange}
                          error={fieldState.error?.message}
                        />
                      </FormControl>
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

              <FormField
                control={form.control}
                name="accentColor"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Color visual</FormLabel>
                    <FormControl>
                      <AccentColorField
                        value={field.value}
                        onChange={field.onChange}
                        error={fieldState.error?.message}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="estimated_duration_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duracion estimada (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="45"
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === '' ? null : parseInt(event.target.value, 10)
                            )
                          }
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
                      <FormLabel>Calorias estimadas (kcal)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="300"
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === '' ? null : parseInt(event.target.value, 10)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Etiquetas</FormLabel>
                    <FormControl>
                      <TagsField
                        value={field.value}
                        onChange={field.onChange}
                        error={fieldState.error?.message}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div ref={warmupSectionRef} className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Calentamiento y vuelta a la calma
              </p>

              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <FormField
                  control={form.control}
                  name="warmup_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripcion calentamiento</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={2}
                          placeholder="Describe el calentamiento..."
                          className="flex w-full resize-none rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                      <FormLabel>Duracion (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="10"
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === '' ? null : parseInt(event.target.value, 10)
                            )
                          }
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
                    <FormLabel>Descripcion vuelta a la calma</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={2}
                        placeholder="Describe la vuelta a la calma..."
                        className="flex w-full resize-none rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

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
                        error={getFirstErrorMessage(form.formState.errors.exercises)}
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
                  ? isEditing
                    ? 'Guardando...'
                    : isDuplicate
                      ? 'Creando copia...'
                      : 'Creando...'
                  : isEditing
                    ? 'Guardar cambios'
                    : isDuplicate
                      ? 'Crear copia'
                      : 'Crear entrenamiento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

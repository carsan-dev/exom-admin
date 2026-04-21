import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { X, Plus, ChevronDown } from 'lucide-react'
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
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
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
import { isApprovalPendingError } from '@/lib/api-utils'
import { getApiErrorMessage, useCreateExercise, useUpdateExercise } from '../api'
import { exerciseSchema, type ExerciseFormValues } from '../schemas'
import {
  EQUIPMENT_OPTIONS,
  LEVEL_LABELS,
  LEVEL_OPTIONS,
  MUSCLE_GROUPS,
  type Exercise,
} from '../types'
import { ImageUploadField } from '@/components/uploads/image-upload-field'
import { VideoUploadField } from './video-upload-field'

interface ExerciseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercise?: Exercise | null
  isDuplicate?: boolean
  onSaved?: () => void
}

const defaultValues: ExerciseFormValues = {
  name: '',
  muscle_groups: [],
  equipment: [],
  level: 'PRINCIPIANTE',
  video_url: '',
  video_stream_id: '',
  thumbnail_url: '',
  technique_text: '',
  common_errors_text: '',
  explanation_text: '',
}

function toFormValues(exercise: Exercise, isDuplicate: boolean): ExerciseFormValues {
  return {
    name: isDuplicate ? `${exercise.name} (copia)` : exercise.name,
    muscle_groups: exercise.muscle_groups,
    equipment: exercise.equipment,
    level: exercise.level,
    video_url: exercise.video_url ?? '',
    video_stream_id: exercise.video_stream_id ?? '',
    thumbnail_url: exercise.thumbnail_url ?? '',
    technique_text: exercise.technique_text ?? '',
    common_errors_text: exercise.common_errors_text ?? '',
    explanation_text: exercise.explanation_text ?? '',
  }
}

// Multi-select with chips and custom input
interface MultiSelectFieldProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  options: readonly string[]
  placeholder: string
  error?: string
}

function MultiSelectField({ label, value, onChange, options, placeholder, error }: MultiSelectFieldProps) {
  const [customInput, setCustomInput] = useState('')

  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  const remove = (option: string) => {
    onChange(value.filter((v) => v !== option))
  }

  const addCustom = () => {
    const trimmed = customInput.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setCustomInput('')
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustom()
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium leading-none">{label}</p>

      <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-input px-3 py-2 min-h-10">
        {value.length === 0 && (
          <span className="text-sm text-muted-foreground self-center">{placeholder}</span>
        )}
        {value.map((item) => (
          <Badge key={item} variant="outline" className="gap-1 border-brand-soft/40 bg-brand-soft/10 text-brand-primary pr-1">
            {item}
            <button
              type="button"
              onClick={() => remove(item)}
              className="ml-0.5 rounded-full hover:bg-brand-soft/20 p-0.5"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="flex-none">
              Opciones
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-60 overflow-y-auto w-48">
            {options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option}
                checked={value.includes(option)}
                onCheckedChange={() => toggle(option)}
              >
                {option}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleCustomKeyDown}
          placeholder="Otro (Enter para añadir)"
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCustom}
          disabled={!customInput.trim()}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}

export function ExerciseFormDialog({ open, onOpenChange, exercise, isDuplicate = false, onSaved }: ExerciseFormDialogProps) {
  const isEditing = Boolean(exercise) && !isDuplicate
  const createExercise = useCreateExercise()
  const updateExercise = useUpdateExercise()
  const isPending = createExercise.isPending || updateExercise.isPending

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
    } else if (exercise) {
      form.reset(toFormValues(exercise, isDuplicate))
    }
  }, [form, open, exercise, isDuplicate])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEditing && exercise) {
        await updateExercise.mutateAsync({ id: exercise.id, values })
        toast.success('Ejercicio actualizado correctamente')
      } else {
        await createExercise.mutateAsync(values)
        toast.success(isDuplicate ? 'Ejercicio duplicado correctamente' : 'Ejercicio creado correctamente')
      }
      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      if (isApprovalPendingError(error)) {
        onOpenChange(false)
        return
      }

      const action = isEditing ? 'actualizar' : 'crear'
      toast.error(getApiErrorMessage(error, `No se ha podido ${action} el ejercicio`))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle>{isEditing ? 'Editar ejercicio' : isDuplicate ? 'Duplicar ejercicio' : 'Nuevo ejercicio'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los campos del ejercicio y guarda los cambios.'
              : isDuplicate
                ? 'Se creará una copia del ejercicio con el mismo contenido.'
                : 'Rellena los datos del nuevo ejercicio para añadirlo al catálogo.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
            {/* Name + Level */}
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Press de banca" {...field} />
                    </FormControl>
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

            {/* Muscle groups */}
            <FormField
              control={form.control}
              name="muscle_groups"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <MultiSelectField
                      label="Grupos musculares"
                      value={field.value}
                      onChange={field.onChange}
                      options={MUSCLE_GROUPS}
                      placeholder="Selecciona grupos musculares..."
                      error={form.formState.errors.muscle_groups?.message}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Equipment */}
            <FormField
              control={form.control}
              name="equipment"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <MultiSelectField
                      label="Equipamiento"
                      value={field.value}
                      onChange={field.onChange}
                      options={EQUIPMENT_OPTIONS}
                      placeholder="Selecciona equipamiento..."
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Video */}
            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <VideoUploadField
                      label="Video"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onThumbnailChange={(url) => form.setValue('thumbnail_url', url)}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Thumbnail */}
            <FormField
              control={form.control}
              name="thumbnail_url"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUploadField
                      label="Thumbnail"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      fileKeyPrefix="exercises/thumbnails"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Technique */}
            <FormField
              control={form.control}
              name="technique_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Técnica</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={3}
                      placeholder="Describe la técnica correcta..."
                      className="flex w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Common errors */}
            <FormField
              control={form.control}
              name="common_errors_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Errores comunes</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={3}
                      placeholder="Describe los errores más frecuentes..."
                      className="flex w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Explanation */}
            <FormField
              control={form.control}
              name="explanation_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explicación</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={3}
                      placeholder="Explicación adicional del ejercicio..."
                      className="flex w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditing ? 'Guardando...' : isDuplicate ? 'Creando copia...' : 'Creando...'
                  : isEditing ? 'Guardar cambios' : isDuplicate ? 'Crear copia' : 'Crear ejercicio'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

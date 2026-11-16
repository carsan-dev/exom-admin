import { toFormValues } from '../training-form-values'
import { RirProposalEditor } from './rir-proposal-editor'
import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { clearUnsavedChanges, useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { toast } from 'sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { isApprovalPendingError } from '@/lib/api-utils'
import { getApiErrorMessage, useCreateTraining, useUpdateTraining } from '../api'
import { trainingSchema, type TrainingFormValues } from '../schemas'
import { DEFAULT_TRAINING_TYPE, type Training } from '../types'
import { getFirstErrorMessage } from './training-form-errors'
import { TrainingFormExercisesSection } from './training-form-exercises-section'
import { TrainingFormFooter } from './training-form-footer'
import { TrainingFormGeneralFields } from './training-form-general-fields'
import { TrainingFormHeader } from './training-form-header'
import { TrainingFormWarmupFields } from './training-form-warmup-fields'

interface TrainingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  training?: Training | null
  isDuplicate?: boolean
  importedValues?: TrainingFormValues | null
  importIssues?: string[]
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
  items: [],
}

export function TrainingFormDialog({
  open,
  onOpenChange,
  training,
  isDuplicate = false,
  importedValues,
  importIssues = [],
  onSaved,
}: TrainingFormDialogProps) {
  const isEditing = Boolean(training) && !isDuplicate
  const createTraining = useCreateTraining()
  const updateTraining = useUpdateTraining()
  const isPending = createTraining.isPending || updateTraining.isPending
  const generalSectionRef = useRef<HTMLDivElement | null>(null)
  const warmupSectionRef = useRef<HTMLDivElement | null>(null)
  const exercisesSectionRef = useRef<HTMLDivElement | null>(null)
  const dialogContentRef = useRef<HTMLDivElement | null>(null)
  const [colorInputInstanceKey, setColorInputInstanceKey] = useState(0)

  const dialogTitle = isEditing
    ? 'Editar entrenamiento'
    : isDuplicate
      ? 'Duplicar entrenamiento'
      : importedValues
        ? 'Importar entrenamiento'
        : 'Nuevo entrenamiento'
  const dialogDescription = isEditing
    ? 'Modifica los campos y guarda los cambios.'
    : isDuplicate
      ? 'Se creará una copia del entrenamiento con el mismo contenido.'
      : importedValues
        ? 'Revisa los datos importados antes de crear el entrenamiento.'
        : 'Rellena los datos del nuevo entrenamiento.'

  const form = useForm<TrainingFormValues>({
    resolver: zodResolver(trainingSchema),
    defaultValues,
  })
  useUnsavedChanges('training-form', open && (form.formState.isDirty || isPending))

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
      return
    }

    setColorInputInstanceKey((current) => current + 1)
    requestAnimationFrame(() => {
      dialogContentRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    })

    if (training) {
      form.reset(toFormValues(training, isDuplicate))
      return
    }

    if (importedValues) {
      form.reset(importedValues)
      return
    }

    form.reset(defaultValues)
  }, [form, open, training, isDuplicate, importedValues])

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

        form.reset(values)
        clearUnsavedChanges('training-form')
        onOpenChange(false)
        window.setTimeout(() => onSaved?.(), 0)
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

      if (errors.items) {
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
      <DialogContent
        disableOutsideClose
        ref={dialogContentRef}
        className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto p-4 sm:max-w-2xl sm:p-6"
      >
        <TrainingFormHeader
          title={dialogTitle}
          description={dialogDescription}
          importIssues={importIssues}
        />

        <Form {...form}>
          <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
            <TrainingFormGeneralFields
              form={form}
              sectionRef={generalSectionRef}
              colorInputInstanceKey={colorInputInstanceKey}
            />

            <Separator />

            <TrainingFormWarmupFields form={form} sectionRef={warmupSectionRef} />

            <Separator />

            <TrainingFormExercisesSection form={form} sectionRef={exercisesSectionRef} />

            <RirProposalEditor form={form} />
            <TrainingFormFooter
              isPending={isPending}
              isEditing={isEditing}
              isDuplicate={isDuplicate}
              onCancel={() => onOpenChange(false)}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

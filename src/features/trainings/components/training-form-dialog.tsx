import { toFormValues } from '../training-form-values'
import { RirProposalEditor } from './rir-proposal-editor'
import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { clearUnsavedChanges, useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { toast } from 'sonner'
import { Form } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Workbench } from '@/components/workspace/workbench'
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

const FORM_ID = 'training-form-dialog'

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
    <Workbench
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      disableOutsideClose
      footer={
        <TrainingFormFooter
          formId={FORM_ID}
          isPending={isPending}
          isEditing={isEditing}
          isDuplicate={isDuplicate}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <TrainingFormHeader importIssues={importIssues} />

        <Form {...form}>
          <form id={FORM_ID} onSubmit={handleSubmit} className="min-w-0">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] lg:gap-0">
              <div className="min-w-0 space-y-8 lg:pr-10">
                <TrainingFormGeneralFields
                  form={form}
                  sectionRef={generalSectionRef}
                  colorInputInstanceKey={colorInputInstanceKey}
                />

                <Separator />

                <TrainingFormWarmupFields form={form} sectionRef={warmupSectionRef} />
              </div>

              <div className="min-w-0 space-y-8 border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
                <TrainingFormExercisesSection form={form} sectionRef={exercisesSectionRef} />

                <RirProposalEditor form={form} />
              </div>
            </div>
          </form>
        </Form>
      </div>
    </Workbench>
  )
}

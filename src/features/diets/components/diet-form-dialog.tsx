import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { clearUnsavedChanges, useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { toast } from 'sonner'
import { Form } from '@/components/ui/form'
import { Workbench } from '@/components/workspace/workbench'
import { isApprovalPendingError } from '@/lib/api-utils'
import { getApiErrorMessage, useCreateDiet, useIngredientsList, useUpdateDiet } from '../api'
import { defaultMeal, defaultValues, toFormValues } from '../diet-form-values'
import { roundMacros, sumDeclaredMealMacros, sumIngredientMacros } from '../diet-nutrition-summary'
import { dietSchema, type DietFormValues } from '../schemas'
import type { Diet } from '../types'
import { getFirstErrorMessage } from './diet-form-errors'
import { DietFormFooter } from './diet-form-footer'
import { DietFormGeneralFields } from './diet-form-general-fields'
import { DietImportIssues } from './diet-import-issues'
import { DietMealsSection } from './diet-meals-section'

interface DietFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  diet?: Diet | null
  isDuplicate?: boolean
  importedValues?: DietFormValues | null
  importIssues?: string[]
  onSaved?: () => void
}

const FORM_ID = 'diet-form-dialog'

export function DietFormDialog({
  open,
  onOpenChange,
  diet,
  isDuplicate = false,
  importedValues,
  importIssues = [],
  onSaved,
}: DietFormDialogProps) {
  const isEditing = Boolean(diet) && !isDuplicate
  const createDiet = useCreateDiet()
  const updateDiet = useUpdateDiet()
  const isPending = createDiet.isPending || updateDiet.isPending
  const [uploadingMealFieldIds, setUploadingMealFieldIds] = useState<Set<string>>(() => new Set())
  const isUploadingMealImage = uploadingMealFieldIds.size > 0
  const isBusy = isPending || isUploadingMealImage
  const mealsSectionRef = useRef<HTMLDivElement | null>(null)

  // Pre-fetch ingredients list so it's ready when picker opens
  const ingredientsQuery = useIngredientsList({ enabled: open })
  const ingredientsData = ingredientsQuery.data

  const dialogTitle = isEditing
    ? 'Editar dieta'
    : isDuplicate
      ? 'Duplicar dieta'
      : importedValues
        ? 'Importar dieta'
        : 'Nueva dieta'
  const dialogDescription = isEditing
    ? 'Modifica los campos y guarda los cambios.'
    : isDuplicate
      ? 'Se copiará el contenido. Por seguridad, vuelve a adjuntar las imágenes de comidas.'
      : importedValues
        ? 'Revisa los datos importados antes de crear la dieta.'
        : 'Rellena los datos de la nueva dieta.'

  const form = useForm<DietFormValues>({
    resolver: zodResolver(dietSchema),
    defaultValues,
  })
  useUnsavedChanges('diet-form', open && (form.formState.isDirty || isBusy))

  const {
    fields: mealFields,
    append,
    remove,
    move,
  } = useFieldArray({
    control: form.control,
    name: 'meals',
  })

  useEffect(() => {
    if (!open) {
      setUploadingMealFieldIds(new Set())
      form.reset(defaultValues)
      return
    }

    setUploadingMealFieldIds(new Set())

    if (diet) {
      form.reset(toFormValues(diet, isDuplicate))
      return
    }

    if (importedValues) {
      form.reset(importedValues)
      return
    }

    form.reset(defaultValues)
  }, [form, open, diet, isDuplicate, importedValues])

  const calculateDietMacros = () => {
    const totals = roundMacros(sumDeclaredMealMacros(form.getValues('meals')))
    form.setValue('total_calories', totals.calories)
    form.setValue('total_protein_g', totals.protein_g)
    form.setValue('total_carbs_g', totals.carbs_g)
    form.setValue('total_fat_g', totals.fat_g)
  }

  const calculateMealMacrosAtPath = (path: `meals.${number}` | `meals.${number}.variants.${number}`) => {
    const items = form.getValues(`${path}.ingredients` as 'meals.0.ingredients')

    if (items.length === 0) {
      toast.info('Agrega ingredientes a la comida para calcular sus macros.')
      return
    }

    if (ingredientsQuery.isLoading) {
      toast.info('Espera a que cargue el catálogo de ingredientes antes de recalcular los macros.')
      return
    }

    if (ingredientsQuery.isError) {
      toast.error(
        'No se pudo cargar el catálogo de ingredientes. Reinténtalo o completa los macros manualmente.'
      )
      return
    }

    if (!ingredientsData) {
      const message =
        createDiet.isPending || updateDiet.isPending
          ? 'Espera a que termine el guardado antes de recalcular los macros.'
          : 'Espera a que cargue el catálogo de ingredientes antes de recalcular los macros.'
      toast.info(message)
      return
    }

    const ingredientMap = new Map((ingredientsData?.data ?? []).map((ing) => [ing.id, ing]))

    const { totals, calculatedItems, omittedItems, missingItems } = sumIngredientMacros(
      items,
      ingredientMap
    )

    if (calculatedItems === 0) {
      if (missingItems > 0) {
        toast.info(
          `No se pudo calcular porque ${missingItems} ingrediente${missingItems === 1 ? '' : 's'} no está${missingItems === 1 ? '' : 'n'} disponible${missingItems === 1 ? '' : 's'} en el catálogo cargado. Revísalo o completa los macros manualmente.`
        )
        return
      }

      toast.info(
        'El autocálculo necesita gramos o equivalentes en gramos para calcular los macros.'
      )
      return
    }

    const rounded = roundMacros(totals)
    form.setValue(`${path}.calories` as 'meals.0.calories', rounded.calories)
    form.setValue(`${path}.protein_g` as 'meals.0.protein_g', rounded.protein_g)
    form.setValue(`${path}.carbs_g` as 'meals.0.carbs_g', rounded.carbs_g)
    form.setValue(`${path}.fat_g` as 'meals.0.fat_g', rounded.fat_g)

    const warnings: string[] = []

    if (missingItems > 0) {
      warnings.push(
        `${missingItems} ingrediente${missingItems === 1 ? '' : 's'} no está${missingItems === 1 ? '' : 'n'} disponible${missingItems === 1 ? '' : 's'} en el catálogo cargado`
      )
    }

    if (omittedItems > 0) {
      warnings.push(
        `${omittedItems} ingrediente${omittedItems === 1 ? '' : 's'} sin equivalente en gramos quedó${omittedItems === 1 ? '' : 'ron'} fuera`
      )
    }

    if (warnings.length > 0) {
      toast.info(
        `Se calcularon solo los ingredientes con gramos o equivalente. ${warnings.join('. ')}. Completa esos equivalentes o los macros manualmente.`
      )
    }
  }

  const calculateMealMacros = (mealIndex: number) => {
    calculateMealMacrosAtPath(`meals.${mealIndex}`)
  }

  const addMeal = () => {
    const order = mealFields.length
    append({ ...defaultMeal, order })
    setTimeout(() => {
      mealsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 50)
  }

  const handleMealUploadChange = (fieldId: string, uploading: boolean) => {
    setUploadingMealFieldIds((current) => {
      if (uploading) {
        if (current.has(fieldId)) return current

        const next = new Set(current)
        next.add(fieldId)
        return next
      }

      if (!current.has(fieldId)) return current

      const next = new Set(current)
      next.delete(fieldId)
      return next
    })
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (isBusy) return
    onOpenChange(nextOpen)
  }

  const handleSubmit = form.handleSubmit(
    async (values) => {
      if (isUploadingMealImage) {
        toast.info('Espera a que termine la subida de la imagen antes de guardar la dieta.')
        return
      }

      // Update order fields
      const normalizedValues: DietFormValues = {
        ...values,
        meals: values.meals.map((meal, i) => ({
          ...meal,
          order: i,
          variants: (meal.variants ?? []).map((variant, variantIndex) => ({
            ...variant,
            type: variant.type || meal.type,
            order: variantIndex,
          })),
        })),
      }

      try {
        if (isEditing && diet) {
          await updateDiet.mutateAsync({ id: diet.id, values: normalizedValues })
          toast.success('Dieta actualizada correctamente')
        } else {
          await createDiet.mutateAsync(normalizedValues)
          toast.success(
            isDuplicate ? 'Dieta duplicada correctamente' : 'Dieta creada correctamente'
          )
        }
        form.reset(values)
        clearUnsavedChanges('diet-form')
        onSaved?.()
        onOpenChange(false)
      } catch (error) {
        if (isApprovalPendingError(error)) {
          handleDialogOpenChange(false)
          return
        }

        const action = isEditing ? 'actualizar' : 'crear'
        toast.error(getApiErrorMessage(error, `No se ha podido ${action} la dieta`))
      }
    },
    (errors) => {
      toast.error(
        getFirstErrorMessage(errors) ?? 'Revisa los campos obligatorios antes de continuar'
      )
      if (errors.meals) {
        mealsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  )

  return (
    <Workbench
      open={open}
      onOpenChange={handleDialogOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      disableOutsideClose
      footer={
        <DietFormFooter
          formId={FORM_ID}
          isPending={isPending}
          isEditing={isEditing}
          isDuplicate={isDuplicate}
          isUploadingMealImage={isUploadingMealImage}
          isBusy={isBusy}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {importIssues.length > 0 && <DietImportIssues issues={importIssues} />}

        <Form {...form}>
          <form id={FORM_ID} onSubmit={handleSubmit} className="min-w-0">
            <fieldset disabled={isBusy} className="min-w-0">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] lg:gap-0">
                <div className="min-w-0 lg:pr-10">
                  <DietFormGeneralFields form={form} onCalculateDietMacros={calculateDietMacros} />
                </div>

                <div className="min-w-0 border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
                  <DietMealsSection
                    form={form}
                    sectionRef={mealsSectionRef}
                    mealFields={mealFields}
                    isBusy={isBusy}
                    onMove={move}
                    onRemove={remove}
                    onAddMeal={addMeal}
                    onCalculateMealMacros={calculateMealMacros}
                    onCalculateMacrosAtPath={calculateMealMacrosAtPath}
                    onUploadingChange={handleMealUploadChange}
                  />
                </div>
              </div>
            </fieldset>
          </form>
        </Form>
      </div>
    </Workbench>
  )
}

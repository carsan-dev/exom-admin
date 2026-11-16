import { useCallback, useMemo, type RefObject } from 'react'
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
import { Plus } from 'lucide-react'
import { SortableItem, SortableList } from '@/components/sortable'
import { Button } from '@/components/ui/button'
import type { DietFormValues } from '../schemas'
import { DietMealCard } from './diet-meal-card'

interface DietMealsSectionProps {
  form: UseFormReturn<DietFormValues>
  sectionRef: RefObject<HTMLDivElement | null>
  mealFields: FieldArrayWithId<DietFormValues, 'meals', 'id'>[]
  isBusy: boolean
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
  onAddMeal: () => void
  onCalculateMealMacros: (mealIndex: number) => void
  onCalculateMacrosAtPath: (path: `meals.${number}` | `meals.${number}.variants.${number}`) => void
  onUploadingChange: (fieldId: string, uploading: boolean) => void
}

export function DietMealsSection({
  form,
  sectionRef,
  mealFields,
  isBusy,
  onMove,
  onRemove,
  onAddMeal,
  onCalculateMealMacros,
  onCalculateMacrosAtPath,
  onUploadingChange,
}: DietMealsSectionProps) {
  // Ids estables de useFieldArray: no forman parte del valor del formulario ni del payload.
  const mealIds = useMemo(() => mealFields.map((mealField) => mealField.id), [mealFields])
  const getMealLabel = useCallback(
    (id: string) => {
      const index = mealIds.indexOf(id)
      const name = index >= 0 ? form.getValues(`meals.${index}.name`)?.trim() : ''
      return `la comida ${name || index + 1}`
    },
    [form, mealIds]
  )

  return (
    <div ref={sectionRef} className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="font-display text-xl font-extrabold uppercase leading-none text-foreground">
          Comidas ({mealFields.length})
        </p>
        {form.formState.errors.meals?.root && (
          <p className="text-xs text-status-error">{form.formState.errors.meals.root.message}</p>
        )}
        {form.formState.errors.meals?.message && (
          <p className="text-xs text-status-error">{form.formState.errors.meals.message}</p>
        )}
      </div>

      <div className="divide-y divide-border border-y border-border">
        <SortableList ids={mealIds} getLabel={getMealLabel} onReorder={onMove}>
          {mealFields.map((mealField, mealIndex) => (
            <SortableItem key={mealField.id} id={mealField.id} disabled={isBusy}>
              <DietMealCard
                form={form}
                mealIndex={mealIndex}
                mealFieldId={mealField.id}
                mealCount={mealFields.length}
                isBusy={isBusy}
                onMove={onMove}
                onRemove={onRemove}
                onCalculateMealMacros={onCalculateMealMacros}
                onCalculateMacrosAtPath={onCalculateMacrosAtPath}
                onUploadingChange={onUploadingChange}
              />
            </SortableItem>
          ))}
        </SortableList>
      </div>

      <Button type="button" variant="outline" size="sm" className="w-full max-md:h-11" onClick={onAddMeal}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Agregar comida
      </Button>
    </div>
  )
}

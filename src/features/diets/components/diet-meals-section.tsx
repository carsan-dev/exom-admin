import type { RefObject } from 'react'
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
import { Plus } from 'lucide-react'
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
  return (
    <div ref={sectionRef} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Comidas ({mealFields.length})
        </p>
        {form.formState.errors.meals?.root && (
          <p className="text-xs text-status-error">{form.formState.errors.meals.root.message}</p>
        )}
        {form.formState.errors.meals?.message && (
          <p className="text-xs text-status-error">{form.formState.errors.meals.message}</p>
        )}
      </div>

      {mealFields.map((mealField, mealIndex) => (
        <DietMealCard
          key={mealField.id}
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
      ))}

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={onAddMeal}>
        <Plus className="h-4 w-4" />
        Agregar comida
      </Button>
    </div>
  )
}

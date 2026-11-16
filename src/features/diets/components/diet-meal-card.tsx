import { useWatch, type UseFormReturn } from 'react-hook-form'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { ImageUploadField } from '@/components/uploads/image-upload-field'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DietFormValues } from '../schemas'
import { MEAL_TYPE_LABELS, MEAL_TYPE_OPTIONS } from '../types'
import { BadgesField } from './diet-badges-field'
import { getFirstErrorMessage } from './diet-form-errors'
import { DietMealNutritionCheck } from './diet-nutrition-check'
import { MealVariantsEditor } from './diet-meal-variants-editor'
import { IngredientPicker } from './ingredient-picker'

interface DietMealCardProps {
  form: UseFormReturn<DietFormValues>
  mealIndex: number
  mealFieldId: string
  mealCount: number
  isBusy: boolean
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
  onCalculateMealMacros: (mealIndex: number) => void
  onCalculateMacrosAtPath: (path: `meals.${number}` | `meals.${number}.variants.${number}`) => void
  onUploadingChange: (fieldId: string, uploading: boolean) => void
}

export function DietMealCard({
  form,
  mealIndex,
  mealFieldId,
  mealCount,
  isBusy,
  onMove,
  onRemove,
  onCalculateMealMacros,
  onCalculateMacrosAtPath,
  onUploadingChange,
}: DietMealCardProps) {
  // Solo lectura, para nombrar los controles de icono con la comida a la que afectan.
  const mealName = useWatch({ control: form.control, name: `meals.${mealIndex}.name` })
  const mealLabel = mealName?.trim() || `${mealIndex + 1}`

  return (
    <div className="min-w-0 space-y-4 py-5">
      {/* Meal header */}
      <div className="flex items-start gap-2">
        <div className="flex flex-none flex-col gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 p-0 text-muted-foreground hover:text-foreground max-md:size-11"
            onClick={() => onMove(mealIndex, mealIndex - 1)}
            disabled={mealIndex === 0}
            aria-label={`Subir comida ${mealLabel}`}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 p-0 text-muted-foreground hover:text-foreground max-md:size-11"
            onClick={() => onMove(mealIndex, mealIndex + 1)}
            disabled={mealIndex === mealCount - 1}
            aria-label={`Bajar comida ${mealLabel}`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <span className="w-5 flex-none pt-2 text-center text-xs font-medium tabular-nums text-muted-foreground max-md:hidden">
          {mealIndex + 1}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row">
          <FormField
            control={form.control}
            name={`meals.${mealIndex}.type`}
            render={({ field }) => (
              <FormItem className="w-full flex-none md:w-36">
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MEAL_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs">
                        {MEAL_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`meals.${mealIndex}.name`}
            render={({ field }) => (
              <FormItem className="min-w-0 flex-1">
                <FormControl>
                  <Input placeholder="Nombre de la comida" className="h-9 text-sm" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {mealCount > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 flex-none p-0 text-muted-foreground hover:text-status-error max-md:size-11"
            onClick={() => onRemove(mealIndex)}
            aria-label={`Quitar comida ${mealLabel}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Macros de la comida */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-medium text-foreground">Macros de la comida (opcional)</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground max-md:h-11"
            onClick={() => onCalculateMealMacros(mealIndex)}
          >
            Calcular desde ingredientes
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FormField
            control={form.control}
            name={`meals.${mealIndex}.calories`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Kcal</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="500"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : parseInt(e.target.value))
                    }
                    className="h-8 text-xs"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`meals.${mealIndex}.protein_g`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Proteína (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="40"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                    }
                    className="h-8 text-xs"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`meals.${mealIndex}.carbs_g`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Carbos (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="60"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                    }
                    className="h-8 text-xs"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`meals.${mealIndex}.fat_g`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Grasa (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="20"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                    }
                    className="h-8 text-xs"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <DietMealNutritionCheck control={form.control} path={`meals.${mealIndex}`} />
      </div>

      {/* Imagen */}
      <FormField
        control={form.control}
        name={`meals.${mealIndex}.image_url`}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <ImageUploadField
                label="Imagen de la comida"
                value={field.value ?? ''}
                onChange={(url, uploadId) => {
                  field.onChange(url || null)
                  form.setValue(`meals.${mealIndex}.image_upload_id`, uploadId ?? '', {
                    shouldDirty: true,
                  })
                }}
                fileKeyPrefix="diets/meals"
                purpose="MEAL_IMAGE"
                disabled={isBusy}
                onUploadingChange={(uploading) => onUploadingChange(mealFieldId, uploading)}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {/* Badges nutricionales */}
      <FormField
        control={form.control}
        name={`meals.${mealIndex}.nutritional_badges`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Badges nutricionales (opcional)</FormLabel>
            <FormControl>
              <BadgesField value={field.value ?? []} onChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Ingredientes */}
      <FormField
        control={form.control}
        name={`meals.${mealIndex}.ingredients`}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <IngredientPicker
                value={field.value}
                onChange={field.onChange}
                error={getFirstErrorMessage(form.formState.errors.meals?.[mealIndex]?.ingredients)}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <MealVariantsEditor
        form={form}
        mealIndex={mealIndex}
        mealFieldId={mealFieldId}
        isBusy={isBusy}
        onUploadingChange={onUploadingChange}
        onCalculateMacros={onCalculateMacrosAtPath}
      />
    </div>
  )
}

import type { UseFormReturn } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { ImageUploadField } from '@/components/uploads/image-upload-field'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { defaultVariant } from '../diet-form-values'
import type { DietFormValues } from '../schemas'
import { BadgesField } from './diet-badges-field'
import { getFirstErrorMessage } from './diet-form-errors'
import { IngredientPicker } from './ingredient-picker'

export function MealVariantsEditor({
  form,
  mealIndex,
  mealFieldId,
  isBusy,
  onUploadingChange,
  onCalculateMacros,
}: {
  form: UseFormReturn<DietFormValues>
  mealIndex: number
  mealFieldId: string
  isBusy: boolean
  onUploadingChange: (fieldId: string, uploading: boolean) => void
  onCalculateMacros: (path: `meals.${number}.variants.${number}`) => void
}) {
  const variants = form.watch(`meals.${mealIndex}.variants`) ?? []
  const mealType = form.watch(`meals.${mealIndex}.type`)

  const setVariants = (nextVariants: typeof variants) => {
    form.setValue(`meals.${mealIndex}.variants`, nextVariants, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        ...defaultVariant,
        type: mealType,
        order: variants.length,
      },
    ])
  }

  const removeVariant = (variantIndex: number) => {
    setVariants(variants.filter((_, index) => index !== variantIndex))
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border/70 bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-foreground">Variantes</p>
          <p className="text-xs text-muted-foreground">
            Alternativas completas que el cliente podrá elegir en la app.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={addVariant}
        >
          <Plus className="h-3 w-3" />
          Añadir variante
        </Button>
      </div>

      {variants.map((_, variantIndex) => (
        <div
          key={`${mealFieldId}-variant-${variantIndex}`}
          className="space-y-3 rounded-md border border-border/60 bg-muted/10 p-3"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 flex-none text-center text-xs font-medium text-muted-foreground">
              {variantIndex + 1}
            </span>
            <FormField
              control={form.control}
              name={`meals.${mealIndex}.variants.${variantIndex}.name`}
              render={({ field }) => (
                <FormItem className="min-w-0 flex-1">
                  <FormControl>
                    <Input placeholder="Nombre de la variante" className="h-8 text-sm" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 flex-none p-0 text-muted-foreground hover:text-status-error"
              onClick={() => removeVariant(variantIndex)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Macros de la variante</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={() => onCalculateMacros(`meals.${mealIndex}.variants.${variantIndex}`)}
              >
                Calcular desde ingredientes
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <FormField
                control={form.control}
                name={`meals.${mealIndex}.variants.${variantIndex}.calories`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Kcal</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? null : parseInt(e.target.value))
                        }
                        className="h-7 text-xs"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`meals.${mealIndex}.variants.${variantIndex}.protein_g`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Proteína (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                        }
                        className="h-7 text-xs"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`meals.${mealIndex}.variants.${variantIndex}.carbs_g`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Carbos (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                        }
                        className="h-7 text-xs"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`meals.${mealIndex}.variants.${variantIndex}.fat_g`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Grasa (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                        }
                        className="h-7 text-xs"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name={`meals.${mealIndex}.variants.${variantIndex}.image_url`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <ImageUploadField
                    label="Imagen de la variante"
                    value={field.value ?? ''}
                    onChange={(url, uploadId) => {
                      field.onChange(url || null)
                      form.setValue(
                        `meals.${mealIndex}.variants.${variantIndex}.image_upload_id`,
                        uploadId ?? '',
                        { shouldDirty: true }
                      )
                    }}
                    fileKeyPrefix="diets/meals"
                    purpose="MEAL_IMAGE"
                    disabled={isBusy}
                    onUploadingChange={(uploading) =>
                      onUploadingChange(`${mealFieldId}-variant-${variantIndex}`, uploading)
                    }
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`meals.${mealIndex}.variants.${variantIndex}.nutritional_badges`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Badges nutricionales (opcional)</FormLabel>
                <FormControl>
                  <BadgesField value={field.value ?? []} onChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`meals.${mealIndex}.variants.${variantIndex}.ingredients`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <IngredientPicker
                    value={field.value}
                    onChange={field.onChange}
                    error={getFirstErrorMessage(
                      form.formState.errors.meals?.[mealIndex]?.variants?.[variantIndex]
                        ?.ingredients
                    )}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      ))}
    </div>
  )
}

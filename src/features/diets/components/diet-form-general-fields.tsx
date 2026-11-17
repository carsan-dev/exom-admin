import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { DietFormValues } from '../schemas'
import { DietTotalsNutritionCheck } from './diet-nutrition-check'
import { DietTagsField } from './diet-tags-field'

interface DietFormGeneralFieldsProps {
  form: UseFormReturn<DietFormValues>
  onCalculateDietMacros: () => void
}

export function DietFormGeneralFields({ form, onCalculateDietMacros }: DietFormGeneralFieldsProps) {
  return (
    <div className="min-w-0 space-y-4">
      <p className="font-display text-xl font-extrabold uppercase leading-none text-foreground">Información general</p>

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem required>
            <FormLabel>Nombre visible para el cliente</FormLabel>
            <FormControl>
              <Input placeholder="Ej. Dieta de definición" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="tags"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Etiquetas internas</FormLabel>
            <FormControl>
              <DietTagsField
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-medium">Macros totales</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground max-md:h-11"
            onClick={onCalculateDietMacros}
          >
            Calcular desde comidas
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FormField
            control={form.control}
            name="total_calories"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Kcal</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="2000"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : parseInt(e.target.value))
                    }
                    className="h-8 text-sm"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_protein_g"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Proteína (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="150"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                    }
                    className="h-8 text-sm"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_carbs_g"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Carbos (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="200"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                    }
                    className="h-8 text-sm"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_fat_g"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Grasa (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder="70"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                    }
                    className="h-8 text-sm"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <DietTotalsNutritionCheck control={form.control} />
      </div>
    </div>
  )
}

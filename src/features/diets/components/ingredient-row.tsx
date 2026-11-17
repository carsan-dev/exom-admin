import type { ChangeEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatMacroValue, type Ingredient } from '../../ingredients/types'
import { calculateIngredientMacros } from '../diet-nutrition-summary'
import { MEASURE_UNIT_LABELS, MEASURE_UNIT_OPTIONS } from '../types'
import type { MealIngredientFormValues } from '../schemas'

interface IngredientRowProps {
  item: MealIngredientFormValues
  ingredient: Ingredient | undefined
  onRemove: () => void
  onQuantityChange: (event: ChangeEvent<HTMLInputElement>) => void
  onUnitChange: (unit: string) => void
  onGramsEquivalentChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export function IngredientRow({
  item,
  ingredient,
  onRemove,
  onQuantityChange,
  onUnitChange,
  onGramsEquivalentChange,
}: IngredientRowProps) {
  // Mismo cálculo que «Calcular desde ingredientes»; sin gramos o sin catálogo no suma.
  const macros = calculateIngredientMacros(item, ingredient)

  return (
    <div data-slot="ingredient-row" className="min-w-0 space-y-2 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {ingredient ? (
            <>
              <p className="break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">{ingredient.name}</p>
              <p className="text-xs text-muted-foreground">
                P {formatMacroValue(ingredient.protein_per_100g)}g · C{' '}
                {formatMacroValue(ingredient.carbs_per_100g)}g · G{' '}
                {formatMacroValue(ingredient.fat_per_100g)}g por 100g
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">Ingrediente no encontrado</p>
          )}
        </div>
        <span
          data-slot="ingredient-kcal"
          className="flex-none whitespace-nowrap pt-0.5 text-xs font-medium tabular-nums text-foreground-secondary"
        >
          {macros ? `${Math.round(macros.calories)} kcal` : '— kcal'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 flex-none p-0 text-muted-foreground hover:text-status-error max-md:size-11"
          onClick={onRemove}
          aria-label={`Quitar ${ingredient?.name ?? 'ingrediente'}`}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Cantidad</label>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={item.quantity}
            onChange={onQuantityChange}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Unidad</label>
          <Select value={item.unit} onValueChange={onUnitChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEASURE_UNIT_OPTIONS.map((unit) => (
                <SelectItem key={unit} value={unit} className="text-xs">
                  {MEASURE_UNIT_LABELS[unit]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Equiv. gramos</label>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={item.unit === 'g' ? item.quantity : (item.grams_equivalent ?? '')}
            disabled={item.unit === 'g'}
            onChange={onGramsEquivalentChange}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  )
}

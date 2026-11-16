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
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {ingredient ? (
            <>
              <p className="text-xs font-medium text-foreground truncate">{ingredient.name}</p>
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-status-error flex-none"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
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
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Unidad</label>
          <Select value={item.unit} onValueChange={onUnitChange}>
            <SelectTrigger className="h-7 text-xs">
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
            className="h-7 text-xs"
          />
        </div>
      </div>
    </div>
  )
}

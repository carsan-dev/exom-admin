import { useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { normalizeSearchText } from '@/lib/search'
import { formatMacroValue } from '../../ingredients/types'
import { useIngredientsList } from '../api'
import { MEASURE_UNIT_LABELS, MEASURE_UNIT_OPTIONS } from '../types'
import type { MealIngredientFormValues } from '../schemas'

interface IngredientPickerProps {
  value: MealIngredientFormValues[]
  onChange: (value: MealIngredientFormValues[]) => void
  error?: string
}

export function IngredientPicker({ value, onChange, error }: IngredientPickerProps) {
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const ingredientsQuery = useIngredientsList()
  const allIngredients = ingredientsQuery.data?.data ?? []

  const ingredientsById = useMemo(
    () => new Map(allIngredients.map((ing) => [ing.id, ing])),
    [allIngredients],
  )

  const selectedIds = new Set(value.map((item) => item.ingredient_id))

  const normalizedSearch = normalizeSearchText(search.trim())
  const filteredIngredients = normalizedSearch
    ? allIngredients.filter((ing) => normalizeSearchText(ing.name).includes(normalizedSearch))
    : allIngredients

  const addIngredient = (ingredientId: string) => {
    if (selectedIds.has(ingredientId)) return
    const newItem: MealIngredientFormValues = {
      ingredient_id: ingredientId,
      quantity: 100,
      unit: 'g',
    }
    onChange([...value, newItem])
    setSearch('')
    setPickerOpen(false)
  }

  const removeIngredient = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateField = <K extends keyof MealIngredientFormValues>(
    index: number,
    field: K,
    fieldValue: MealIngredientFormValues[K],
  ) => {
    onChange(value.map((item, i) => (i === index ? { ...item, [field]: fieldValue } : item)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Ingredientes</p>
        {value.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {value.length} ingrediente{value.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        El autocálculo usa solo ingredientes en gramos. Para ml o unidades, completa los macros manualmente.
      </p>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => {
            const ingredient = ingredientsById.get(item.ingredient_id)
            return (
              <div
                key={`${item.ingredient_id}-${index}`}
                className="rounded-md border border-border/60 bg-muted/20 p-2 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {ingredient ? (
                      <>
                        <p className="text-xs font-medium text-foreground truncate">{ingredient.name}</p>
                        <p className="text-xs text-muted-foreground">
                          P {formatMacroValue(ingredient.protein_per_100g)}g · C {formatMacroValue(ingredient.carbs_per_100g)}g · G {formatMacroValue(ingredient.fat_per_100g)}g por 100g
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
                    onClick={() => removeIngredient(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Cantidad</label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={item.quantity}
                      onChange={(e) => updateField(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Unidad</label>
                    <Select
                      value={item.unit}
                      onValueChange={(val) => updateField(index, 'unit', val as MealIngredientFormValues['unit'])}
                    >
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
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pickerOpen ? (
        <div className="rounded-md border border-border/70 bg-background p-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar ingrediente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>

          {ingredientsQuery.isLoading ? (
            <p className="text-xs text-muted-foreground py-1 text-center">Cargando ingredientes...</p>
          ) : filteredIngredients.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1 text-center">
              {search ? `Sin resultados para "${search}"` : 'No hay ingredientes disponibles'}
            </p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {filteredIngredients.map((ingredient) => {
                const isSelected = selectedIds.has(ingredient.id)
                return (
                  <button
                    key={ingredient.id}
                    type="button"
                    disabled={isSelected}
                    onClick={() => addIngredient(ingredient.id)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                      isSelected
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-muted cursor-pointer',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-foreground">{ingredient.name}</p>
                      <p className="text-muted-foreground">
                        {ingredient.calories_per_100g} kcal · P {formatMacroValue(ingredient.protein_per_100g)}g · C {formatMacroValue(ingredient.carbs_per_100g)}g · G {formatMacroValue(ingredient.fat_per_100g)}g
                      </p>
                    </div>
                    {isSelected && (
                      <span className="text-xs text-muted-foreground flex-none">Ya añadido</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-muted-foreground"
            onClick={() => {
              setPickerOpen(false)
              setSearch('')
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="h-3 w-3" />
          Agregar ingrediente
        </Button>
      )}

      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}

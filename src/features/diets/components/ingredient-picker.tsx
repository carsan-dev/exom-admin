import { useId, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RequiredMark } from '@/components/ui/label'
import { normalizeSearchText } from '@/lib/search'
import { useIngredientsList } from '../api'
import type { MealIngredientFormValues } from '../schemas'
import { IngredientRow } from './ingredient-row'
import { IngredientSearchPanel } from './ingredient-search-panel'

interface IngredientPickerProps {
  value: MealIngredientFormValues[]
  onChange: (value: MealIngredientFormValues[]) => void
  error?: string
  /** Obligatorio según el esquema: asterisco visible y descripción oculta (el rol group no admite aria-required). */
  required?: boolean
}

const DEFAULT_UNIT_VALUES: Partial<
  Record<MealIngredientFormValues['unit'], { quantity: number; gramsEquivalent: number }>
> = {
  g: { quantity: 100, gramsEquivalent: 100 },
  ml: { quantity: 100, gramsEquivalent: 100 },
  piece: { quantity: 1, gramsEquivalent: 100 },
  tablespoon: { quantity: 1, gramsEquivalent: 15 },
  teaspoon: { quantity: 1, gramsEquivalent: 5 },
  handful: { quantity: 1, gramsEquivalent: 30 },
  slice: { quantity: 1, gramsEquivalent: 30 },
  palm: { quantity: 1, gramsEquivalent: 100 },
  fist: { quantity: 1, gramsEquivalent: 30 },
  ladle: { quantity: 1, gramsEquivalent: 150 },
  cold_cut_slice: { quantity: 1, gramsEquivalent: 20 },
  glass: { quantity: 1, gramsEquivalent: 250 },
  cup: { quantity: 1, gramsEquivalent: 240 },
  bowl: { quantity: 1, gramsEquivalent: 250 },
  finger: { quantity: 1, gramsEquivalent: 60 },
  pinch: { quantity: 1, gramsEquivalent: 0.5 },
  serving: { quantity: 1, gramsEquivalent: 100 },
  to_taste: { quantity: 1, gramsEquivalent: 1 },
}

export function IngredientPicker({ value, onChange, error, required = false }: IngredientPickerProps) {
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const errorId = useId()
  const requiredId = useId()
  const describedBy =
    [error ? errorId : null, required ? requiredId : null].filter(Boolean).join(' ') || undefined
  const ingredientsQuery = useIngredientsList()
  const allIngredients = useMemo(() => ingredientsQuery.data?.data ?? [], [ingredientsQuery.data?.data])

  const ingredientsById = useMemo(
    () => new Map(allIngredients.map((ing) => [ing.id, ing])),
    [allIngredients]
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
      grams_equivalent: 100,
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
    fieldValue: MealIngredientFormValues[K]
  ) => {
    onChange(value.map((item, i) => (i === index ? { ...item, [field]: fieldValue } : item)))
  }

  const updateItem = (index: number, patch: Partial<MealIngredientFormValues>) => {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const updateUnit = (index: number, unit: MealIngredientFormValues['unit']) => {
    const defaults = DEFAULT_UNIT_VALUES[unit]

    onChange(
      value.map((item, i) =>
        i === index
          ? {
              ...item,
              unit,
              ...(defaults
                ? {
                    quantity: defaults.quantity,
                    grams_equivalent: defaults.gramsEquivalent,
                  }
                : {}),
            }
          : item
      )
    )
  }

  return (
    <div
      role="group"
      aria-label="Ingredientes"
      aria-describedby={describedBy}
      className="min-w-0 space-y-2"
    >
      {required ? (
        <span id={requiredId} hidden>
          Campo obligatorio
        </span>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          Ingredientes
          {required ? <RequiredMark /> : null}
        </p>
        {value.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {value.length} ingrediente{value.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Para medidas caseras, añade el equivalente en gramos para calcular macros correctamente.
      </p>

      {value.length > 0 && (
        <div className="divide-y divide-border border-t border-border">
          {value.map((item, index) => (
            <IngredientRow
              key={`${item.ingredient_id}-${index}`}
              item={item}
              ingredient={ingredientsById.get(item.ingredient_id)}
              onRemove={() => removeIngredient(index)}
              onQuantityChange={(e) => {
                const nextQuantity = parseFloat(e.target.value) || 0
                updateItem(index, {
                  quantity: nextQuantity,
                  ...(item.unit === 'g' ? { grams_equivalent: nextQuantity } : {}),
                })
              }}
              onUnitChange={(val) => updateUnit(index, val as MealIngredientFormValues['unit'])}
              onGramsEquivalentChange={(e) =>
                updateField(
                  index,
                  'grams_equivalent',
                  e.target.value === '' ? null : parseFloat(e.target.value) || 0
                )
              }
            />
          ))}
        </div>
      )}

      {pickerOpen ? (
        <IngredientSearchPanel
          search={search}
          onSearchChange={setSearch}
          isLoading={ingredientsQuery.isLoading}
          ingredients={filteredIngredients}
          selectedIds={selectedIds}
          onAdd={addIngredient}
          onCancel={() => {
            setPickerOpen(false)
            setSearch('')
          }}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-full text-xs max-md:h-11"
          onClick={() => setPickerOpen(true)}
        >
          <Plus aria-hidden="true" className="h-3 w-3" />
          Agregar ingrediente
        </Button>
      )}

      {error && <p id={errorId} className="text-xs text-status-error">{error}</p>}
    </div>
  )
}

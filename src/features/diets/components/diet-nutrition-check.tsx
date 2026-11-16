import { useMemo, type ReactNode } from 'react'
import { useWatch, type Control } from 'react-hook-form'
import { StatusChip } from '@/components/ui/status-chip'
import { cn } from '@/lib/utils'
import { useIngredientsList } from '../api'
import {
  compareMacro,
  formatMacroAmount,
  formatSignedDifference,
  roundMacros,
  sumDeclaredMealMacros,
  sumIngredientMacros,
  type IngredientNutrition,
  type MacroKey,
  type MacroTotals,
} from '../diet-nutrition-summary'
import type { DietFormValues } from '../schemas'

type DeclaredValues = Record<MacroKey, number | null | undefined>
type MealPath = `meals.${number}` | `meals.${number}.variants.${number}`

const MACRO_ROWS: { key: MacroKey; label: string; unit: 'kcal' | 'g' }[] = [
  { key: 'calories', label: 'Kcal', unit: 'kcal' },
  { key: 'protein_g', label: 'Proteína', unit: 'g' },
  { key: 'carbs_g', label: 'Carbos', unit: 'g' },
  { key: 'fat_g', label: 'Grasa', unit: 'g' },
]

interface NutritionComparisonProps {
  title: string
  ariaLabel: string
  computedLabel: string
  /** Rounded sums; null while the ingredient catalog is not available. */
  computed: MacroTotals | null
  declared: DeclaredValues
  note?: ReactNode
}

/** Read-only table: computed sum, declared value and signed difference per macro. */
function NutritionComparison({
  title,
  ariaLabel,
  computedLabel,
  computed,
  declared,
  note,
}: NutritionComparisonProps) {
  const rows = MACRO_ROWS.map((row) => ({
    ...row,
    comparison: compareMacro(computed ? computed[row.key] : null, declared[row.key]),
  }))
  const compared = rows.filter((row) => row.comparison.status === 'match' || row.comparison.status === 'mismatch')
  const mismatched = compared.some((row) => row.comparison.status === 'mismatch')

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="min-w-0 space-y-2 border border-border bg-background-surface p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-muted">{title}</p>
        {compared.length > 0 ? (
          <StatusChip variant={mismatched ? 'warning' : 'success'}>
            {mismatched ? 'No cuadra' : 'Cuadra'}
          </StatusChip>
        ) : null}
      </div>
      <table className="w-full table-fixed text-xs tabular-nums">
        <thead>
          <tr className="text-foreground-muted">
            <th scope="col" className="w-[22%] pb-1 text-left font-normal">
              <span className="sr-only">Macro</span>
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              {computedLabel}
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              Declarado
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              Diferencia
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, unit, comparison }) => (
            <tr key={key}>
              <th scope="row" className="py-0.5 text-left font-medium text-foreground-secondary">
                {label}
              </th>
              <td className="py-0.5 text-right text-foreground">
                {formatMacroAmount(computed ? computed[key] : null, unit)}
              </td>
              <td className="py-0.5 text-right text-foreground-secondary">
                {formatMacroAmount(declared[key], unit)}
              </td>
              <td
                className={cn(
                  'py-0.5 text-right',
                  comparison.status === 'mismatch'
                    ? 'font-semibold text-status-warning'
                    : 'text-foreground-muted'
                )}
              >
                {formatSignedDifference(comparison.difference, unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {note ? <p className="text-[11px] leading-4 text-foreground-muted">{note}</p> : null}
    </div>
  )
}

function useIngredientNutritionMap() {
  const ingredientsQuery = useIngredientsList()
  const data = ingredientsQuery.data?.data
  return useMemo(
    () => (data ? new Map<string, IngredientNutrition>(data.map((ing) => [ing.id, ing])) : null),
    [data]
  )
}

function describePath(path: MealPath) {
  const [, mealIndex, , variantIndex] = path.split('.')
  const meal = Number(mealIndex) + 1
  return variantIndex === undefined
    ? `de la comida ${meal}`
    : `de la variante ${Number(variantIndex) + 1} de la comida ${meal}`
}

/**
 * Live sum of a meal's (or variant's) ingredients against its declared macros. Same
 * formula and rounding as «Calcular desde ingredientes»; it only reads the form.
 */
export function DietMealNutritionCheck({
  control,
  path,
}: {
  control: Control<DietFormValues>
  path: MealPath
}) {
  const [items, calories, protein_g, carbs_g, fat_g] = useWatch({
    control,
    name: [
      `${path}.ingredients`,
      `${path}.calories`,
      `${path}.protein_g`,
      `${path}.carbs_g`,
      `${path}.fat_g`,
    ] as ['meals.0.ingredients', 'meals.0.calories', 'meals.0.protein_g', 'meals.0.carbs_g', 'meals.0.fat_g'],
  })
  const ingredientsById = useIngredientNutritionMap()

  const sum = ingredientsById ? sumIngredientMacros(Array.isArray(items) ? items : [], ingredientsById) : null
  const skipped = sum ? sum.missingItems + sum.omittedItems : 0

  return (
    <NutritionComparison
      title="Suma de ingredientes"
      ariaLabel={`Suma de ingredientes ${describePath(path)}`}
      computedLabel="Ingredientes"
      computed={sum && sum.calculatedItems > 0 ? roundMacros(sum.totals) : null}
      declared={{ calories, protein_g, carbs_g, fat_g }}
      note={
        skipped > 0
          ? `No suma${skipped === 1 ? '' : 'n'} ${skipped} ingrediente${skipped === 1 ? '' : 's'} sin datos en el catálogo o sin gramos.`
          : undefined
      }
    />
  )
}

/**
 * Live sum of the macros declared on each meal against the diet totals. Same formula and
 * rounding as «Calcular desde comidas» (variants are not added); it only reads the form.
 */
export function DietTotalsNutritionCheck({ control }: { control: Control<DietFormValues> }) {
  const [meals, calories, protein_g, carbs_g, fat_g] = useWatch({
    control,
    name: ['meals', 'total_calories', 'total_protein_g', 'total_carbs_g', 'total_fat_g'],
  })

  return (
    <NutritionComparison
      title="Suma de comidas"
      ariaLabel="Suma de comidas frente a los macros totales"
      computedLabel="Comidas"
      computed={roundMacros(sumDeclaredMealMacros(Array.isArray(meals) ? meals : []))}
      declared={{ calories, protein_g, carbs_g, fat_g }}
      note="Suma de los macros declarados en cada comida, sin variantes."
    />
  )
}

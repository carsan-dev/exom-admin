import { MEASURE_UNIT_LABELS } from '@/features/diets/types'
import type { DietHistoryEntry } from '../types'

export function DietHistory({ entries }: { entries: DietHistoryEntry[] }) {
  if (!entries.length) return null
  return (
    <section className="space-y-2 border-t border-border pt-4" aria-label="Histórico de dietas">
      <h3 className="text-sm font-medium">Histórico de dietas · Solo lectura</h3>
      <p className="text-xs text-muted-foreground">Estas copias no modifican la asignación actual.</p>
      {entries.map((entry) => (
        <details key={entry.diet_id} className="rounded-md border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">{entry.diet.name}</summary>
          <p className="my-2 text-xs text-muted-foreground">
            {entry.provenance === 'legacy_available'
              ? 'Contenido disponible al migrar; puede no reflejar ediciones anteriores.'
              : 'Contenido conservado al proteger el día.'}
          </p>
          <p className="text-xs">Objetivo: {entry.diet.total_calories ?? '—'} kcal · P {entry.diet.total_protein_g ?? '—'} g · C {entry.diet.total_carbs_g ?? '—'} g · G {entry.diet.total_fat_g ?? '—'} g</p>
          {entry.diet.meals.flatMap((meal) => [meal, ...meal.variants]).map((meal) => (
            <div key={meal.id} className="mt-3 space-y-1 text-sm">
              <p className="font-medium">{meal.name}</p>
              <p className="text-xs">{meal.calories ?? '—'} kcal · P {meal.protein_g ?? '—'} g · C {meal.carbs_g ?? '—'} g · G {meal.fat_g ?? '—'} g</p>
              <ul className="list-disc pl-5 text-xs">
                {meal.ingredients.map((item) => (
                  <li key={item.id}>{item.ingredient.name}: {item.quantity} {MEASURE_UNIT_LABELS[item.unit]}{item.grams_equivalent != null && ` (${item.grams_equivalent} g)`}</li>
                ))}
              </ul>
            </div>
          ))}
        </details>
      ))}
    </section>
  )
}

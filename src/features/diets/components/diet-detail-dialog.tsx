import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Edit } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatMacroValue } from '../../ingredients/types'
import { getMealTypeBadgeClass, MEAL_TYPE_LABELS, type Diet, type Meal } from '../types'

interface DietDetailDialogProps {
  diet: Diet | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (diet: Diet) => void
  onDuplicate?: (diet: Diet) => void
}

function MealRow({ meal }: { meal: Meal }) {
  const [expanded, setExpanded] = useState(false)
  const sortedIngredients = [...meal.ingredients].sort((a, b) =>
    a.ingredient.name.localeCompare(b.ingredient.name),
  )

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-none text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-none text-muted-foreground" />
        )}

        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className={cn('text-xs font-medium flex-none', getMealTypeBadgeClass(meal.type))}
          >
            {MEAL_TYPE_LABELS[meal.type]}
          </Badge>
          <span className="text-sm font-medium text-foreground truncate">{meal.name}</span>
        </div>

        {meal.calories != null && (
          <span className="text-xs text-muted-foreground flex-none">{meal.calories} kcal</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-3 pb-3 pt-2 space-y-2">
          {meal.image_url && (
            <div className="overflow-hidden rounded-md border border-border/50">
              <img
                src={meal.image_url}
                alt={meal.name}
                className="h-40 w-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Macros */}
          {(meal.protein_g != null || meal.carbs_g != null || meal.fat_g != null) && (
            <p className="text-xs text-muted-foreground">
              P {meal.protein_g ?? '—'}g · C {meal.carbs_g ?? '—'}g · G {meal.fat_g ?? '—'}g
            </p>
          )}

          {/* Badges */}
          {meal.nutritional_badges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {meal.nutritional_badges.map((badge) => (
                <Badge key={badge} variant="outline" className="text-xs border-border bg-muted text-muted-foreground">
                  {badge}
                </Badge>
              ))}
            </div>
          )}

          {/* Ingredients */}
          {sortedIngredients.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ingredientes
              </p>
              {sortedIngredients.map((mi) => (
                <div key={mi.id} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{mi.ingredient.name}</span>
                  <span className="text-muted-foreground">
                    {formatMacroValue(mi.quantity)} {mi.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DietDetailDialog({
  diet,
  open,
  onOpenChange,
  onEdit,
  onDuplicate,
}: DietDetailDialogProps) {
  if (!diet) return null

  const sortedMeals = [...diet.meals].sort((a, b) => a.order - b.order)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-8">{diet.name}</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* Macros totales */}
          {(diet.total_calories != null ||
            diet.total_protein_g != null ||
            diet.total_carbs_g != null ||
            diet.total_fat_g != null) && (
            <div className="flex flex-wrap gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
              {diet.total_calories != null && (
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">{diet.total_calories}</p>
                  <p className="text-xs text-muted-foreground">kcal</p>
                </div>
              )}
              {diet.total_protein_g != null && (
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">{formatMacroValue(diet.total_protein_g)}g</p>
                  <p className="text-xs text-muted-foreground">Proteína</p>
                </div>
              )}
              {diet.total_carbs_g != null && (
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">{formatMacroValue(diet.total_carbs_g)}g</p>
                  <p className="text-xs text-muted-foreground">Carbos</p>
                </div>
              )}
              {diet.total_fat_g != null && (
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">{formatMacroValue(diet.total_fat_g)}g</p>
                  <p className="text-xs text-muted-foreground">Grasa</p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Meals */}
          {sortedMeals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Comidas ({sortedMeals.length})
              </p>
              {sortedMeals.map((meal) => (
                <MealRow key={meal.id} meal={meal} />
              ))}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {onDuplicate && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  onDuplicate(diet)
                }}
              >
                <Copy className="h-4 w-4" />
                Duplicar
              </Button>
            )}
            {onEdit && (
              <Button
                onClick={() => {
                  onOpenChange(false)
                  onEdit(diet)
                }}
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

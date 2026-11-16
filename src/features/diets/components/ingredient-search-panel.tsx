import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatMacroValue, type Ingredient } from '../../ingredients/types'

interface IngredientSearchPanelProps {
  search: string
  onSearchChange: (value: string) => void
  isLoading: boolean
  ingredients: Ingredient[]
  selectedIds: Set<string>
  onAdd: (ingredientId: string) => void
  onCancel: () => void
}

export function IngredientSearchPanel({
  search,
  onSearchChange,
  isLoading,
  ingredients,
  selectedIds,
  onAdd,
  onCancel,
}: IngredientSearchPanelProps) {
  return (
    <div className="rounded-md border border-border/70 bg-background p-2 space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Buscar ingrediente..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-7 h-7 text-xs"
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-1 text-center">Cargando ingredientes...</p>
      ) : ingredients.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1 text-center">
          {search ? `Sin resultados para "${search}"` : 'No hay ingredientes disponibles'}
        </p>
      ) : (
        <div className="max-h-40 overflow-y-auto space-y-0.5">
          {ingredients.map((ingredient) => {
            const isSelected = selectedIds.has(ingredient.id)
            return (
              <button
                key={ingredient.id}
                type="button"
                disabled={isSelected}
                onClick={() => onAdd(ingredient.id)}
                className={cn(
                  'w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                  isSelected ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-foreground">{ingredient.name}</p>
                  <p className="text-muted-foreground">
                    {ingredient.calories_per_100g} kcal · P{' '}
                    {formatMacroValue(ingredient.protein_per_100g)}g · C{' '}
                    {formatMacroValue(ingredient.carbs_per_100g)}g · G{' '}
                    {formatMacroValue(ingredient.fat_per_100g)}g
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
        onClick={onCancel}
      >
        Cancelar
      </Button>
    </div>
  )
}

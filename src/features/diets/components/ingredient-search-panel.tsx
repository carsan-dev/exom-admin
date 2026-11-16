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
    <div className="space-y-2 border border-border-strong bg-background-surface p-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Buscar ingrediente..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-7 text-xs"
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-1 text-center">Cargando ingredientes...</p>
      ) : ingredients.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1 text-center">
          {search ? `Sin resultados para "${search}"` : 'No hay ingredientes disponibles'}
        </p>
      ) : (
        <div className="max-h-56 divide-y divide-border overflow-y-auto">
          {ingredients.map((ingredient) => {
            const isSelected = selectedIds.has(ingredient.id)
            return (
              <button
                key={ingredient.id}
                type="button"
                disabled={isSelected}
                onClick={() => onAdd(ingredient.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-2 py-2 text-left text-xs transition-colors max-md:min-h-11',
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
        className="h-7 w-full text-xs text-muted-foreground max-md:h-11"
        onClick={onCancel}
      >
        Cancelar
      </Button>
    </div>
  )
}

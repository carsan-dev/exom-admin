import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { SortableTableHead } from '@/components/sortable-table-head'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ResourceApprovalIndicator } from '../../approval-requests/components/resource-approval-indicator'
import { formatMacroValue, formatUpdatedAt, type Ingredient } from '../types'
import type { SortDir } from '@/lib/sort-search-params'

interface IngredientApprovalSummary {
  pending_approval_actions: string[]
}

interface IngredientsTableProps {
  ingredients: Ingredient[]
  approvalById?: Record<string, IngredientApprovalSummary>
  onEdit: (ingredient: Ingredient) => void
  onDelete: (ingredient: Ingredient) => void
  sortBy?: string
  sortDir?: SortDir
  onSortChange?: (field: string) => void
}

export function IngredientsTable({ ingredients, approvalById = {}, onEdit, onDelete, sortBy, sortDir = 'asc', onSortChange = () => {} }: IngredientsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead field="name" label="Nombre" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
          <SortableTableHead field="icon" label="Icono" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} className="text-center" />
          <SortableTableHead field="calories_per_100g" label="kcal/100g" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} className="text-right" />
          <SortableTableHead field="protein_per_100g" label="Proteína/100g" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} className="hidden md:table-cell text-right" />
          <SortableTableHead field="carbs_per_100g" label="Carbohidratos/100g" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} className="hidden lg:table-cell text-right" />
          <SortableTableHead field="fat_per_100g" label="Grasas/100g" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} className="hidden lg:table-cell text-right" />
          <SortableTableHead field="updated_at" label="Actualizado" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} className="hidden xl:table-cell" />
          <TableHead className="w-11 px-0 text-right md:w-auto md:px-3">
            {/* En móvil el rótulo no cabe: se mantiene para lectores de pantalla. */}
            <span className="sr-only md:not-sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ingredients.map((ingredient) => (
          <TableRow key={ingredient.id}>
            <TableCell>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{ingredient.name}</p>
                  <ResourceApprovalIndicator pendingActions={approvalById[ingredient.id]?.pending_approval_actions ?? []} />
                  <div className="text-xs tabular-nums text-foreground-muted md:hidden">
                    P {formatMacroValue(ingredient.protein_per_100g)} g · C {formatMacroValue(ingredient.carbs_per_100g)} g · G {formatMacroValue(ingredient.fat_per_100g)} g
                  </div>
              </div>
            </TableCell>

            <TableCell className="text-center">
              {ingredient.icon ? (
                <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-none border border-border bg-card px-2 text-base">
                  {ingredient.icon}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">--</span>
              )}
            </TableCell>

            <TableCell className="text-right font-display font-bold tabular-nums">
              {formatMacroValue(ingredient.calories_per_100g)}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums md:table-cell">
              {formatMacroValue(ingredient.protein_per_100g)}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums lg:table-cell">
              {formatMacroValue(ingredient.carbs_per_100g)}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums lg:table-cell">
              {formatMacroValue(ingredient.fat_per_100g)}
            </TableCell>
            <TableCell className="hidden text-sm tabular-nums text-foreground-muted xl:table-cell">
              {formatUpdatedAt(ingredient.updated_at)}
            </TableCell>

            <TableCell className="px-0 text-right md:px-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-11 w-11 p-0 md:h-8 md:w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Abrir menú</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(ingredient)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(ingredient)}
                    className="text-status-error focus:text-status-error"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

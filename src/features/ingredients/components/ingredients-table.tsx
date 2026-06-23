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
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ingredients.map((ingredient) => (
          <TableRow key={ingredient.id}>
            <TableCell>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{ingredient.name}</p>
                  <ResourceApprovalIndicator pendingActions={approvalById[ingredient.id]?.pending_approval_actions ?? []} />
                  <div className="text-xs text-muted-foreground md:hidden">
                    P {formatMacroValue(ingredient.protein_per_100g)} g · C {formatMacroValue(ingredient.carbs_per_100g)} g · G {formatMacroValue(ingredient.fat_per_100g)} g
                  </div>
              </div>
            </TableCell>

            <TableCell className="text-center">
              {ingredient.icon ? (
                <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-border bg-muted px-2 text-base">
                  {ingredient.icon}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">--</span>
              )}
            </TableCell>

            <TableCell className="text-right font-medium tabular-nums">
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
            <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
              {formatUpdatedAt(ingredient.updated_at)}
            </TableCell>

            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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

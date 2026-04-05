import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { cn } from '@/lib/utils'
import { ResourceApprovalIndicator } from '../../approval-requests/components/resource-approval-indicator'
import { formatUpdatedAt } from '../../ingredients/types'
import { getMealTypeBadgeClass, type Diet } from '../types'

interface DietApprovalSummary {
  pending_approval_actions: string[]
}

interface DietsTableProps {
  diets: Diet[]
  approvalById?: Record<string, DietApprovalSummary>
  onView: (diet: Diet) => void
  onEdit: (diet: Diet) => void
  onDuplicate: (diet: Diet) => void
  onDelete: (diet: Diet) => void
}

export function DietsTable({ diets, approvalById = {}, onView, onEdit, onDuplicate, onDelete }: DietsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead className="text-center">Comidas</TableHead>
          <TableHead className="hidden md:table-cell">Kcal totales</TableHead>
          <TableHead className="hidden lg:table-cell">Macros (P/C/G)</TableHead>
          <TableHead className="hidden md:table-cell">Actualizado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {diets.map((diet) => {
          const mealTypes = diet.meals.map((m) => m.type)
          return (
            <TableRow key={diet.id}>
              <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                <div className="space-y-2">
                  <p className="truncate">{diet.name}</p>
                  <ResourceApprovalIndicator pendingActions={approvalById[diet.id]?.pending_approval_actions ?? []} />
                </div>
              </TableCell>

              <TableCell className="text-center">
                <div className="flex flex-wrap justify-center gap-1">
                  {mealTypes.slice(0, 3).map((type, i) => (
                    <Badge
                      key={`${type}-${i}`}
                      variant="outline"
                      className={cn('text-xs px-1.5 py-0 font-medium', getMealTypeBadgeClass(type))}
                    >
                      {diet.meals[i].name.length > 10 ? diet.meals[i].name.slice(0, 10) + '…' : diet.meals[i].name}
                    </Badge>
                  ))}
                  {diet.meals.length > 3 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 border-border bg-muted text-muted-foreground">
                      +{diet.meals.length - 3}
                    </Badge>
                  )}
                  {diet.meals.length === 0 && (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </TableCell>

              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {diet.total_calories != null ? `${diet.total_calories} kcal` : '—'}
              </TableCell>

              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                {diet.total_protein_g != null || diet.total_carbs_g != null || diet.total_fat_g != null ? (
                  <span>
                    P {diet.total_protein_g ?? '—'}g · C {diet.total_carbs_g ?? '—'}g · G {diet.total_fat_g ?? '—'}g
                  </span>
                ) : (
                  '—'
                )}
              </TableCell>

              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {formatUpdatedAt(diet.updated_at)}
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
                    <DropdownMenuItem onClick={() => onView(diet)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(diet)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(diet)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(diet)}
                      className="text-status-error focus:text-status-error"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

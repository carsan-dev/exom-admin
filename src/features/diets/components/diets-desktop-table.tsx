import { SortableTableHead } from '@/components/sortable-table-head'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CatalogDragHandle } from '../../catalog-groups/components/catalog-drag-handle'
import { formatUpdatedAt } from '../../ingredients/types'
import type { DietsListViewProps } from './diets-table'
import { DietRowActions } from './diet-row-actions'
import { formatDietCalories, formatDietMacros, hasDietMacros } from './diet-row-format'
import { DietGroupTag, DietMealTags, DietNameBlock, DietTagList } from './diet-row-parts'

/** Tabla desde md; kcal y actualización desde md, etiquetas y macros desde lg. */
export function DietsDesktopTable({
  diets,
  approvalById,
  selectedIds,
  allSelected,
  onToggleAll,
  onToggle,
  movementDisabled,
  sortBy,
  sortDir,
  onSortChange,
  badgeColorMap,
  ...actions
}: DietsListViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[4.5rem]">
            <div className="flex items-center">
              <Checkbox aria-label="Seleccionar página" checked={allSelected} onChange={onToggleAll} />
            </div>
          </TableHead>
          <SortableTableHead field="name" label="Nombre" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
          <TableHead>Grupo</TableHead>
          <TableHead>Comidas</TableHead>
          <TableHead className="hidden lg:table-cell">Etiquetas</TableHead>
          <TableHead className="hidden whitespace-nowrap md:table-cell">Kcal totales</TableHead>
          <TableHead className="hidden lg:table-cell">Macros (P/C/G)</TableHead>
          <SortableTableHead
            field="updated_at"
            label="Actualizado"
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={onSortChange}
            className="hidden md:table-cell"
          />
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {diets.map((diet) => (
          <TableRow key={diet.id} data-state={selectedIds.has(diet.id) ? 'selected' : undefined}>
            <TableCell>
              <div className="flex items-center gap-1">
                <Checkbox
                  aria-label={`Seleccionar ${diet.name}`}
                  checked={selectedIds.has(diet.id)}
                  onChange={() => onToggle(diet.id)}
                />
                <CatalogDragHandle id={diet.id} label={diet.name} disabled={movementDisabled} />
              </div>
            </TableCell>
            <TableCell className="min-w-[11rem] max-w-[20rem]">
              <DietNameBlock diet={diet} approval={approvalById[diet.id]} />
            </TableCell>
            <TableCell>
              <DietGroupTag diet={diet} />
            </TableCell>
            <TableCell className="min-w-[13.5rem]">
              <DietMealTags diet={diet} badgeColorMap={badgeColorMap} />
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <DietTagList tags={diet.tags ?? []} />
            </TableCell>
            <TableCell className="hidden whitespace-nowrap tabular-nums text-foreground-secondary md:table-cell">
              {formatDietCalories(diet)}
            </TableCell>
            <TableCell className="hidden min-w-[7.5rem] text-xs tabular-nums text-foreground-secondary lg:table-cell">
              {hasDietMacros(diet) ? <span>{formatDietMacros(diet)}</span> : '—'}
            </TableCell>
            <TableCell className="hidden whitespace-nowrap tabular-nums text-foreground-secondary md:table-cell">
              {formatUpdatedAt(diet.updated_at)}
            </TableCell>
            <TableCell className="w-px whitespace-nowrap text-right">
              <DietRowActions diet={diet} {...actions} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

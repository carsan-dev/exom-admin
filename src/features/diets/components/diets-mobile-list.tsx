import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { SortDir } from '@/lib/sort-search-params'
import { CatalogDragHandle } from '../../catalog-groups/components/catalog-drag-handle'
import { formatUpdatedAt } from '../../ingredients/types'
import type { DietsListViewProps } from './diets-table'
import { DietRowActions } from './diet-row-actions'
import { formatDietCalories, formatDietMacros, hasDietMacros } from './diet-row-format'
import { DietGroupTag, DietMealTags, DietNameBlock, DietTagList } from './diet-row-parts'

const SORT_FIELDS = [
  { field: 'name', label: 'Nombre' },
  { field: 'updated_at', label: 'Actualizado' },
] as const

function SortControls({
  sortBy,
  sortDir,
  onSortChange,
}: {
  sortBy?: string
  sortDir: SortDir
  onSortChange: (field: string) => void
}) {
  return (
    <div role="group" aria-label="Ordenar dietas" className="flex flex-wrap items-center gap-1 pb-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Ordenar</span>
      {SORT_FIELDS.map(({ field, label }) => {
        const active = sortBy === field
        const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
        return (
          <Button
            key={field}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Ordenar por ${label}`}
            aria-pressed={active}
            onClick={() => onSortChange(field)}
            className={cn('gap-1 px-2 text-xs max-md:h-11', active && 'text-foreground')}
          >
            {label}
            <Icon className={cn('h-3.5 w-3.5', active ? 'text-accent-line' : 'opacity-50')} aria-hidden="true" />
          </Button>
        )
      })}
    </div>
  )
}

/** Filas apiladas por debajo de md; misma selección, asa de arrastre y acciones que la tabla. */
export function DietsMobileList({
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
    <div>
      <SortControls sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
      <div className="flex items-center border-t border-border">
        <span className="flex size-11 items-center justify-center">
          <Checkbox aria-label="Seleccionar página" checked={allSelected} onChange={onToggleAll} />
        </span>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {diets.map((diet) => {
          const selected = selectedIds.has(diet.id)

          return (
            <li key={diet.id} className={cn('flex items-start gap-1 py-3', selected && 'bg-lime-soft')}>
              <div className="flex flex-none flex-col items-center">
                <span className="flex size-11 items-center justify-center">
                  <Checkbox
                    aria-label={`Seleccionar ${diet.name}`}
                    checked={selected}
                    onChange={() => onToggle(diet.id)}
                  />
                </span>
                <div className="flex size-11 items-center justify-center [&_button]:size-11">
                  <CatalogDragHandle id={diet.id} label={diet.name} disabled={movementDisabled} />
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2 pt-2.5">
                <DietNameBlock diet={diet} approval={approvalById[diet.id]} />
                <DietGroupTag diet={diet} />
                <DietMealTags diet={diet} badgeColorMap={badgeColorMap} />
                <p className="text-xs tabular-nums text-foreground-muted">
                  {formatDietCalories(diet)}
                  {hasDietMacros(diet) ? ` · ${formatDietMacros(diet)}` : ''}
                </p>
                <p className="text-xs tabular-nums text-foreground-muted">{formatUpdatedAt(diet.updated_at)}</p>
                {(diet.tags ?? []).length > 0 ? <DietTagList tags={diet.tags} /> : null}
              </div>
              <DietRowActions diet={diet} {...actions} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

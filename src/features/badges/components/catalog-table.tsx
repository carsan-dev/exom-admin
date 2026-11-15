import { Pencil, Tags, Trash2 } from 'lucide-react'
import { EmptyState, ErrorState, Pagination } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SelectionBar } from '@/components/workspace/selection-bar'
import { getApiErrorMessage } from '@/lib/api-utils'
import { normalizeSearchText } from '@/lib/search'
import { BadgesTableSkeleton } from './badges-table-skeleton'
import { isValidCatalogColor, type CatalogItem, type CatalogView } from './catalog'

const PAGE_SIZE = 10

export interface CatalogTableProps {
  catalog: CatalogView
  search: string
  page: number
  onPageChange: (page: number) => void
  onEdit: (item: CatalogItem) => void
  onDelete: (item: CatalogItem) => void
  selectedValues: Set<string>
  onSelectionChange: (values: Set<string>) => void
  onDeleteSelected: () => void
}

/** Stored colours are data: shown as a dot only when they are a valid #RRGGBB, never as a tint. */
function getCatalogDotColor(color: string | undefined) {
  return color && isValidCatalogColor(color) ? color : undefined
}

export function CatalogTable({
  catalog,
  search,
  page,
  onPageChange,
  onEdit,
  onDelete,
  selectedValues,
  onSelectionChange,
  onDeleteSelected,
}: CatalogTableProps) {
  const normalizedSearch = normalizeSearchText(search)
  const filteredValues = normalizedSearch
    ? catalog.values.filter((item) => normalizeSearchText(item.value).includes(normalizedSearch))
    : catalog.values
  const totalPages = Math.max(1, Math.ceil(filteredValues.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedValues = filteredValues.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
  const filteredKeys = filteredValues.map((item) => item.value)
  const allFilteredSelected = filteredKeys.length > 0 && filteredKeys.every((value) => selectedValues.has(value))
  const someFilteredSelected = filteredKeys.some((value) => selectedValues.has(value))
  const titleId = `badges-catalog-${catalog.id}-title`

  if (catalog.isLoading) {
    return <BadgesTableSkeleton />
  }

  if (catalog.isError) {
    return (
      <ErrorState
        className="border-y border-border"
        title="No se ha podido cargar el catálogo"
        description={getApiErrorMessage(catalog.error, 'Intentalo de nuevo en unos segundos.')}
        onRetry={() => catalog.refetch()}
      />
    )
  }

  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <div>
        <div className="flex items-baseline gap-3">
          <h2
            id={titleId}
            className="font-display text-lg font-bold uppercase leading-none text-foreground"
          >
            {catalog.title}
          </h2>
          <span className="text-[13px] tabular-nums text-foreground-muted">
            {catalog.values.length}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-foreground-secondary">{catalog.description}</p>
      </div>

      {filteredValues.length === 0 ? (
        <EmptyState
          className="border-y border-border"
          icon={<Tags />}
          title={
            catalog.values.length === 0
              ? 'Sin valores guardados.'
              : `Sin resultados para "${search}".`
          }
        />
      ) : (
        <TooltipProvider delayDuration={0}>
          <Table>
            <TableHeader>
              <TableRow>
                {catalog.canDelete ? (
                  <TableHead className="w-11 md:w-12">
                    <Checkbox
                      aria-label="Seleccionar todos los resultados filtrados"
                      checked={
                        allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false
                      }
                      onChange={(event) => {
                        const next = new Set(selectedValues)
                        filteredKeys.forEach((value) => event.target.checked ? next.add(value) : next.delete(value))
                        onSelectionChange(next)
                      }}
                    />
                  </TableHead>
                ) : null}
                <TableHead>Valor</TableHead>
                {catalog.supportsColor ? (
                  <TableHead className="hidden w-40 md:table-cell">Color</TableHead>
                ) : null}
                <TableHead className="hidden w-40 md:table-cell">Origen</TableHead>
                <TableHead className="w-24 px-0 text-right md:w-28 md:px-3">
                  {/* En móvil el rótulo no cabe: se mantiene para lectores de pantalla. */}
                  <span className="sr-only md:not-sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedValues.map((item) => {
                const dotColor = catalog.supportsColor ? getCatalogDotColor(item.color) : undefined

                return (
                  <TableRow
                    key={item.value}
                    data-state={selectedValues.has(item.value) ? 'selected' : undefined}
                  >
                    {catalog.canDelete ? (
                      <TableCell>
                        <Checkbox
                          aria-label={`Seleccionar ${item.value}`}
                          checked={selectedValues.has(item.value)}
                          onChange={() => {
                            const next = new Set(selectedValues)
                            if (next.has(item.value)) next.delete(item.value)
                            else next.add(item.value)
                            onSelectionChange(next)
                          }}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="min-w-0">
                      <Tag
                        data-catalog-tag=""
                        color={dotColor}
                        className="h-auto min-h-6 max-w-full whitespace-normal py-1 text-foreground"
                      >
                        <span className="min-w-0 break-words">{item.value}</span>
                      </Tag>
                    </TableCell>
                    {catalog.supportsColor ? (
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2 text-foreground-muted">
                          {dotColor ? (
                            <span
                              aria-hidden="true"
                              className="size-3.5 flex-none border border-border-strong"
                              style={{ backgroundColor: dotColor }}
                            />
                          ) : null}
                          <span className="font-mono text-xs tabular-nums">{item.color}</span>
                        </div>
                      </TableCell>
                    ) : null}
                    <TableCell className="hidden text-[13px] text-foreground-muted md:table-cell">
                      {catalog.badgeLabel}
                    </TableCell>
                    <TableCell className="px-0 md:px-3">
                      <div className="flex justify-end md:gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 md:h-8 md:w-8"
                              aria-label={`Editar ${item.value}`}
                              onClick={() => onEdit({ catalogId: catalog.id, value: item.value, color: item.color })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        {catalog.canDelete ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Borrar ${item.value}`}
                                className="h-11 w-11 text-destructive hover:text-destructive md:h-8 md:w-8"
                                onClick={() => onDelete({ catalogId: catalog.id, value: item.value, color: item.color })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Borrar</TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TooltipProvider>
      )}

      {catalog.canDelete ? (
        selectedValues.size > 0 ? (
          <SelectionBar
            count={selectedValues.size}
            formatCount={(count) => `${count} seleccionados`}
            onClear={() => onSelectionChange(new Set())}
            className="bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] flex-wrap max-md:overflow-x-visible md:bottom-4 [&>div]:min-w-0 [&>div]:shrink [&>div]:flex-wrap"
          >
            <Button variant="destructive" size="sm" onClick={onDeleteSelected}>
              <Trash2 className="h-4 w-4" />
              Eliminar seleccionados ({selectedValues.size})
            </Button>
          </SelectionBar>
        ) : (
          // Sin selección la barra compartida no se pinta; el contador y la acción (deshabilitada) se conservan.
          <div className="mt-3 flex min-h-13 flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] tabular-nums text-foreground-muted">{selectedValues.size} seleccionados</p>
            <Button variant="outline" size="sm" onClick={onDeleteSelected} disabled>
              <Trash2 className="h-4 w-4" />
              Eliminar seleccionados ({selectedValues.size})
            </Button>
          </div>
        )
      ) : null}

      {filteredValues.length > 0 ? (
        totalPages > 1 ? (
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        ) : (
          // La paginación compartida no se pinta con una sola página; el texto sí se conserva.
          <p className="pt-4 text-[13px] tabular-nums text-foreground-muted">
            Página {currentPage} de {totalPages}
          </p>
        )
      ) : null}
    </section>
  )
}

import { AlertTriangle, ChevronLeft, ChevronRight, Pencil, Tags, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getApiErrorMessage } from '@/lib/api-utils'
import { normalizeSearchText } from '@/lib/search'
import { getTrainingAccentStyle } from '@/features/trainings/types'
import { BadgesTableSkeleton } from './badges-table-skeleton'
import type { CatalogItem, CatalogView } from './catalog'

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

  if (catalog.isLoading) {
    return <BadgesTableSkeleton />
  }

  if (catalog.isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className="rounded-full bg-status-error/10 p-4 text-status-error">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              No se ha podido cargar el catálogo
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              {getApiErrorMessage(catalog.error, 'Intentalo de nuevo en unos segundos.')}
            </p>
          </div>
          <Button onClick={() => catalog.refetch()}>Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl">{catalog.title}</CardTitle>
            <CardDescription>{catalog.description}</CardDescription>
          </div>
          <Badge
            variant="outline"
            className="w-fit border-brand-soft/40 bg-brand-soft/10 text-accent-text"
          >
            {catalog.values.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {catalog.canDelete ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{selectedValues.size} seleccionados</p>
            <Button variant="destructive" onClick={onDeleteSelected} disabled={selectedValues.size === 0}>
              <Trash2 className="h-4 w-4" />
              Eliminar seleccionados ({selectedValues.size})
            </Button>
          </div>
        ) : null}
        {filteredValues.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border/70 p-6 text-center">
            <Tags className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {catalog.values.length === 0
                ? 'Sin valores guardados.'
                : `Sin resultados para "${search}".`}
            </p>
          </div>
        ) : (
          <TooltipProvider delayDuration={0}>
            <Table>
              <TableHeader>
                <TableRow>
                  {catalog.canDelete ? (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todos los resultados filtrados"
                        checked={allFilteredSelected}
                        ref={(node) => { if (node) node.indeterminate = someFilteredSelected && !allFilteredSelected }}
                        onChange={(event) => {
                          const next = new Set(selectedValues)
                          filteredKeys.forEach((value) => event.target.checked ? next.add(value) : next.delete(value))
                          onSelectionChange(next)
                        }}
                        className="h-4 w-4 accent-brand-primary"
                      />
                    </TableHead>
                  ) : null}
                  <TableHead>Valor</TableHead>
                  {catalog.supportsColor ? (
                    <TableHead className="hidden w-52 sm:table-cell">Color</TableHead>
                  ) : null}
                  <TableHead className="hidden w-48 sm:table-cell">Origen</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedValues.map((item) => (
                  <TableRow key={item.value}>
                    {catalog.canDelete ? (
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${item.value}`}
                          checked={selectedValues.has(item.value)}
                          onChange={() => {
                            const next = new Set(selectedValues)
                            if (next.has(item.value)) next.delete(item.value)
                            else next.add(item.value)
                            onSelectionChange(next)
                          }}
                          className="h-4 w-4 accent-brand-primary"
                        />
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="max-w-full border-border bg-muted text-foreground"
                        style={catalog.supportsColor ? getTrainingAccentStyle(item.color) : undefined}
                      >
                        <span className="min-w-0 break-words">{item.value}</span>
                      </Badge>
                    </TableCell>
                    {catalog.supportsColor ? (
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span
                            className="h-5 w-5 rounded-full border border-border"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-mono text-xs">{item.color}</span>
                        </div>
                      </TableCell>
                    ) : null}
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {catalog.badgeLabel}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
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
                                className="text-status-error hover:text-status-error"
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
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        )}

        {filteredValues.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Apple, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router'
import {
  FilterToolbar,
  filtersToApiParams,
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useResourceApprovalBatch } from '@/features/approval-requests/api'
import { buildResourceApprovalMap } from '@/features/approval-requests/types'
import {
  getPageSearchParam,
  replacePaginationSearchParams,
} from '@/lib/pagination-search-params'
import { getApiErrorMessage, type IngredientsListParams, useIngredients } from '../api'
import { DeleteIngredientDialog } from '../components/delete-ingredient-dialog'
import { IngredientFormDialog } from '../components/ingredient-form-dialog'
import { IngredientsTable } from '../components/ingredients-table'
import type { Ingredient } from '../types'

const PAGE_SIZE = 10
const ICON_STATE_OPTIONS: FilterOption[] = [
  { value: 'WITH_ICON', label: 'Con icono' },
  { value: 'WITHOUT_ICON', label: 'Sin icono' },
]

function IngredientsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
}

export function IngredientsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const page = getPageSearchParam(searchParams.get('page'))
  const deferredSearch = useDeferredValue(search)
  const activeSearch = deferredSearch.trim()
  const filterSections = useMemo<FilterSectionConfig[]>(
    () => [
      {
        type: 'multi',
        key: 'has_icon',
        label: 'Icono',
        options: ICON_STATE_OPTIONS,
      },
      {
        type: 'range',
        key: 'calories_per_100g',
        label: 'Calorías',
        min: 0,
        max: 900,
        step: 5,
        unit: 'kcal',
      },
      {
        type: 'range',
        key: 'protein_per_100g',
        label: 'Proteína',
        min: 0,
        max: 100,
        unit: 'g',
      },
      {
        type: 'range',
        key: 'carbs_per_100g',
        label: 'Carbohidratos',
        min: 0,
        max: 100,
        unit: 'g',
      },
      {
        type: 'range',
        key: 'fat_per_100g',
        label: 'Grasas',
        min: 0,
        max: 100,
        unit: 'g',
      },
      {
        type: 'date-range',
        key: 'updated',
        label: 'Última edición',
      },
    ],
    []
  )
  const filters = useListFilters(filterSections)
  const filterParams = filtersToApiParams(filters.values, filterSections) as Partial<IngredientsListParams>
  const pageResetKey = `${activeSearch}::${JSON.stringify(filterParams)}`
  const lastPageResetKeyRef = useRef(pageResetKey)

  useEffect(() => {
    if (lastPageResetKeyRef.current === pageResetKey) {
      return
    }

    lastPageResetKeyRef.current = pageResetKey
    replacePaginationSearchParams(setSearchParams, { page: 1 })
  }, [pageResetKey, setSearchParams])

  const ingredientsQuery = useIngredients({
    page,
    limit: PAGE_SIZE,
    search: activeSearch,
    ...filterParams,
  })
  const ingredients = ingredientsQuery.data?.data ?? []
  const ingredientApprovalQuery = useResourceApprovalBatch('ingredient', ingredients.map((ingredient) => ingredient.id))
  const ingredientApprovalById = buildResourceApprovalMap(ingredientApprovalQuery.data ?? [])
  const total = ingredientsQuery.data?.total ?? 0
  const totalPages = Math.max(1, ingredientsQuery.data?.totalPages ?? 1)
  const hasActiveQuery = activeSearch.length > 0 || filters.activeCount > 0

  const handleCreate = () => {
    setEditingIngredient(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient)
    setFormDialogOpen(true)
  }

  const handleDelete = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-none sm:shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-primary">Catálogo</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Ingredientes</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gestiona la biblioteca reutilizable de ingredientes con sus macros por 100 g para usarlos después en comidas y dietas.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} ingredientes en el catálogo` : 'Aún no hay ingredientes en el catálogo'}
          </p>
        </div>

        <Button onClick={handleCreate} className="lg:self-start">
          <Plus className="h-4 w-4" />
          Nuevo ingrediente
        </Button>
      </div>

      {ingredientsQuery.isLoading ? (
        <IngredientsTableSkeleton />
      ) : ingredientsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">No se ha podido cargar el catálogo</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {getApiErrorMessage(ingredientsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
              </p>
            </div>
            <Button onClick={() => ingredientsQuery.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : total === 0 && !hasActiveQuery ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="flex flex-col items-center gap-4 pt-10 text-center">
            <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">
              <Apple className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Aún no hay ingredientes</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Crea el primer ingrediente del catálogo para reutilizarlo después al construir comidas y dietas.
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Crear primer ingrediente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Listado de ingredientes</CardTitle>
            <CardDescription>
              Vista paginada del catálogo con búsqueda, filtros de macros y acciones de administración.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FilterToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por nombre..."
              sections={filterSections}
              filters={filters}
            />

            {ingredients.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron ingredientes con la búsqueda y filtros actuales.
              </p>
            ) : (
              <IngredientsTable
                ingredients={ingredients}
                approvalById={ingredientApprovalById}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}

            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    replacePaginationSearchParams(setSearchParams, {
                      page: Math.max(1, page - 1),
                    })
                  }
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    replacePaginationSearchParams(setSearchParams, {
                      page: Math.min(totalPages, page + 1),
                    })
                  }
                  disabled={page >= totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <IngredientFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        ingredient={editingIngredient}
        onSaved={() => {
          if (!editingIngredient) {
            replacePaginationSearchParams(setSearchParams, { page: 1 })
          }
        }}
      />

      <DeleteIngredientDialog
        ingredient={selectedIngredient}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => {
          replacePaginationSearchParams(setSearchParams, { page: 1 })
        }}
      />
    </div>
  )
}

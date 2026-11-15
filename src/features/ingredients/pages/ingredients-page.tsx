import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Apple, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router'
import {
  FilterToolbar,
  filtersToApiParams,
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { EmptyState, ErrorState, PageHeader, Pagination } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useResourceApprovalBatch } from '@/features/approval-requests/api'
import { buildResourceApprovalMap } from '@/features/approval-requests/types'
import {
  getPageSearchParam,
  replacePaginationSearchParams,
} from '@/lib/pagination-search-params'
import { getSortSearchParams, toggleSortSearchParams } from '@/lib/sort-search-params'
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

function IngredientsListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border border-y border-border">
      <span className="sr-only">Cargando ingredientes</span>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} aria-hidden="true" className="flex items-center gap-3 py-3">
          <Skeleton className="h-4 w-40 max-w-[50%]" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
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
  const sort = getSortSearchParams(searchParams)
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
    sort_by: sort.sort_by,
    sort_dir: sort.sort_dir,
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
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Ingredientes"
        description={
          <>
            Gestiona la biblioteca reutilizable de ingredientes con sus macros por 100 g para usarlos después en comidas y dietas.
            <span className="mt-1 block text-foreground-muted">
              {total > 0 ? `${total} ingredientes en el catálogo` : 'Aún no hay ingredientes en el catálogo'}
            </span>
          </>
        }
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Nuevo ingrediente
          </Button>
        }
      />

      {ingredientsQuery.isLoading ? (
        <IngredientsListSkeleton />
      ) : ingredientsQuery.isError ? (
        <ErrorState
          className="border-y border-border"
          title="No se ha podido cargar el catálogo"
          description={getApiErrorMessage(ingredientsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
          onRetry={() => ingredientsQuery.refetch()}
        />
      ) : total === 0 && !hasActiveQuery ? (
        <EmptyState
          className="border-y border-border"
          icon={<Apple />}
          title="Aún no hay ingredientes"
          description="Crea el primer ingrediente del catálogo para reutilizarlo después al construir comidas y dietas."
          action={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Crear primer ingrediente
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="ingredients-list-title" className="space-y-4">
          <div>
            <h2
              id="ingredients-list-title"
              className="font-display text-lg font-bold uppercase leading-none text-foreground"
            >
              Listado de ingredientes
            </h2>
            <p className="mt-1 text-[13px] text-foreground-secondary">
              Vista paginada del catálogo con búsqueda, filtros de macros y acciones de administración.
            </p>
          </div>
          <FilterToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por nombre..."
            sections={filterSections}
            filters={filters}
          />

          {ingredients.length === 0 ? (
            <EmptyState
              className="border-y border-border"
              title="Sin resultados"
              description="No se encontraron ingredientes con la búsqueda y filtros actuales."
            />
          ) : (
            <IngredientsTable
              ingredients={ingredients}
              approvalById={ingredientApprovalById}
              onEdit={handleEdit}
              onDelete={handleDelete}
              sortBy={sort.sort_by}
              sortDir={sort.sort_dir}
              onSortChange={(field) => toggleSortSearchParams(setSearchParams, field)}
            />
          )}

          {/* La paginación compartida no se pinta con una sola página; el texto sí se conserva. */}
          {totalPages > 1 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(nextPage) =>
                replacePaginationSearchParams(setSearchParams, { page: nextPage })
              }
            />
          ) : (
            <p className="pt-4 text-[13px] tabular-nums text-foreground-muted">
              Página {page} de {totalPages}
            </p>
          )}
        </section>
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

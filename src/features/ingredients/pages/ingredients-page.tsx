import { useDeferredValue, useEffect, useState } from 'react'
import { AlertTriangle, Apple, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage, useIngredients } from '../api'
import { DeleteIngredientDialog } from '../components/delete-ingredient-dialog'
import { IngredientFormDialog } from '../components/ingredient-form-dialog'
import { IngredientsTable } from '../components/ingredients-table'
import type { Ingredient } from '../types'

const PAGE_SIZE = 10

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
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const deferredSearch = useDeferredValue(search)
  const activeSearch = deferredSearch.trim()

  useEffect(() => {
    setPage(1)
  }, [activeSearch])

  const ingredientsQuery = useIngredients(page, PAGE_SIZE, activeSearch)
  const ingredients = ingredientsQuery.data?.data ?? []
  const total = ingredientsQuery.data?.total ?? 0
  const totalPages = Math.max(1, ingredientsQuery.data?.totalPages ?? 1)
  const isSearching = activeSearch.length > 0

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
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
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
      ) : total === 0 && !isSearching ? (
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
              Vista paginada del catálogo con búsqueda por nombre y acciones de administración.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>

            {ingredients.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron ingredientes con "{activeSearch}"
              </p>
            ) : (
              <IngredientsTable
                ingredients={ingredients}
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
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
          setPage(1)
        }}
      />

      <DeleteIngredientDialog
        ingredient={selectedIngredient}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => {
          setPage(1)
        }}
      />
    </div>
  )
}

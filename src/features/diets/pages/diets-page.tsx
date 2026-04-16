import { useState } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  UtensilsCrossed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { normalizeSearchText } from '@/lib/search'
import { useResourceApprovalBatch } from '@/features/approval-requests/api'
import { buildResourceApprovalMap } from '@/features/approval-requests/types'
import { getApiErrorMessage, useDiets } from '../api'
import { DeleteDietDialog } from '../components/delete-diet-dialog'
import { DietDetailDialog } from '../components/diet-detail-dialog'
import { DietFormDialog } from '../components/diet-form-dialog'
import { DietsTable } from '../components/diets-table'
import type { Diet } from '../types'

const PAGE_SIZE = 10

function DietsTableSkeleton() {
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

export function DietsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDiet, setSelectedDiet] = useState<Diet | null>(null)
  const [editingDiet, setEditingDiet] = useState<Diet | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)

  const dietsQuery = useDiets(page, PAGE_SIZE)
  const allDiets = dietsQuery.data?.data ?? []
  const dietApprovalQuery = useResourceApprovalBatch(
    'diet',
    allDiets.map((diet) => diet.id)
  )
  const dietApprovalById = buildResourceApprovalMap(dietApprovalQuery.data ?? [])
  const total = dietsQuery.data?.total ?? 0
  const totalPages = dietsQuery.data?.totalPages ?? 1
  const normalizedSearch = normalizeSearchText(search.trim())

  const diets = normalizedSearch
    ? allDiets.filter((d) => normalizeSearchText(d.name).includes(normalizedSearch))
    : allDiets

  const handleCreate = () => {
    setEditingDiet(null)
    setIsDuplicate(false)
    setFormDialogOpen(true)
  }

  const handleView = (diet: Diet) => {
    setSelectedDiet(diet)
    setDetailDialogOpen(true)
  }

  const handleEdit = (diet: Diet) => {
    setEditingDiet(diet)
    setIsDuplicate(false)
    setFormDialogOpen(true)
  }

  const handleDuplicate = (diet: Diet) => {
    setEditingDiet(diet)
    setIsDuplicate(true)
    setFormDialogOpen(true)
  }

  const handleDelete = (diet: Diet) => {
    setSelectedDiet(diet)
    setDeleteDialogOpen(true)
  }

  const handleFormDialogOpenChange = (open: boolean) => {
    setFormDialogOpen(open)
    if (!open) {
      setEditingDiet(null)
      setIsDuplicate(false)
    }
  }

  const handleDetailDialogOpenChange = (open: boolean) => {
    setDetailDialogOpen(open)
    if (!open) setSelectedDiet(null)
  }

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open)
    if (!open) setSelectedDiet(null)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-primary">
            Catálogo
          </p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dietas</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gestiona el catálogo de planes nutricionales. Crea dietas con comidas e ingredientes.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `${total} dieta${total !== 1 ? 's' : ''} en el catálogo`
              : 'Aún no hay dietas en el catálogo'}
          </p>
        </div>

        <Button onClick={handleCreate} className="lg:self-start">
          <Plus className="h-4 w-4" />
          Nueva dieta
        </Button>
      </div>

      {/* Content */}
      {dietsQuery.isLoading ? (
        <DietsTableSkeleton />
      ) : dietsQuery.isError ? (
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
                {getApiErrorMessage(dietsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
              </p>
            </div>
            <Button onClick={() => dietsQuery.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : allDiets.length === 0 ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="flex flex-col items-center gap-4 pt-10 text-center">
            <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">
              <UtensilsCrossed className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Aún no hay dietas</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Crea la primera dieta para empezar a asignarla a tus clientes.
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Crear primera dieta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Listado de dietas</CardTitle>
            <CardDescription>
              Vista paginada del catálogo con búsqueda y acciones por dieta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {diets.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron dietas con "{search}"
              </p>
            ) : (
              <DietsTable
                diets={diets}
                approvalById={dietApprovalById}
                onView={handleView}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            )}

            {/* Pagination */}
            {!search && (
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <DietFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormDialogOpenChange}
        diet={editingDiet}
        isDuplicate={isDuplicate}
        onSaved={() => {
          if (!editingDiet || isDuplicate) {
            setPage(1)
            setSearch('')
          }
        }}
      />

      <DietDetailDialog
        diet={selectedDiet}
        open={detailDialogOpen}
        onOpenChange={handleDetailDialogOpenChange}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
      />

      <DeleteDietDialog
        diet={selectedDiet}
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        onDeleted={() => setPage(1)}
      />
    </div>
  )
}

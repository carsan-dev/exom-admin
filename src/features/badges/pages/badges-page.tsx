import { useDeferredValue, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Search,
  Tags,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  useDeleteExerciseEquipment,
  useDeleteExerciseMuscleGroup,
  useExerciseEquipment,
  useExerciseMuscleGroups,
  useRenameExerciseEquipment,
  useRenameExerciseMuscleGroup,
} from '@/features/exercises/api'
import {
  useDeleteTrainingTag,
  useRenameTrainingTag,
  useTrainingTags,
} from '@/features/trainings/api'
import {
  useDeleteDietNutritionalBadge,
  useDietNutritionalBadges,
  useRenameDietNutritionalBadge,
} from '@/features/diets/api'

const PAGE_SIZE = 10

type CatalogId = 'muscle-groups' | 'equipment' | 'training-tags' | 'diet-badges'

interface CatalogItem {
  catalogId: CatalogId
  value: string
}

interface CatalogView {
  id: CatalogId
  title: string
  description: string
  badgeLabel: string
  values: string[]
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

function normalizeCatalogLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function formatAffectedRecords(count: number) {
  return count === 1 ? '1 registro actualizado' : `${count} registros actualizados`
}

function BadgesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
}

interface CatalogTableProps {
  catalog: CatalogView
  search: string
  page: number
  onPageChange: (page: number) => void
  onEdit: (item: CatalogItem) => void
  onDelete: (item: CatalogItem) => void
}

function CatalogTable({
  catalog,
  search,
  page,
  onPageChange,
  onEdit,
  onDelete,
}: CatalogTableProps) {
  const normalizedSearch = normalizeSearchText(search)
  const filteredValues = normalizedSearch
    ? catalog.values.filter((value) => normalizeSearchText(value).includes(normalizedSearch))
    : catalog.values
  const totalPages = Math.max(1, Math.ceil(filteredValues.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedValues = filteredValues.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

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
              No se ha podido cargar el catalogo
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
            className="w-fit border-brand-soft/40 bg-brand-soft/10 text-brand-primary"
          >
            {catalog.values.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredValues.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border/70 p-6 text-center">
            <Tags className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {catalog.values.length === 0
                ? 'Sin badges guardados.'
                : `Sin resultados para "${search}".`}
            </p>
          </div>
        ) : (
          <TooltipProvider delayDuration={0}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Badge</TableHead>
                  <TableHead className="hidden w-48 sm:table-cell">Origen</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedValues.map((value) => (
                  <TableRow key={value}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="max-w-full border-border bg-muted text-foreground"
                      >
                        <span className="min-w-0 break-words">{value}</span>
                      </Badge>
                    </TableCell>
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
                              aria-label={`Editar ${value}`}
                              onClick={() => onEdit({ catalogId: catalog.id, value })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Borrar ${value}`}
                              className="text-status-error hover:text-status-error"
                              onClick={() => onDelete({ catalogId: catalog.id, value })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Borrar</TooltipContent>
                        </Tooltip>
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
              Pagina {currentPage} de {totalPages}
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

export function BadgesPage() {
  const [activeCatalog, setActiveCatalog] = useState<CatalogId>('muscle-groups')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<CatalogItem | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const deferredSearch = useDeferredValue(search)
  const activeSearch = deferredSearch.trim()

  const muscleGroupsQuery = useExerciseMuscleGroups()
  const equipmentQuery = useExerciseEquipment()
  const trainingTagsQuery = useTrainingTags()
  const dietBadgesQuery = useDietNutritionalBadges()

  const renameMuscleGroup = useRenameExerciseMuscleGroup()
  const deleteMuscleGroup = useDeleteExerciseMuscleGroup()
  const renameEquipment = useRenameExerciseEquipment()
  const deleteEquipment = useDeleteExerciseEquipment()
  const renameTrainingTag = useRenameTrainingTag()
  const deleteTrainingTag = useDeleteTrainingTag()
  const renameDietBadge = useRenameDietNutritionalBadge()
  const deleteDietBadge = useDeleteDietNutritionalBadge()

  const catalogs = useMemo<Record<CatalogId, CatalogView>>(
    () => ({
      'muscle-groups': {
        id: 'muscle-groups',
        title: 'Grupos musculares',
        description: 'Badges usados en ejercicios.',
        badgeLabel: 'Ejercicios',
        values: muscleGroupsQuery.data ?? [],
        isLoading: muscleGroupsQuery.isLoading,
        isError: muscleGroupsQuery.isError,
        error: muscleGroupsQuery.error,
        refetch: () => void muscleGroupsQuery.refetch(),
      },
      equipment: {
        id: 'equipment',
        title: 'Equipamiento',
        description: 'Badges de material usados en ejercicios.',
        badgeLabel: 'Ejercicios',
        values: equipmentQuery.data ?? [],
        isLoading: equipmentQuery.isLoading,
        isError: equipmentQuery.isError,
        error: equipmentQuery.error,
        refetch: () => void equipmentQuery.refetch(),
      },
      'training-tags': {
        id: 'training-tags',
        title: 'Tags de entrenamientos',
        description: 'Badges usados en entrenamientos.',
        badgeLabel: 'Entrenamientos',
        values: trainingTagsQuery.data ?? [],
        isLoading: trainingTagsQuery.isLoading,
        isError: trainingTagsQuery.isError,
        error: trainingTagsQuery.error,
        refetch: () => void trainingTagsQuery.refetch(),
      },
      'diet-badges': {
        id: 'diet-badges',
        title: 'Badges nutricionales',
        description: 'Badges usados en comidas de dietas.',
        badgeLabel: 'Dietas',
        values: dietBadgesQuery.data ?? [],
        isLoading: dietBadgesQuery.isLoading,
        isError: dietBadgesQuery.isError,
        error: dietBadgesQuery.error,
        refetch: () => void dietBadgesQuery.refetch(),
      },
    }),
    [
      dietBadgesQuery.data,
      dietBadgesQuery.error,
      dietBadgesQuery.isError,
      dietBadgesQuery.isLoading,
      dietBadgesQuery.refetch,
      equipmentQuery.data,
      equipmentQuery.error,
      equipmentQuery.isError,
      equipmentQuery.isLoading,
      equipmentQuery.refetch,
      muscleGroupsQuery.data,
      muscleGroupsQuery.error,
      muscleGroupsQuery.isError,
      muscleGroupsQuery.isLoading,
      muscleGroupsQuery.refetch,
      trainingTagsQuery.data,
      trainingTagsQuery.error,
      trainingTagsQuery.isError,
      trainingTagsQuery.isLoading,
      trainingTagsQuery.refetch,
    ]
  )

  const currentCatalog = catalogs[activeCatalog]
  const isRenamePending =
    renameMuscleGroup.isPending ||
    renameEquipment.isPending ||
    renameTrainingTag.isPending ||
    renameDietBadge.isPending
  const isDeletePending =
    deleteMuscleGroup.isPending ||
    deleteEquipment.isPending ||
    deleteTrainingTag.isPending ||
    deleteDietBadge.isPending

  useEffect(() => {
    setSearch('')
    setPage(1)
  }, [activeCatalog])

  useEffect(() => {
    setPage(1)
  }, [activeSearch])

  useEffect(() => {
    setDraftValue(editingItem?.value ?? '')
  }, [editingItem])

  const handleRename = async () => {
    if (!editingItem) return

    const nextValue = normalizeCatalogLabel(draftValue)

    if (
      !nextValue ||
      normalizeCatalogLabel(editingItem.value).toLocaleLowerCase() === nextValue.toLocaleLowerCase()
    ) {
      return
    }

    try {
      const result =
        editingItem.catalogId === 'muscle-groups'
          ? await renameMuscleGroup.mutateAsync({ from: editingItem.value, to: nextValue })
          : editingItem.catalogId === 'equipment'
            ? await renameEquipment.mutateAsync({ from: editingItem.value, to: nextValue })
            : editingItem.catalogId === 'training-tags'
              ? await renameTrainingTag.mutateAsync({ from: editingItem.value, to: nextValue })
              : await renameDietBadge.mutateAsync({ from: editingItem.value, to: nextValue })

      toast.success(
        `"${editingItem.value}" renombrado a "${result.value}". ${formatAffectedRecords(result.affected_count)}.`
      )
      setEditingItem(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido renombrar el badge'))
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    try {
      const result =
        deletingItem.catalogId === 'muscle-groups'
          ? await deleteMuscleGroup.mutateAsync(deletingItem.value)
          : deletingItem.catalogId === 'equipment'
            ? await deleteEquipment.mutateAsync(deletingItem.value)
            : deletingItem.catalogId === 'training-tags'
              ? await deleteTrainingTag.mutateAsync(deletingItem.value)
              : await deleteDietBadge.mutateAsync(deletingItem.value)

      toast.success(`"${result.value}" borrado. ${formatAffectedRecords(result.affected_count)}.`)
      setDeletingItem(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido borrar el badge'))
    }
  }

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleRename()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-none sm:shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-primary">
            Catalogo
          </p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Badges</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gestiona grupos musculares, equipamiento, tags de entrenamientos y badges
              nutricionales.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeCatalog} onValueChange={(value) => setActiveCatalog(value as CatalogId)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-4 lg:w-auto">
            <TabsTrigger value="muscle-groups" className="min-h-10 whitespace-normal">
              Grupos musculares
            </TabsTrigger>
            <TabsTrigger value="equipment" className="min-h-10 whitespace-normal">
              Equipamiento
            </TabsTrigger>
            <TabsTrigger value="training-tags" className="min-h-10 whitespace-normal">
              Tags entrenos
            </TabsTrigger>
            <TabsTrigger value="diet-badges" className="min-h-10 whitespace-normal">
              Badges dieta
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Buscar en ${currentCatalog.title.toLocaleLowerCase()}...`}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="muscle-groups" className="mt-4">
          <CatalogTable
            catalog={catalogs['muscle-groups']}
            search={activeSearch}
            page={page}
            onPageChange={setPage}
            onEdit={setEditingItem}
            onDelete={setDeletingItem}
          />
        </TabsContent>
        <TabsContent value="equipment" className="mt-4">
          <CatalogTable
            catalog={catalogs.equipment}
            search={activeSearch}
            page={page}
            onPageChange={setPage}
            onEdit={setEditingItem}
            onDelete={setDeletingItem}
          />
        </TabsContent>
        <TabsContent value="training-tags" className="mt-4">
          <CatalogTable
            catalog={catalogs['training-tags']}
            search={activeSearch}
            page={page}
            onPageChange={setPage}
            onEdit={setEditingItem}
            onDelete={setDeletingItem}
          />
        </TabsContent>
        <TabsContent value="diet-badges" className="mt-4">
          <CatalogTable
            catalog={catalogs['diet-badges']}
            search={activeSearch}
            page={page}
            onPageChange={setPage}
            onEdit={setEditingItem}
            onDelete={setDeletingItem}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar badge</DialogTitle>
            <DialogDescription>
              Renombrar "{editingItem?.value}" en{' '}
              {editingItem ? catalogs[editingItem.catalogId].badgeLabel.toLocaleLowerCase() : ''}.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            onKeyDown={handleRenameKeyDown}
            autoFocus
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRename}
              disabled={
                isRenamePending ||
                !normalizeCatalogLabel(draftValue) ||
                normalizeCatalogLabel(editingItem?.value ?? '').toLocaleLowerCase() ===
                  normalizeCatalogLabel(draftValue).toLocaleLowerCase()
              }
            >
              {isRenamePending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Borrar badge</DialogTitle>
            <DialogDescription>
              Borrar "{deletingItem?.value}" de{' '}
              {deletingItem ? catalogs[deletingItem.catalogId].badgeLabel.toLocaleLowerCase() : ''}.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingItem(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeletePending}>
              {isDeletePending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Borrando...
                </>
              ) : (
                'Borrar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

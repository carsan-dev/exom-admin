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
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import {
  useDeleteExerciseEquipment,
  useDeleteExerciseEquipmentValues,
  useDeleteExerciseMuscleGroup,
  useDeleteExerciseMuscleGroups,
  useExerciseEquipment,
  useExerciseMuscleGroups,
  useRenameExerciseEquipment,
  useRenameExerciseMuscleGroup,
} from '@/features/exercises/api'
import {
  useDeleteTrainingTag,
  useDeleteTrainingTags,
  useDeleteTrainingType,
  useDeleteTrainingTypes,
  useRenameTrainingType,
  useRenameTrainingTag,
  useTrainingTypeCatalogColors,
  useTrainingTypes,
  useTrainingTags,
  useUpdateTrainingTypeColor,
} from '@/features/trainings/api'
import { getTrainingAccentStyle, type CatalogValueWithColor } from '@/features/trainings/types'
import {
  useDeleteDietNutritionalBadge,
  useDeleteDietNutritionalBadges,
  useDeleteDietTag,
  useDeleteDietTags,
  useDietNutritionalBadgeCatalogColors,
  useDietNutritionalBadges,
  useDietTags,
  useRenameDietNutritionalBadge,
  useRenameDietTag,
  useUpdateDietNutritionalBadgeColor,
} from '@/features/diets/api'

const PAGE_SIZE = 10

type CatalogId =
  | 'muscle-groups'
  | 'equipment'
  | 'training-types'
  | 'training-tags'
  | 'diet-tags'
  | 'diet-badges'

interface CatalogItem {
  catalogId: CatalogId
  value: string
  color?: string
}

interface CatalogView {
  id: CatalogId
  title: string
  description: string
  badgeLabel: string
  canDelete: boolean
  supportsColor: boolean
  values: CatalogValueWithColor[]
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

function toCatalogValues(values: string[] | undefined): CatalogValueWithColor[] {
  return (values ?? []).map((value) => ({ value, color: '#6B7280' }))
}

function isValidCatalogColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
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
  selectedValues: Set<string>
  onSelectionChange: (values: Set<string>) => void
  onDeleteSelected: () => void
}

function CatalogTable({
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
            className="w-fit border-brand-soft/40 bg-brand-soft/10 text-brand-primary"
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

export function BadgesPage() {
  const [activeCatalog, setActiveCatalog] = useState<CatalogId>('muscle-groups')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<CatalogItem | null>(null)
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [draftValue, setDraftValue] = useState('')
  const [draftColor, setDraftColor] = useState('#6B7280')
  const deferredSearch = useDeferredValue(search)
  const activeSearch = deferredSearch.trim()

  const muscleGroupsQuery = useExerciseMuscleGroups()
  const equipmentQuery = useExerciseEquipment()
  const trainingTypesQuery = useTrainingTypes()
  const trainingTypeColorsQuery = useTrainingTypeCatalogColors()
  const trainingTagsQuery = useTrainingTags()
  const dietTagsQuery = useDietTags()
  const dietBadgesQuery = useDietNutritionalBadges()
  const dietBadgeColorsQuery = useDietNutritionalBadgeCatalogColors()

  const renameMuscleGroup = useRenameExerciseMuscleGroup()
  const deleteMuscleGroup = useDeleteExerciseMuscleGroup()
  const deleteMuscleGroups = useDeleteExerciseMuscleGroups()
  const renameEquipment = useRenameExerciseEquipment()
  const deleteEquipment = useDeleteExerciseEquipment()
  const deleteEquipmentValues = useDeleteExerciseEquipmentValues()
  const renameTrainingType = useRenameTrainingType()
  const deleteTrainingType = useDeleteTrainingType()
  const deleteTrainingTypes = useDeleteTrainingTypes()
  const updateTrainingTypeColor = useUpdateTrainingTypeColor()
  const renameTrainingTag = useRenameTrainingTag()
  const deleteTrainingTag = useDeleteTrainingTag()
  const deleteTrainingTags = useDeleteTrainingTags()
  const renameDietTag = useRenameDietTag()
  const deleteDietTag = useDeleteDietTag()
  const deleteDietTags = useDeleteDietTags()
  const renameDietBadge = useRenameDietNutritionalBadge()
  const updateDietBadgeColor = useUpdateDietNutritionalBadgeColor()
  const deleteDietBadge = useDeleteDietNutritionalBadge()
  const deleteDietBadges = useDeleteDietNutritionalBadges()

  const catalogs = useMemo<Record<CatalogId, CatalogView>>(
    () => ({
      'muscle-groups': {
        id: 'muscle-groups',
        title: 'Grupos musculares',
        description: 'Badges usados en ejercicios.',
        badgeLabel: 'Ejercicios',
        canDelete: true,
        supportsColor: false,
        values: toCatalogValues(muscleGroupsQuery.data),
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
        canDelete: true,
        supportsColor: false,
        values: toCatalogValues(equipmentQuery.data),
        isLoading: equipmentQuery.isLoading,
        isError: equipmentQuery.isError,
        error: equipmentQuery.error,
        refetch: () => void equipmentQuery.refetch(),
      },
      'training-types': {
        id: 'training-types',
        title: 'Tipos de entrenamientos',
        description:
          'Valores reutilizables en entrenamientos y en reglas de logros por tipo.',
        badgeLabel: 'Entrenamientos',
        canDelete: true,
        supportsColor: true,
        values: trainingTypeColorsQuery.data ?? toCatalogValues(trainingTypesQuery.data),
        isLoading: trainingTypesQuery.isLoading || trainingTypeColorsQuery.isLoading,
        isError: trainingTypesQuery.isError || trainingTypeColorsQuery.isError,
        error: trainingTypeColorsQuery.error ?? trainingTypesQuery.error,
        refetch: () => {
          void trainingTypesQuery.refetch()
          void trainingTypeColorsQuery.refetch()
        },
      },
      'training-tags': {
        id: 'training-tags',
        title: 'Tags de entrenamientos',
        description: 'Badges usados en entrenamientos.',
        badgeLabel: 'Entrenamientos',
        canDelete: true,
        supportsColor: false,
        values: toCatalogValues(trainingTagsQuery.data),
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
        canDelete: true,
        supportsColor: true,
        values: dietBadgeColorsQuery.data ?? toCatalogValues(dietBadgesQuery.data),
        isLoading: dietBadgesQuery.isLoading || dietBadgeColorsQuery.isLoading,
        isError: dietBadgesQuery.isError || dietBadgeColorsQuery.isError,
        error: dietBadgeColorsQuery.error ?? dietBadgesQuery.error,
        refetch: () => {
          void dietBadgesQuery.refetch()
          void dietBadgeColorsQuery.refetch()
        },
      },
      'diet-tags': {
        id: 'diet-tags',
        title: 'Tags de dietas',
        description: 'Tags usados para organizar dietas.',
        badgeLabel: 'Dietas',
        canDelete: true,
        supportsColor: false,
        values: toCatalogValues(dietTagsQuery.data),
        isLoading: dietTagsQuery.isLoading,
        isError: dietTagsQuery.isError,
        error: dietTagsQuery.error,
        refetch: () => void dietTagsQuery.refetch(),
      },
    }),
    [
      dietBadgesQuery,
      dietBadgeColorsQuery,
      equipmentQuery,
      muscleGroupsQuery,
      trainingTypesQuery,
      trainingTypeColorsQuery,
      trainingTagsQuery,
      dietTagsQuery,
    ]
  )

  const currentCatalog = catalogs[activeCatalog]
  const isRenamePending =
    renameMuscleGroup.isPending ||
    renameEquipment.isPending ||
    renameTrainingType.isPending ||
    updateTrainingTypeColor.isPending ||
    renameTrainingTag.isPending ||
    renameDietTag.isPending ||
    renameDietBadge.isPending ||
    updateDietBadgeColor.isPending
  const isDeletePending =
    deleteMuscleGroup.isPending ||
    deleteEquipment.isPending ||
    deleteTrainingType.isPending ||
    deleteTrainingTag.isPending ||
    deleteDietTag.isPending ||
    deleteDietBadge.isPending
  const isBulkDeletePending = deleteMuscleGroups.isPending || deleteEquipmentValues.isPending ||
    deleteTrainingTypes.isPending || deleteTrainingTags.isPending || deleteDietTags.isPending ||
    deleteDietBadges.isPending
  useUnsavedChanges(
    'badge-rename',
    Boolean(
      editingItem &&
        (normalizeCatalogLabel(draftValue) !== normalizeCatalogLabel(editingItem.value) ||
          draftColor !== (editingItem.color ?? '#6B7280') ||
          isRenamePending),
    ),
  )

  useEffect(() => {
    setSearch('')
    setPage(1)
    setSelectedValues(new Set())
  }, [activeCatalog])

  useEffect(() => {
    setPage(1)
    setSelectedValues(new Set())
  }, [activeSearch])

  const handleBulkDelete = async () => {
    const values = Array.from(selectedValues)
    if (values.length === 0) return
    try {
      const result = activeCatalog === 'muscle-groups'
        ? await deleteMuscleGroups.mutateAsync(values)
        : activeCatalog === 'equipment'
          ? await deleteEquipmentValues.mutateAsync(values)
          : activeCatalog === 'training-types'
            ? await deleteTrainingTypes.mutateAsync(values)
          : activeCatalog === 'training-tags'
            ? await deleteTrainingTags.mutateAsync(values)
            : activeCatalog === 'diet-tags'
              ? await deleteDietTags.mutateAsync(values)
            : await deleteDietBadges.mutateAsync(values)
      toast.success(`${result.values.length} valores borrados. ${formatAffectedRecords(result.affected_count)}.`)
      setSelectedValues(new Set())
      setBulkDeleteOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se han podido borrar los valores'))
    }
  }

  useEffect(() => {
    setDraftValue(editingItem?.value ?? '')
    setDraftColor(editingItem?.color ?? '#6B7280')
  }, [editingItem])

  const handleRename = async () => {
    if (!editingItem) return

    const nextValue = normalizeCatalogLabel(draftValue)
    const nextColor = draftColor.toUpperCase()
    const supportsColor = catalogs[editingItem.catalogId].supportsColor
    const renamed =
      normalizeCatalogLabel(editingItem.value).toLocaleLowerCase() !== nextValue.toLocaleLowerCase()
    const colorChanged = supportsColor && nextColor !== (editingItem.color ?? '#6B7280').toUpperCase()

    if (!nextValue || (supportsColor && !isValidCatalogColor(nextColor)) || (!renamed && !colorChanged)) {
      return
    }

    try {
      const result = renamed
        ? editingItem.catalogId === 'muscle-groups'
          ? await renameMuscleGroup.mutateAsync({ from: editingItem.value, to: nextValue })
          : editingItem.catalogId === 'equipment'
            ? await renameEquipment.mutateAsync({ from: editingItem.value, to: nextValue })
            : editingItem.catalogId === 'training-types'
              ? await renameTrainingType.mutateAsync({ from: editingItem.value, to: nextValue })
              : editingItem.catalogId === 'training-tags'
                ? await renameTrainingTag.mutateAsync({ from: editingItem.value, to: nextValue })
                : editingItem.catalogId === 'diet-tags'
                  ? await renameDietTag.mutateAsync({ from: editingItem.value, to: nextValue })
                  : await renameDietBadge.mutateAsync({ from: editingItem.value, to: nextValue })
        : { value: nextValue, affected_count: 0 }

      if (colorChanged) {
        if (editingItem.catalogId === 'training-types') {
          await updateTrainingTypeColor.mutateAsync({ value: nextValue, color: nextColor })
        } else if (editingItem.catalogId === 'diet-badges') {
          await updateDietBadgeColor.mutateAsync({ value: nextValue, color: nextColor })
        }
      }

      toast.success(
        renamed
          ? `"${editingItem.value}" renombrado a "${result.value}". ${formatAffectedRecords(result.affected_count)}.`
          : `Color de "${result.value}" actualizado.`
      )
      setEditingItem(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido renombrar el valor'))
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
          : deletingItem.catalogId === 'training-types'
              ? await deleteTrainingType.mutateAsync(deletingItem.value)
            : deletingItem.catalogId === 'training-tags'
              ? await deleteTrainingTag.mutateAsync(deletingItem.value)
              : deletingItem.catalogId === 'diet-tags'
                ? await deleteDietTag.mutateAsync(deletingItem.value)
                : await deleteDietBadge.mutateAsync(deletingItem.value)

      if (!result) {
        return
      }

      toast.success(`"${result.value}" borrado. ${formatAffectedRecords(result.affected_count)}.`)
      setDeletingItem(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido borrar el valor'))
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
            Catálogo
          </p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Badges</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gestiona grupos musculares, equipamiento, tipos y tags de entrenamientos y badges
              nutricionales.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeCatalog} onValueChange={(value) => setActiveCatalog(value as CatalogId)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3 lg:grid-cols-6 lg:w-auto">
            <TabsTrigger value="muscle-groups" className="min-h-10 whitespace-normal">
              Grupos musculares
            </TabsTrigger>
            <TabsTrigger value="equipment" className="min-h-10 whitespace-normal">
              Equipamiento
            </TabsTrigger>
            <TabsTrigger value="training-types" className="min-h-10 whitespace-normal">
              Tipos entrenos
            </TabsTrigger>
            <TabsTrigger value="training-tags" className="min-h-10 whitespace-normal">
              Tags entrenos
            </TabsTrigger>
            <TabsTrigger value="diet-badges" className="min-h-10 whitespace-normal">
              Badges dieta
            </TabsTrigger>
            <TabsTrigger value="diet-tags" className="min-h-10 whitespace-normal">
              Tags dieta
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
            selectedValues={selectedValues}
            onSelectionChange={setSelectedValues}
            onDeleteSelected={() => setBulkDeleteOpen(true)}
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
            selectedValues={selectedValues}
            onSelectionChange={setSelectedValues}
            onDeleteSelected={() => setBulkDeleteOpen(true)}
          />
        </TabsContent>
        <TabsContent value="training-types" className="mt-4">
          <CatalogTable
            catalog={catalogs['training-types']}
            search={activeSearch}
            page={page}
            onPageChange={setPage}
            onEdit={setEditingItem}
            onDelete={setDeletingItem}
            selectedValues={selectedValues}
            onSelectionChange={setSelectedValues}
            onDeleteSelected={() => setBulkDeleteOpen(true)}
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
            selectedValues={selectedValues}
            onSelectionChange={setSelectedValues}
            onDeleteSelected={() => setBulkDeleteOpen(true)}
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
            selectedValues={selectedValues}
            onSelectionChange={setSelectedValues}
            onDeleteSelected={() => setBulkDeleteOpen(true)}
          />
        </TabsContent>
        <TabsContent value="diet-tags" className="mt-4">
          <CatalogTable
            catalog={catalogs['diet-tags']}
            search={activeSearch}
            page={page}
            onPageChange={setPage}
            onEdit={setEditingItem}
            onDelete={setDeletingItem}
            selectedValues={selectedValues}
            onSelectionChange={setSelectedValues}
            onDeleteSelected={() => setBulkDeleteOpen(true)}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent disableOutsideClose className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar valor</DialogTitle>
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

          {editingItem && catalogs[editingItem.catalogId].supportsColor ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={isValidCatalogColor(draftColor) ? draftColor : '#6B7280'}
                  onChange={(event) => setDraftColor(event.target.value.toUpperCase())}
                  className="h-10 w-14 cursor-pointer p-1"
                  aria-label="Color"
                />
                <Input
                  value={draftColor}
                  onChange={(event) => setDraftColor(event.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>
              <Badge variant="outline" className="w-fit" style={getTrainingAccentStyle(draftColor)}>
                {normalizeCatalogLabel(draftValue) || editingItem.value}
              </Badge>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRename}
              disabled={
                isRenamePending ||
                !normalizeCatalogLabel(draftValue) ||
                (Boolean(editingItem && catalogs[editingItem.catalogId].supportsColor) &&
                  !isValidCatalogColor(draftColor)) ||
                (normalizeCatalogLabel(editingItem?.value ?? '').toLocaleLowerCase() ===
                  normalizeCatalogLabel(draftValue).toLocaleLowerCase() &&
                  draftColor === (editingItem?.color ?? '#6B7280'))
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
            <DialogTitle>Borrar valor</DialogTitle>
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

      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => !isBulkDeletePending && setBulkDeleteOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar {selectedValues.size} valores</DialogTitle>
            <DialogDescription>
              Se quitarán de todos los {currentCatalog.badgeLabel.toLocaleLowerCase()} activos donde estén asignados.
              Los recursos no se eliminarán. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={isBulkDeletePending}>Cancelar</Button>
            <Button variant="destructive" onClick={() => void handleBulkDelete()} disabled={isBulkDeletePending}>
              {isBulkDeletePending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Eliminando...</> : 'Eliminar selección'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

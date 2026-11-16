import { type ChangeEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import {
  filtersToApiParams,
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { useResourceApprovalBatch } from '@/features/approval-requests/api'
import { buildResourceApprovalMap } from '@/features/approval-requests/types'
import {
  getPageSearchParam,
  replacePaginationSearchParams,
} from '@/lib/pagination-search-params'
import { getSortSearchParams, toggleSortSearchParams } from '@/lib/sort-search-params'
import {
  getApiErrorMessage,
  type DietsListParams,
  useDiet,
  useDietNutritionalBadgeCatalogColors,
  useDietNutritionalBadges,
  useDietTags,
  useDiets,
  useIngredientsList,
  useDietGroups,
  useCreateDietGroup,
  useUpdateDietGroup,
  useDeleteDietGroup,
  useUpdateDietGroupMembership,
} from '../api'
import { AI_IMPORT_PROMPT, buildImportPromptWithIngredientCatalog } from '../ai-import-prompt'
import { AiImportPromptDialog } from '../components/ai-import-prompt-dialog'
import { DeleteDietDialog } from '../components/delete-diet-dialog'
import { DietDetailDialog } from '../components/diet-detail-dialog'
import { DietFormDialog } from '../components/diet-form-dialog'
import { DietsEmptyCard } from '../components/diets-empty-card'
import { DietsErrorCard } from '../components/diets-error-card'
import { DietsListPanel } from '../components/diets-list-panel'
import { DietsPageHeader } from '../components/diets-page-header'
import { DietsSelectionBar } from '../components/diets-selection-bar'
import { DietsTableSkeleton } from '../components/diets-table-skeleton'
import { parseDietImport } from '../import-diet'
import type { DietFormValues } from '../schemas'
import type { Diet } from '../types'
import type { CatalogGroup, CatalogGroupFilter } from '../../catalog-groups/types'
import { CatalogGroupStrip } from '../../catalog-groups/components/catalog-group-strip'
import { CatalogGroupDialog, DeleteCatalogGroupDialog, MoveToGroupDialog } from '../../catalog-groups/components/catalog-group-dialogs'
import { resolveDraggedCatalogIds } from '../../catalog-groups/drag-selection'

const PAGE_SIZE = 10
const MEAL_TYPE_OPTIONS: FilterOption[] = [
  { value: 'BREAKFAST', label: 'Desayuno' },
  { value: 'LUNCH', label: 'Comida' },
  { value: 'SNACK', label: 'Snack' },
  { value: 'DINNER', label: 'Cena' },
]

function toFilterOptions(values?: string[]): FilterOption[] {
  return values?.map((value) => ({ value, label: value })) ?? []
}

export function DietsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDiet, setSelectedDiet] = useState<Diet | null>(null)
  const [editingDiet, setEditingDiet] = useState<Diet | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [importedValues, setImportedValues] = useState<DietFormValues | null>(null)
  const [importIssues, setImportIssues] = useState<string[]>([])
  const [importPromptOpen, setImportPromptOpen] = useState(false)
  const [ingredientCatalogRequested, setIngredientCatalogRequested] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [groupToEdit, setGroupToEdit] = useState<CatalogGroup | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<CatalogGroup | null>(null)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [groupFilter, setGroupFilter] = useState<CatalogGroupFilter>('all')
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const page = getPageSearchParam(searchParams.get('page'))
  const sort = getSortSearchParams(searchParams)
  const deferredSearch = useDeferredValue(search)
  const activeSearch = deferredSearch.trim()
  const tagsQuery = useDietTags()
  const nutritionalBadgesQuery = useDietNutritionalBadges()
  const nutritionalBadgeColorsQuery = useDietNutritionalBadgeCatalogColors()
  const ingredientsQuery = useIngredientsList({ enabled: importPromptOpen || ingredientCatalogRequested })
  const groupsQuery = useDietGroups()
  const createGroup = useCreateDietGroup()
  const updateGroup = useUpdateDietGroup()
  const deleteGroup = useDeleteDietGroup()
  const moveMembership = useUpdateDietGroupMembership()
  const sections = useMemo<FilterSectionConfig[]>(
    () => [
      {
        type: 'multi',
        key: 'meal_types',
        label: 'Tipo de comida',
        options: MEAL_TYPE_OPTIONS,
      },
      {
        type: 'multi',
        key: 'tags',
        label: 'Etiquetas',
        options: toFilterOptions(tagsQuery.data),
        isLoading: tagsQuery.isLoading,
      },
      {
        type: 'multi',
        key: 'nutritional_badges',
        label: 'Badges nutricionales',
        options: toFilterOptions(nutritionalBadgesQuery.data),
        isLoading: nutritionalBadgesQuery.isLoading,
      },
      {
        type: 'date-range',
        key: 'updated',
        label: 'Actualizada',
      },
    ],
    [nutritionalBadgesQuery.data, nutritionalBadgesQuery.isLoading, tagsQuery.data, tagsQuery.isLoading]
  )
  const filters = useListFilters(sections)
  const dietFilterParams = filtersToApiParams(filters.values, sections) as Partial<DietsListParams>
  const pageResetKey = `${activeSearch}::${JSON.stringify(dietFilterParams)}::${groupFilter}`
  const lastPageResetKeyRef = useRef(pageResetKey)

  useEffect(() => {
    if (lastPageResetKeyRef.current === pageResetKey) {
      return
    }

    lastPageResetKeyRef.current = pageResetKey
    replacePaginationSearchParams(setSearchParams, { page: 1 })
  }, [pageResetKey, setSearchParams])

  const dietsQuery = useDiets({
    page,
    limit: PAGE_SIZE,
    search: activeSearch,
    group_id: groupFilter !== 'all' && groupFilter !== 'ungrouped' ? groupFilter : undefined,
    ungrouped: groupFilter === 'ungrouped',
    sort_by: sort.sort_by,
    sort_dir: sort.sort_dir,
    ...dietFilterParams,
  })
  const diets = dietsQuery.data?.data ?? []
  const selectedDietDetailQuery = useDiet(
    detailDialogOpen ? selectedDiet?.id : undefined
  )
  const editingDietDetailQuery = useDiet(
    formDialogOpen && editingDiet ? editingDiet.id : undefined
  )
  const dietApprovalQuery = useResourceApprovalBatch(
    'diet',
    diets.map((diet) => diet.id)
  )
  const dietApprovalById = buildResourceApprovalMap(dietApprovalQuery.data ?? [])
  const total = dietsQuery.data?.total ?? 0
  const totalPages = Math.max(1, dietsQuery.data?.totalPages ?? 1)
  const hasActiveFilters = filters.activeCount > 0
  const hasQuery = activeSearch.length > 0 || hasActiveFilters
  const groups = groupsQuery.data ?? []
  const activeGroupName = groupFilter === 'all' ? null : groupFilter === 'ungrouped' ? 'Sin grupo' : groups.find((group) => group.id === groupFilter)?.name ?? null
  const organizationPending = createGroup.isPending || updateGroup.isPending || deleteGroup.isPending || moveMembership.isPending

  useEffect(() => { setSelectedIds(new Set()) }, [pageResetKey])

  const handleGroupSubmit = (name: string) => {
    const mutation = groupToEdit ? updateGroup.mutateAsync({ id: groupToEdit.id, name }) : createGroup.mutateAsync(name)
    mutation.then(() => { setGroupDialogOpen(false); setGroupToEdit(null); toast.success('Grupo guardado') }).catch((error) => toast.error(getApiErrorMessage(error, 'No se pudo guardar el grupo')))
  }

  const handleMove = (ids: string[], groupId: string | null) => {
    moveMembership.mutate({ ids, groupId }, {
      onSuccess: (result) => { setSelectedIds(new Set()); setMoveDialogOpen(false); toast.success(`${result.affected_count} elementos movidos`) },
      onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudieron mover los elementos')),
    })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || !String(over.id).startsWith('group:')) return
    const destination = String(over.id).slice(6)
    const activeId = String(active.id)
    const ids = resolveDraggedCatalogIds(activeId, selectedIds)
    handleMove(ids, destination === 'ungrouped' ? null : destination)
  }

  const handleCreate = () => {
    setEditingDiet(null)
    setIsDuplicate(false)
    setImportedValues(null)
    setImportIssues([])
    setFormDialogOpen(true)
  }

  const handleImportClick = () => {
    setIngredientCatalogRequested(true)
    importInputRef.current?.click()
  }

  const handleCopyImportPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_IMPORT_PROMPT)
      toast.success('Plantilla copiada')
    } catch {
      toast.error('No se ha podido copiar el prompt')
    }
  }

  const handleCopyImportPromptWithCatalog = async () => {
    const ingredientNames = (ingredientsQuery.data?.data ?? [])
      .map((ingredient) => ingredient.name.trim())
      .filter(Boolean)

    if (ingredientNames.length === 0) {
      toast.error('No hay ingredientes cargados para incluir en el prompt')
      return
    }

    try {
      await navigator.clipboard.writeText(buildImportPromptWithIngredientCatalog(ingredientNames))
      toast.success(`Prompt copiado con ${ingredientNames.length} ingredientes`)
    } catch {
      toast.error('No se ha podido copiar el prompt')
    }
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.error('Selecciona un archivo .json')
      return
    }

    try {
      const text = await file.text()
      const result = parseDietImport(file.name, text, ingredientsQuery.data?.data ?? [])

      setEditingDiet(null)
      setIsDuplicate(false)
      setImportedValues(result.values)
      setImportIssues(result.issues)
      setFormDialogOpen(true)

      if (result.issues.length > 0) {
        toast.warning('Dieta importada con avisos. Revisa ingredientes no enlazados.')
        return
      }

      toast.success('Dieta importada. Revisa y guarda para crear.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se ha podido importar el archivo')
    }
  }

  const handleView = (diet: Diet) => {
    setSelectedDiet(diet)
    setDetailDialogOpen(true)
  }

  const handleEdit = (diet: Diet) => {
    setEditingDiet(diet)
    setIsDuplicate(false)
    setImportedValues(null)
    setImportIssues([])
    setFormDialogOpen(true)
  }

  const handleDuplicate = (diet: Diet) => {
    setEditingDiet(diet)
    setIsDuplicate(true)
    setImportedValues(null)
    setImportIssues([])
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
      setImportedValues(null)
      setImportIssues([])
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
    <DndContext onDragEnd={handleDragEnd}>
    <div className="space-y-6">
      <DietsPageHeader
        total={total}
        importInputRef={importInputRef}
        onImportFile={handleImportFile}
        onImportClick={handleImportClick}
        onOpenImportPrompt={() => setImportPromptOpen(true)}
        onCreate={handleCreate}
      />

      <CatalogGroupStrip groups={groups} activeFilter={groupFilter} onFilterChange={setGroupFilter} disabled={organizationPending} onCreate={() => { setGroupToEdit(null); setGroupDialogOpen(true) }} onEdit={(group) => { setGroupToEdit(group); setGroupDialogOpen(true) }} onDelete={setGroupToDelete} />

      {/* Content */}
      {dietsQuery.isLoading ? (
        <DietsTableSkeleton />
      ) : dietsQuery.isError ? (
        <DietsErrorCard
          message={getApiErrorMessage(dietsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
          onRetry={() => dietsQuery.refetch()}
        />
      ) : total === 0 && !hasQuery ? (
        <DietsEmptyCard onCreate={handleCreate} />
      ) : (
        <DietsListPanel
          title={activeGroupName ? `Dietas · ${activeGroupName}` : 'Listado de dietas'}
          search={search}
          onSearchChange={setSearch}
          sections={sections}
          filters={filters}
          diets={diets}
          approvalById={dietApprovalById}
          onView={handleView}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortBy={sort.sort_by}
          sortDir={sort.sort_dir}
          onSortChange={(field) => toggleSortSearchParams(setSearchParams, field)}
          movementDisabled={organizationPending}
          nutritionalBadgeColors={nutritionalBadgeColorsQuery.data}
          page={page}
          totalPages={totalPages}
          onPreviousPage={() =>
            replacePaginationSearchParams(setSearchParams, {
              page: Math.max(1, page - 1),
            })
          }
          onNextPage={() =>
            replacePaginationSearchParams(setSearchParams, {
              page: Math.min(totalPages, page + 1),
            })
          }
        />
      )}

      {/* Dialogs */}
      {selectedIds.size > 0 && (
        <DietsSelectionBar
          count={selectedIds.size}
          disabled={organizationPending}
          onMove={() => setMoveDialogOpen(true)}
        />
      )}
      <CatalogGroupDialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen} group={groupToEdit} pending={organizationPending} onSubmit={handleGroupSubmit} />
      <DeleteCatalogGroupDialog open={Boolean(groupToDelete)} onOpenChange={(open) => !open && setGroupToDelete(null)} group={groupToDelete} pending={organizationPending} onConfirm={() => groupToDelete && deleteGroup.mutate(groupToDelete.id, { onSuccess: () => { if (groupFilter === groupToDelete.id) setGroupFilter('all'); setGroupToDelete(null); toast.success('Grupo eliminado') }, onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo eliminar el grupo')) })} />
      <MoveToGroupDialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen} groups={groups} count={selectedIds.size} pending={organizationPending} onConfirm={(groupId) => handleMove([...selectedIds], groupId)} />
      <DietFormDialog
        open={formDialogOpen && (!editingDiet || Boolean(editingDietDetailQuery.data))}
        onOpenChange={handleFormDialogOpenChange}
        diet={editingDiet ? editingDietDetailQuery.data : null}
        isDuplicate={isDuplicate}
        importedValues={importedValues}
        importIssues={importIssues}
        onSaved={() => {
          if (!editingDiet || isDuplicate) {
            replacePaginationSearchParams(setSearchParams, { page: 1 })
            setSearch('')
          }
        }}
      />

      <DietDetailDialog
        diet={selectedDietDetailQuery.data ?? null}
        open={detailDialogOpen}
        onOpenChange={handleDetailDialogOpenChange}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
      />

      <DeleteDietDialog
        diet={selectedDiet}
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        onDeleted={() => replacePaginationSearchParams(setSearchParams, { page: 1 })}
      />


      <AiImportPromptDialog
        open={importPromptOpen}
        onOpenChange={setImportPromptOpen}
        ingredientsLoading={ingredientsQuery.isLoading}
        ingredientsError={ingredientsQuery.isError}
        ingredientCount={ingredientsQuery.data?.data.length ?? 0}
        onCopyPrompt={handleCopyImportPrompt}
        onCopyPromptWithCatalog={handleCopyImportPromptWithCatalog}
      />
    </div>
    </DndContext>
  )
}

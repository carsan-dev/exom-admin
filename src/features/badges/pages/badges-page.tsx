import { useDeferredValue, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { getApiErrorMessage } from '@/lib/api-utils'
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
import { type CatalogValueWithColor } from '@/features/trainings/types'
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
import { BadgesPageHeader } from '../components/badges-page-header'
import { BulkDeleteCatalogDialog } from '../components/bulk-delete-catalog-dialog'
import {
  isValidCatalogColor,
  normalizeCatalogLabel,
  type CatalogId,
  type CatalogItem,
  type CatalogView,
} from '../components/catalog'
import { CatalogTable } from '../components/catalog-table'
import { CatalogTabsToolbar } from '../components/catalog-tabs-toolbar'
import { DeleteCatalogValueDialog } from '../components/delete-catalog-value-dialog'
import { EditCatalogValueDialog } from '../components/edit-catalog-value-dialog'

function formatAffectedRecords(count: number) {
  return count === 1 ? '1 registro actualizado' : `${count} registros actualizados`
}

function toCatalogValues(values: string[] | undefined): CatalogValueWithColor[] {
  return (values ?? []).map((value) => ({ value, color: '#6B7280' }))
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
      <BadgesPageHeader />

      <Tabs value={activeCatalog} onValueChange={(value) => setActiveCatalog(value as CatalogId)}>
        <CatalogTabsToolbar
          search={search}
          onSearchChange={setSearch}
          catalogTitle={currentCatalog.title}
        />

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

      <EditCatalogValueDialog
        editingItem={editingItem}
        catalogLabel={editingItem ? catalogs[editingItem.catalogId].badgeLabel.toLocaleLowerCase() : ''}
        supportsColor={Boolean(editingItem && catalogs[editingItem.catalogId].supportsColor)}
        draftValue={draftValue}
        draftColor={draftColor}
        onDraftValueChange={setDraftValue}
        onDraftColorChange={setDraftColor}
        onDraftValueKeyDown={handleRenameKeyDown}
        isPending={isRenamePending}
        saveDisabled={
          isRenamePending ||
          !normalizeCatalogLabel(draftValue) ||
          (Boolean(editingItem && catalogs[editingItem.catalogId].supportsColor) &&
            !isValidCatalogColor(draftColor)) ||
          (normalizeCatalogLabel(editingItem?.value ?? '').toLocaleLowerCase() ===
            normalizeCatalogLabel(draftValue).toLocaleLowerCase() &&
            draftColor === (editingItem?.color ?? '#6B7280'))
        }
        onSave={handleRename}
        onClose={() => setEditingItem(null)}
      />

      <DeleteCatalogValueDialog
        deletingItem={deletingItem}
        catalogLabel={deletingItem ? catalogs[deletingItem.catalogId].badgeLabel.toLocaleLowerCase() : ''}
        isPending={isDeletePending}
        onConfirm={handleDelete}
        onClose={() => setDeletingItem(null)}
      />

      <BulkDeleteCatalogDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !isBulkDeletePending && setBulkDeleteOpen(open)}
        selectedCount={selectedValues.size}
        catalogLabel={currentCatalog.badgeLabel.toLocaleLowerCase()}
        isPending={isBulkDeletePending}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void handleBulkDelete()}
      />
    </div>
  )
}

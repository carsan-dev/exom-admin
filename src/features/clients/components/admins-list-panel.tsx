import { FilterToolbar, type FilterSectionConfig, type UseListFiltersResult } from '@/components/filters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdminUserListItem } from '../types'
import { AdminsTable } from './admins-table'
import { PaginationBar } from './pagination-bar'

interface AdminsListPanelProps {
  title: string
  description: string
  noResultsMessage: string
  search: string
  onSearchChange: (value: string) => void
  sections: FilterSectionConfig[]
  filters: UseListFiltersResult
  admins: AdminUserListItem[]
  currentUserId?: string
  onEdit: (admin: AdminUserListItem) => void
  onUnlock: (admin: AdminUserListItem) => void
  onChangeRole: (admin: AdminUserListItem) => void
  onToggleStatus: (admin: AdminUserListItem) => void
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}

export function AdminsListPanel({
  title,
  description,
  noResultsMessage,
  search,
  onSearchChange,
  sections,
  filters,
  admins,
  currentUserId,
  onEdit,
  onUnlock,
  onChangeRole,
  onToggleStatus,
  page,
  totalPages,
  onPrevious,
  onNext,
}: AdminsListPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FilterToolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar por nombre o email..."
          sections={sections}
          filters={filters}
        />

        {admins.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{noResultsMessage}</p>
        ) : (
          <AdminsTable
            admins={admins}
            currentUserId={currentUserId}
            onEdit={onEdit}
            onUnlock={onUnlock}
            onChangeRole={onChangeRole}
            onToggleStatus={onToggleStatus}
          />
        )}

        <PaginationBar page={page} totalPages={totalPages} onPrevious={onPrevious} onNext={onNext} />
      </CardContent>
    </Card>
  )
}

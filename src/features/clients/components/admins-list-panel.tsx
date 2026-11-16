import { FilterToolbar, type FilterSectionConfig, type UseListFiltersResult } from '@/components/filters'
import { EmptyState } from '@/components/page'
import type { AdminUserListItem } from '../types'
import { AdminsTable } from './admins-table'
import { PaginationBar } from './pagination-bar'
import { UsersListSection } from './users-list-section'

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
    <UsersListSection title={title} description={description}>
      <div className="space-y-4">
        <FilterToolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar por nombre o email..."
          sections={sections}
          filters={filters}
        />

        {admins.length === 0 ? (
          <EmptyState className="border-y border-border" title={noResultsMessage} />
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
      </div>
    </UsersListSection>
  )
}

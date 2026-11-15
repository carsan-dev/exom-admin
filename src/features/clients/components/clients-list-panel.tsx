import { FilterToolbar, type FilterSectionConfig, type UseListFiltersResult } from '@/components/filters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Client, Role } from '../types'
import { ClientsTable } from './clients-table'
import { PaginationBar } from './pagination-bar'

interface ClientsListPanelProps {
  title: string
  description: string
  search: string
  onSearchChange: (value: string) => void
  sections: FilterSectionConfig[]
  filters: UseListFiltersResult
  clients: Client[]
  currentUserRole: Role
  actionDialogOpen: boolean
  onUnlock: (client: Client) => void
  onChangeRole: (client: Client) => void
  onManageAssignments: (client: Client) => void
  onToggleStatus: (client: Client) => void
  onArchive: (client: Client) => void
  onDelete: (client: Client) => void
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}

export function ClientsListPanel({
  title,
  description,
  search,
  onSearchChange,
  sections,
  filters,
  clients,
  currentUserRole,
  actionDialogOpen,
  onUnlock,
  onChangeRole,
  onManageAssignments,
  onToggleStatus,
  onArchive,
  onDelete,
  page,
  totalPages,
  onPrevious,
  onNext,
}: ClientsListPanelProps) {
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

        {clients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron clientes con la búsqueda y filtros actuales.
          </p>
        ) : (
          <ClientsTable
            actionDialogOpen={actionDialogOpen}
            onDelete={onDelete}
            onArchive={onArchive}
            clients={clients}
            currentUserRole={currentUserRole}
            onUnlock={onUnlock}
            onChangeRole={onChangeRole}
            onManageAssignments={onManageAssignments}
            onToggleStatus={onToggleStatus}
          />
        )}

        <PaginationBar page={page} totalPages={totalPages} onPrevious={onPrevious} onNext={onNext} />
      </CardContent>
    </Card>
  )
}

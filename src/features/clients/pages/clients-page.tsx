import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  filtersToApiParams,
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import {
  buildPaginationSearchParams,
  getPageSearchParam,
  hasSearchParamsChanged,
  replacePaginationSearchParams,
} from '@/lib/pagination-search-params'
import {
  getApiErrorMessage,
  type ClientsListParams,
  type UsersListParams,
  useAllUsers,
  useClients,
} from '../api'
import { AdminsListPanel } from '../components/admins-list-panel'
import { ChangeRoleDialog } from '../components/change-role-dialog'
import { ClientsArchiveToggle } from '../components/clients-archive-toggle'
import { ClientsListPanel } from '../components/clients-list-panel'
import { ClientsPageHeader } from '../components/clients-page-header'
import { ClientsTabsBar } from '../components/clients-tabs-bar'
import { ArchiveClientDialog } from '../components/archive-client-dialog'
import { DeleteClientDialog } from '../components/delete-client-dialog'
import { ClientDeletionsPanel } from '../components/client-deletions-panel'
import { CreateAdminDialog } from '../components/create-admin-dialog'
import { CreateClientDialog } from '../components/create-client-dialog'
import { EditUserDialog } from '../components/edit-user-dialog'
import { ManageClientAssignmentsDialog } from '../components/manage-client-assignments-dialog'
import { ToggleUserStatusDialog } from '../components/toggle-user-status-dialog'
import { UnlockDialog } from '../components/unlock-dialog'
import { AdminsTableSkeleton, ClientsTableSkeleton } from '../components/users-table-skeletons'
import { UsersListEmptyCard } from '../components/users-list-empty-card'
import { UsersListErrorCard } from '../components/users-list-error-card'
import type { AdminUserListItem, Client } from '../types'

const PAGE_SIZE = 10
const USER_STATUS_OPTIONS: FilterOption[] = [
  { value: 'ACTIVE', label: 'Activa' },
  { value: 'LOCKED', label: 'Bloqueada' },
  { value: 'INACTIVE', label: 'Inactiva' },
]
const CLIENT_LEVEL_OPTIONS: FilterOption[] = [
  { value: 'PRINCIPIANTE', label: 'Principiante' },
  { value: 'INTERMEDIO', label: 'Intermedio' },
  { value: 'AVANZADO', label: 'Avanzado' },
]
const ASSIGNMENT_STATE_OPTIONS: FilterOption[] = [
  { value: 'ASSIGNED', label: 'Con admins' },
  { value: 'UNASSIGNED', label: 'Sin admins' },
]


type ManageableUser = Client | AdminUserListItem
type ClientsTab = 'clients' | 'admins' | 'super-admins'

function getClientsTab(value: string | null): ClientsTab {
  return value === 'admins' || value === 'super-admins' ? value : 'clients'
}

export function ClientsPage() {
  const currentUser = useAuth((state) => state.user)
  const currentUserRole = currentUser?.role ?? 'ADMIN'
  const currentUserId = currentUser?.id
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN'

  const [searchParams, setSearchParams] = useSearchParams()
  const [clientSearch, setClientSearch] = useState('')
  const [adminSearch, setAdminSearch] = useState('')
  const [superAdminSearch, setSuperAdminSearch] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createAdminDialogOpen, setCreateAdminDialogOpen] = useState(false)
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [toggleStatusDialogOpen, setToggleStatusDialogOpen] = useState(false)
  const [manageAssignmentsDialogOpen, setManageAssignmentsDialogOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ManageableUser | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const deferredClientSearch = useDeferredValue(clientSearch)
  const deferredAdminSearch = useDeferredValue(adminSearch)
  const deferredSuperAdminSearch = useDeferredValue(superAdminSearch)
  const activeClientSearch = deferredClientSearch.trim()
  const activeAdminSearch = deferredAdminSearch.trim()
  const activeSuperAdminSearch = deferredSuperAdminSearch.trim()
  const tabParam = getClientsTab(searchParams.get('tab'))
  const activeTab = isSuperAdmin ? tabParam : 'clients'
  const clientPage = getPageSearchParam(searchParams.get('clientsPage'))
  const archive = searchParams.get('archive') === 'archived' ? 'archived' : 'visible'
  const adminPage = getPageSearchParam(searchParams.get('adminsPage'))
  const superAdminPage = getPageSearchParam(searchParams.get('superAdminsPage'))
  const clientSections = useMemo<FilterSectionConfig[]>(
    () => [
      {
        type: 'multi',
        key: 'status',
        label: 'Estado',
        options: USER_STATUS_OPTIONS,
      },
      {
        type: 'multi',
        key: 'level',
        label: 'Nivel',
        options: CLIENT_LEVEL_OPTIONS,
      },
      ...(isSuperAdmin
        ? [
            {
              type: 'multi',
              key: 'assignment_state',
              label: 'Asignación',
              options: ASSIGNMENT_STATE_OPTIONS,
            } satisfies FilterSectionConfig,
          ]
        : []),
      {
        type: 'date-range',
        key: 'created',
        label: 'Fecha registro',
      },
    ],
    [isSuperAdmin]
  )
  const userSections = useMemo<FilterSectionConfig[]>(
    () => [
      {
        type: 'multi',
        key: 'status',
        label: 'Estado',
        options: USER_STATUS_OPTIONS,
      },
      {
        type: 'date-range',
        key: 'created',
        label: 'Fecha registro',
      },
    ],
    []
  )
  const clientFilters = useListFilters(clientSections)
  const adminFilters = useListFilters(userSections)
  const superAdminFilters = useListFilters(userSections)
  const clientFilterParams = filtersToApiParams(clientFilters.values, clientSections) as Partial<ClientsListParams>
  const adminFilterParams = filtersToApiParams(adminFilters.values, userSections) as Partial<UsersListParams>
  const superAdminFilterParams = filtersToApiParams(
    superAdminFilters.values,
    userSections
  ) as Partial<UsersListParams>
  const clientPageResetKey = `${archive}::${activeClientSearch}::${JSON.stringify(clientFilterParams)}`
  const adminPageResetKey = `${activeAdminSearch}::${JSON.stringify(adminFilterParams)}`
  const superAdminPageResetKey = `${activeSuperAdminSearch}::${JSON.stringify(superAdminFilterParams)}`
  const lastClientPageResetKeyRef = useRef(clientPageResetKey)
  const lastAdminPageResetKeyRef = useRef(adminPageResetKey)
  const lastSuperAdminPageResetKeyRef = useRef(superAdminPageResetKey)

  const updateSearchParams = (updates: {
    tab?: ClientsTab
    clientsPage?: number
    adminsPage?: number
    superAdminsPage?: number
  }) => {
    setSearchParams(
      (currentSearchParams) => {
        const nextSearchParams = buildPaginationSearchParams(currentSearchParams, {
          clientsPage: updates.clientsPage,
          adminsPage: updates.adminsPage,
          superAdminsPage: updates.superAdminsPage,
        })

        if (updates.tab !== undefined) {
          nextSearchParams.set('tab', updates.tab)
        }

        return hasSearchParamsChanged(currentSearchParams, nextSearchParams)
          ? nextSearchParams
          : currentSearchParams
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if (lastClientPageResetKeyRef.current === clientPageResetKey) {
      return
    }

    lastClientPageResetKeyRef.current = clientPageResetKey
    replacePaginationSearchParams(setSearchParams, { clientsPage: 1 })
  }, [clientPageResetKey, setSearchParams])

  useEffect(() => {
    if (lastAdminPageResetKeyRef.current === adminPageResetKey) {
      return
    }

    lastAdminPageResetKeyRef.current = adminPageResetKey
    replacePaginationSearchParams(setSearchParams, { adminsPage: 1 })
  }, [adminPageResetKey, setSearchParams])

  useEffect(() => {
    if (lastSuperAdminPageResetKeyRef.current === superAdminPageResetKey) {
      return
    }

    lastSuperAdminPageResetKeyRef.current = superAdminPageResetKey
    replacePaginationSearchParams(setSearchParams, { superAdminsPage: 1 })
  }, [superAdminPageResetKey, setSearchParams])

  const clientsQuery = useClients({
    archive,
    page: clientPage,
    limit: PAGE_SIZE,
    search: activeClientSearch,
    ...clientFilterParams,
  })
  const adminsQuery = useAllUsers(
    {
      role: 'ADMIN',
      page: adminPage,
      limit: PAGE_SIZE,
      search: activeAdminSearch,
      ...adminFilterParams,
    },
    isSuperAdmin && activeTab === 'admins'
  )
  const superAdminsQuery = useAllUsers(
    {
      role: 'SUPER_ADMIN',
      page: superAdminPage,
      limit: PAGE_SIZE,
      search: activeSuperAdminSearch,
      ...superAdminFilterParams,
    },
    isSuperAdmin && activeTab === 'super-admins'
  )

  const clients = clientsQuery.data?.data ?? []
  const totalClients = clientsQuery.data?.total ?? 0
  const clientTotalPages = clientsQuery.data?.totalPages ?? 1

  useEffect(() => {
    if (clientsQuery.data && !clientsQuery.isPlaceholderData && clientPage > Math.max(1, clientTotalPages)) {
      replacePaginationSearchParams(setSearchParams, { clientsPage: Math.max(1, clientTotalPages) })
    }
  }, [clientsQuery.data, clientsQuery.isPlaceholderData, clientPage, clientTotalPages, setSearchParams])

  const admins = adminsQuery.data?.data ?? []
  const totalAdmins = adminsQuery.data?.total ?? 0
  const adminTotalPages = adminsQuery.data?.totalPages ?? 1

  const superAdmins = superAdminsQuery.data?.data ?? []
  const totalSuperAdmins = superAdminsQuery.data?.total ?? 0
  const superAdminTotalPages = superAdminsQuery.data?.totalPages ?? 1

  const pageTitle = isSuperAdmin ? 'Usuarios' : 'Clientes'
  const pageDescription = isSuperAdmin
    ? 'Gestiona clientes y admins desde un único punto, incluyendo altas, roles, accesos y reasignaciones.'
    : 'Consulta clientes asignados, revisa su perfil completo y gestiona desbloqueos sin salir del panel.'

  const pageCountLabel = isSuperAdmin
    ? activeTab === 'admins'
      ? totalAdmins > 0
        ? `${totalAdmins} admins registrados`
        : 'Todavía no hay admins registrados'
      : activeTab === 'super-admins'
        ? totalSuperAdmins > 0
          ? `${totalSuperAdmins} super admins registrados`
          : 'Todavía no hay super admins registrados'
        : totalClients > 0
          ? `${totalClients} clientes registrados`
          : 'Todavía no hay clientes registrados'
    : totalClients > 0
      ? `${totalClients} clientes asignados a tu cuenta`
      : 'Todavía no hay clientes asignados a tu cuenta'

  const handleUnlock = (user: ManageableUser) => {
    setSelectedUser(user)
    setUnlockDialogOpen(true)
  }

  const handleChangeRole = (user: ManageableUser) => {
    setSelectedUser(user)
    setChangeRoleDialogOpen(true)
  }

  const handleEditUser = (user: ManageableUser) => {
    setSelectedUser(user)
    setEditUserDialogOpen(true)
  }

  const handleToggleStatus = (user: ManageableUser) => {
    setSelectedUser(user)
    setToggleStatusDialogOpen(true)
  }

  const handleManageAssignments = (client: Client) => {
    setSelectedClient(client)
    setManageAssignmentsDialogOpen(true)
  }


  const renderClientsPanel = () => {
    const emptyTitle = isSuperAdmin ? 'Todavía no hay clientes registrados' : 'Aún no tienes clientes asignados'
    const emptyDescription = isSuperAdmin
      ? 'Crea el primer cliente para empezar a gestionar perfiles, métricas, accesos y reasignaciones desde el panel.'
      : 'Crea el primer cliente para empezar a gestionar perfiles, métricas y estados de acceso.'
    const tableDescription = isSuperAdmin
      ? 'Vista paginada de clientes con reasignación, desbloqueo, cambio de rol y alta/baja de cuenta.'
      : 'Vista paginada de clientes asignados al admin actual.'
    const hasClientQuery = archive === 'archived' || clientPage > 1 || activeClientSearch.length > 0 || clientFilters.activeCount > 0

    if (clientsQuery.isLoading) {
      return <ClientsTableSkeleton />
    }

    if (clientsQuery.isError) {
      return (
        <UsersListErrorCard
          title="No se ha podido cargar el listado"
          message={getApiErrorMessage(clientsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
          onRetry={() => clientsQuery.refetch()}
        />
      )
    }

    if (clients.length === 0 && !hasClientQuery) {
      return (
        <UsersListEmptyCard
          title={emptyTitle}
          description={emptyDescription}
          actionLabel="Crear primer cliente"
          onAction={() => setCreateDialogOpen(true)}
        />
      )
    }

    return (
      <ClientsListPanel
        title={archive === 'archived' ? 'Clientes archivados' : 'Listado de clientes'}
        description={tableDescription}
        search={clientSearch}
        onSearchChange={setClientSearch}
        sections={clientSections}
        filters={clientFilters}
        clients={clients}
        currentUserRole={currentUserRole}
        actionDialogOpen={unlockDialogOpen || changeRoleDialogOpen || toggleStatusDialogOpen || manageAssignmentsDialogOpen || archiveDialogOpen || deleteDialogOpen}
        onDelete={(client) => { setSelectedClient(client); setDeleteDialogOpen(true) }}
        onArchive={(client) => { setSelectedClient(client); setArchiveDialogOpen(true) }}
        onUnlock={handleUnlock}
        onChangeRole={handleChangeRole}
        onManageAssignments={handleManageAssignments}
        onToggleStatus={handleToggleStatus}
        page={clientPage}
        totalPages={clientTotalPages}
        onPrevious={() =>
          updateSearchParams({ clientsPage: Math.max(1, clientPage - 1) })
        }
        onNext={() =>
          updateSearchParams({
            clientsPage: Math.min(clientTotalPages, clientPage + 1),
          })
        }
      />
    )
  }

  const renderAdminsPanel = () => {
    const hasAdminQuery = activeAdminSearch.length > 0 || adminFilters.activeCount > 0

    if (adminsQuery.isLoading) {
      return <AdminsTableSkeleton />
    }

    if (adminsQuery.isError) {
      return (
        <UsersListErrorCard
          title="No se ha podido cargar el listado de admins"
          message={getApiErrorMessage(adminsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
          onRetry={() => adminsQuery.refetch()}
        />
      )
    }

    if (admins.length === 0 && !hasAdminQuery) {
      return (
        <UsersListEmptyCard
          title="Todavía no hay admins registrados"
          description="Crea el primer admin para delegar la gestión diaria del panel y de las carteras de clientes."
          actionLabel="Crear primer admin"
          onAction={() => setCreateAdminDialogOpen(true)}
        />
      )
    }

    return (
      <AdminsListPanel
        title="Listado de admins"
        description="Gestiona altas, edición, desbloqueos, cambios de rol y estado de acceso del equipo administrador."
        noResultsMessage="No se encontraron admins con la búsqueda y filtros actuales."
        search={adminSearch}
        onSearchChange={setAdminSearch}
        sections={userSections}
        filters={adminFilters}
        admins={admins}
        currentUserId={currentUserId}
        onEdit={handleEditUser}
        onUnlock={handleUnlock}
        onChangeRole={handleChangeRole}
        onToggleStatus={handleToggleStatus}
        page={adminPage}
        totalPages={adminTotalPages}
        onPrevious={() => updateSearchParams({ adminsPage: Math.max(1, adminPage - 1) })}
        onNext={() =>
          updateSearchParams({
            adminsPage: Math.min(adminTotalPages, adminPage + 1),
          })
        }
      />
    )
  }

  const renderSuperAdminsPanel = () => {
    const hasSuperAdminQuery =
      activeSuperAdminSearch.length > 0 || superAdminFilters.activeCount > 0

    if (superAdminsQuery.isLoading) {
      return <AdminsTableSkeleton />
    }

    if (superAdminsQuery.isError) {
      return (
        <UsersListErrorCard
          title="No se ha podido cargar el listado de super admins"
          message={getApiErrorMessage(superAdminsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
          onRetry={() => superAdminsQuery.refetch()}
        />
      )
    }

    if (superAdmins.length === 0 && !hasSuperAdminQuery) {
      return (
        <UsersListEmptyCard
          title="Todavía no hay super admins adicionales"
          description="Para crear uno nuevo, da de alta primero un admin y después promuévelo a super admin desde la gestión de roles."
          actionLabel="Crear admin base"
          onAction={() => setCreateAdminDialogOpen(true)}
        />
      )
    }

    return (
      <AdminsListPanel
        title="Listado de super admins"
        description="Puedes editar, desbloquear, cambiar el rol o reactivar otros super admins. Tu propia cuenta queda protegida frente a degradaciones o bajas accidentales."
        noResultsMessage="No se encontraron super admins con la búsqueda y filtros actuales."
        search={superAdminSearch}
        onSearchChange={setSuperAdminSearch}
        sections={userSections}
        filters={superAdminFilters}
        admins={superAdmins}
        currentUserId={currentUserId}
        onEdit={handleEditUser}
        onUnlock={handleUnlock}
        onChangeRole={handleChangeRole}
        onToggleStatus={handleToggleStatus}
        page={superAdminPage}
        totalPages={superAdminTotalPages}
        onPrevious={() =>
          updateSearchParams({ superAdminsPage: Math.max(1, superAdminPage - 1) })
        }
        onNext={() =>
          updateSearchParams({
            superAdminsPage: Math.min(superAdminTotalPages, superAdminPage + 1),
          })
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <ClientsPageHeader
        title={pageTitle}
        description={pageDescription}
        countLabel={pageCountLabel}
        createLabel={isSuperAdmin && activeTab !== 'clients' ? 'Nuevo admin' : 'Nuevo cliente'}
        onCreate={() => {
          if (isSuperAdmin && activeTab !== 'clients') {
            setCreateAdminDialogOpen(true)
            return
          }

          setCreateDialogOpen(true)
        }}
      />

      {activeTab === 'clients' && (
        <ClientsArchiveToggle
          archive={archive}
          onSelect={(value) => setSearchParams((current) => {
            const next = new URLSearchParams(current)
            next.set('archive', value)
            next.delete('clientsPage')
            return next
          }, { replace: true })}
        />
      )}

      {isSuperAdmin ? (
        <Tabs
          value={activeTab}
          onValueChange={(value) => updateSearchParams({ tab: value as ClientsTab })}
          className="space-y-4"
        >
          <ClientsTabsBar />

          <TabsContent value="clients">{renderClientsPanel()}</TabsContent>
          <TabsContent value="admins">{renderAdminsPanel()}</TabsContent>
          <TabsContent value="super-admins">{renderSuperAdminsPanel()}</TabsContent>
        </Tabs>
      ) : (
        renderClientsPanel()
      )}

      <CreateClientDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => replacePaginationSearchParams(setSearchParams, { clientsPage: 1 })}
      />
      {isSuperAdmin && <ClientDeletionsPanel />}
      {isSuperAdmin && selectedClient && deleteDialogOpen && <DeleteClientDialog key={selectedClient.id} client={selectedClient} open onOpenChange={setDeleteDialogOpen} />}
      <ArchiveClientDialog client={selectedClient} open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen} />
      <CreateAdminDialog open={createAdminDialogOpen} onOpenChange={setCreateAdminDialogOpen} />
      <UnlockDialog user={selectedUser} open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen} />
      <EditUserDialog user={selectedUser} open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen} />
      <ToggleUserStatusDialog
        user={selectedUser}
        open={toggleStatusDialogOpen}
        onOpenChange={setToggleStatusDialogOpen}
      />
      <ChangeRoleDialog user={selectedUser} open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen} />
      <ManageClientAssignmentsDialog
        client={selectedClient}
        open={manageAssignmentsDialogOpen}
        onOpenChange={setManageAssignmentsDialogOpen}
      />
    </div>
  )
}

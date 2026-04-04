import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCcw, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  getApiErrorMessage,
  useAllAdminsList,
  useClientAssignments,
  useUpdateClientAssignments,
} from '../api'
import { updateClientAssignmentsSchema } from '../schemas'
import {
  getClientAssignmentDiff,
  getUserDisplayName,
  hasClientAssignmentChanges,
  type AdminUserListItem,
  type ClientAssignmentAdmin,
  type UpdateClientAssignmentsValues,
} from '../types'

interface ManageClientAssignmentsTarget {
  id: string
  email: string
  profile: {
    first_name: string
    last_name: string
    avatar_url?: string | null
  } | null
}

interface ManageClientAssignmentsDialogProps {
  client: ManageClientAssignmentsTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const assignmentDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function getAdminInitials(admin: { email: string; profile: { first_name: string; last_name: string } | null }) {
  const firstName = admin.profile?.first_name?.[0] ?? ''
  const lastName = admin.profile?.last_name?.[0] ?? ''
  const initials = `${firstName}${lastName}`.trim().toUpperCase()

  return initials || admin.email.slice(0, 2).toUpperCase()
}

function buildAdminOptions(activeAdmins: ClientAssignmentAdmin[], availableAdmins: AdminUserListItem[]) {
  const optionsById = new Map<string, AdminUserListItem>()

  activeAdmins.forEach((admin) => {
    optionsById.set(admin.id, {
      id: admin.id,
      email: admin.email,
      role: 'ADMIN',
      is_active: true,
      is_locked: false,
      created_at: admin.assigned_at,
      profile: admin.profile,
    })
  })

  availableAdmins.forEach((admin) => {
    optionsById.set(admin.id, admin)
  })

  return Array.from(optionsById.values()).sort((left, right) =>
    getUserDisplayName(left).localeCompare(getUserDisplayName(right), 'es'),
  )
}

function getAdminStatus(isSelected: boolean, wasAssigned: boolean) {
  if (isSelected && wasAssigned) {
    return {
      label: 'Se mantiene',
      className: 'border-status-success/30 bg-status-success/10 text-status-success',
      actionLabel: 'Quitar',
      actionVariant: 'outline' as const,
    }
  }

  if (isSelected) {
    return {
      label: 'Se añade',
      className: 'border-brand-primary/30 bg-brand-soft/10 text-brand-primary',
      actionLabel: 'Quitar',
      actionVariant: 'outline' as const,
    }
  }

  if (wasAssigned) {
    return {
      label: 'Se retira',
      className: 'border-status-warning/30 bg-status-warning/10 text-status-warning',
      actionLabel: 'Volver a incluir',
      actionVariant: 'secondary' as const,
    }
  }

  return {
    label: 'Disponible',
    className: 'border-border bg-muted text-muted-foreground',
    actionLabel: 'Asignar',
    actionVariant: 'secondary' as const,
  }
}

export function ManageClientAssignmentsDialog({
  client,
  open,
  onOpenChange,
}: ManageClientAssignmentsDialogProps) {
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const clientId = open ? client?.id : undefined

  const assignmentsQuery = useClientAssignments(clientId, open)
  const adminsQuery = useAllAdminsList(open)
  const updateClientAssignments = useUpdateClientAssignments()

  const activeAdmins = assignmentsQuery.data?.active_admins ?? []
  const availableAdmins = (adminsQuery.data ?? []).filter((admin) => admin.is_active)
  const adminOptions = buildAdminOptions(activeAdmins, availableAdmins)
  const selectedAdminIdSet = new Set(selectedAdminIds)
  const activeAdminIdSet = new Set(activeAdmins.map((admin) => admin.id))
  const diff = getClientAssignmentDiff(activeAdmins, adminOptions, selectedAdminIds)
  const hasChanges = hasClientAssignmentChanges(activeAdmins, selectedAdminIds)
  const isLoading = assignmentsQuery.isLoading || adminsQuery.isLoading
  const isError = assignmentsQuery.isError || adminsQuery.isError
  const hasNoAdminsAvailable = !isLoading && !isError && adminOptions.length === 0

  useEffect(() => {
    if (!open) {
      setSelectedAdminIds([])
      setSubmitError(null)
      return
    }

    if (assignmentsQuery.data) {
      setSelectedAdminIds(assignmentsQuery.data.active_admins.map((admin) => admin.id))
      setSubmitError(null)
    }
  }, [assignmentsQuery.data, open])

  const toggleAdmin = (adminId: string) => {
    setSubmitError(null)
    setSelectedAdminIds((current) =>
      current.includes(adminId) ? current.filter((item) => item !== adminId) : [...current, adminId],
    )
  }

  const handleRetry = async () => {
    setSubmitError(null)
    await Promise.all([assignmentsQuery.refetch(), adminsQuery.refetch()])
  }

  const handleSave = async () => {
    if (!client) {
      return
    }

    const values: UpdateClientAssignmentsValues = {
      admin_ids: selectedAdminIds,
    }
    const result = updateClientAssignmentsSchema.safeParse(values)

    if (!result.success) {
      setSubmitError(result.error.issues[0]?.message ?? 'Revisa la selección de administradores')
      return
    }

    setSubmitError(null)

    try {
      await updateClientAssignments.mutateAsync({ clientId: client.id, values })
      toast.success('Asignaciones actualizadas correctamente')
      onOpenChange(false)
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'No se han podido actualizar las asignaciones'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gestionar admins asignados</DialogTitle>
          <DialogDescription>
            Actualiza el conjunto activo de admins para {client ? getUserDisplayName(client) : 'este cliente'}. Si el cliente queda pausado, puedes dejarlo sin admins asignados.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 rounded-xl border border-border/70 bg-muted/40" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border/70 p-6 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No se han podido cargar las asignaciones</h3>
              <p className="max-w-xl text-sm text-muted-foreground">
                {getApiErrorMessage(assignmentsQuery.error ?? adminsQuery.error, 'Reintenta la carga para volver a editar los admins del cliente.')}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => void handleRetry()}>
              <RefreshCcw className="h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : hasNoAdminsAvailable ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/70 p-8 text-center">
            <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">
              <Users className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No hay admins disponibles</h3>
              <p className="max-w-xl text-sm text-muted-foreground">
                Crea o reactiva al menos un usuario con rol admin para poder reasignar esta cartera.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {activeAdmins.length === 0 && (
              <div className="rounded-xl border border-status-warning/20 bg-status-warning/10 p-4 text-sm text-foreground">
                Este cliente no tiene admins activos ahora mismo. Puedes mantenerlo así o asignar uno nuevo cuando retome la actividad.
              </div>
            )}

            {selectedAdminIds.length === 0 && (
              <div className="rounded-xl border border-status-warning/20 bg-status-warning/10 p-4 text-sm text-foreground">
                Este cliente quedará sin admins activos. Úsalo cuando quieras dejarlo pausado sin cartera asignada.
              </div>
            )}

            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Cobertura final prevista</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAdminIds.length} admin{selectedAdminIds.length === 1 ? '' : 's'} activo{selectedAdminIds.length === 1 ? '' : 's'} tras guardar
                  </p>
                </div>
                <Badge variant="outline" className="border-brand-primary/30 bg-brand-soft/10 text-brand-primary">
                  {hasChanges ? 'Cambios pendientes' : 'Sin cambios'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {adminOptions.map((admin) => {
                const isSelected = selectedAdminIdSet.has(admin.id)
                const wasAssigned = activeAdminIdSet.has(admin.id)
                const status = getAdminStatus(isSelected, wasAssigned)
                const assignedAdmin = activeAdmins.find((item) => item.id === admin.id)

                return (
                  <div
                    key={admin.id}
                    className={cn(
                      'rounded-xl border p-4 transition-colors',
                      isSelected ? 'border-brand-primary/30 bg-brand-soft/5' : 'border-border/70 bg-card',
                    )}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar className="h-11 w-11 border border-border/60">
                          <AvatarImage src={admin.profile?.avatar_url ?? undefined} alt={getUserDisplayName(admin)} />
                          <AvatarFallback>{getAdminInitials(admin)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-foreground">{getUserDisplayName(admin)}</p>
                            <Badge variant="outline" className={status.className}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{admin.email}</p>
                          {assignedAdmin && (
                            <p className="text-xs text-muted-foreground">
                              Activo desde {assignmentDateFormatter.format(new Date(assignedAdmin.assigned_at))}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant={status.actionVariant}
                        onClick={() => toggleAdmin(admin.id)}
                        disabled={updateClientAssignments.isPending}
                      >
                        {status.actionLabel}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Resumen de cambios</h3>
                <p className="mt-1 text-sm text-muted-foreground">Revisa altas, retiradas y admins que seguirán vinculados antes de guardar.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-brand-primary/20 bg-brand-soft/10 p-4">
                  <p className="text-sm font-medium text-foreground">Añadir ({diff.added.length})</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {diff.added.length > 0 ? (
                      diff.added.map((admin) => <p key={admin.id}>{getUserDisplayName(admin)}</p>)
                    ) : (
                      <p>Sin cambios nuevos</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-status-warning/20 bg-status-warning/10 p-4">
                  <p className="text-sm font-medium text-foreground">Retirar ({diff.removed.length})</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {diff.removed.length > 0 ? (
                      diff.removed.map((admin) => <p key={admin.id}>{getUserDisplayName(admin)}</p>)
                    ) : (
                      <p>Sin retiradas</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-status-success/20 bg-status-success/10 p-4">
                  <p className="text-sm font-medium text-foreground">Sin cambios ({diff.unchanged.length})</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {diff.unchanged.length > 0 ? (
                      diff.unchanged.map((admin) => <p key={admin.id}>{getUserDisplayName(admin)}</p>)
                    ) : (
                      <p>Ningún admin se mantiene igual</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl border border-status-error/20 bg-status-error/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-status-error/15 p-2 text-status-error">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No se han podido guardar los cambios</p>
                      <p className="mt-1 text-sm text-muted-foreground">{submitError}</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSave()}
                    disabled={updateClientAssignments.isPending || !hasChanges}
                  >
                    Reintentar guardado
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={
              updateClientAssignments.isPending ||
              !client ||
              isLoading ||
              isError ||
              hasNoAdminsAvailable ||
              !hasChanges
            }
          >
            {updateClientAssignments.isPending ? 'Guardando...' : 'Guardar asignaciones'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

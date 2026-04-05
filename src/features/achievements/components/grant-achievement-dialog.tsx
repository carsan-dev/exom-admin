import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { isApprovalPendingError } from '@/lib/api-utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useAssignmentClients } from '../../assignments/api'
import { getUserDisplayName } from '../../clients/types'
import { getApiErrorMessage, useGrantAchievement } from '../api'
import type { AchievementListItem } from '../types'
import { getAchievementUserInitials } from '../types'

interface GrantAchievementDialogProps {
  achievement: AchievementListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onGranted?: () => void
}

export function GrantAchievementDialog({ achievement, open, onOpenChange, onGranted }: GrantAchievementDialogProps) {
  const currentUserRole = useAuth((state) => state.user?.role)
  const clientsQuery = useAssignmentClients(currentUserRole)
  const grantAchievement = useGrantAchievement()

  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSelectedClientIds([])
      setSearch('')
      setSubmitError(null)
    }
  }, [open])

  const clients = clientsQuery.data ?? []
  const filteredClients = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase()

    return clients
      .slice()
      .sort((left, right) => getUserDisplayName(left).localeCompare(getUserDisplayName(right), 'es'))
      .filter((client) => {
        if (!normalizedQuery) return true
        const displayName = getUserDisplayName(client).toLowerCase()
        return displayName.includes(normalizedQuery) || client.email.toLowerCase().includes(normalizedQuery)
      })
  }, [clients, search])

  const selectedClientSet = new Set(selectedClientIds)

  const toggleClient = (clientId: string) => {
    setSubmitError(null)
    setSelectedClientIds((current) =>
      current.includes(clientId) ? current.filter((id) => id !== clientId) : [...current, clientId],
    )
  }

  const handleSubmit = async () => {
    if (!achievement) return

    if (selectedClientIds.length === 0) {
      setSubmitError('Selecciona al menos un cliente')
      return
    }

    setSubmitError(null)

    try {
      await Promise.all(
        selectedClientIds.map((clientId) =>
          grantAchievement.mutateAsync({ id: achievement.id, values: { client_ids: [clientId] } }),
        ),
      )
      toast.success(
        selectedClientIds.length === 1
          ? 'Logro otorgado correctamente'
          : `Logro otorgado a ${selectedClientIds.length} clientes`,
      )
      onGranted?.()
      onOpenChange(false)
    } catch (error) {
      if (isApprovalPendingError(error)) {
        onOpenChange(false)
        return
      }

      setSubmitError(getApiErrorMessage(error, 'No se ha podido otorgar el logro'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Otorgar logro</DialogTitle>
          <DialogDescription>
            Selecciona los clientes a los que deseas otorgar este logro manualmente.
          </DialogDescription>
        </DialogHeader>

        {achievement && (
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <p className="font-medium text-foreground">{achievement.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{achievement.description}</p>
          </div>
        )}

        {clientsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 rounded-xl border border-border/70 bg-muted/40" />
            ))}
          </div>
        ) : clientsQuery.isError ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-status-error/20 p-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No se pudieron cargar los clientes</h3>
              <p className="text-sm text-muted-foreground">Reintenta para recuperar la lista de clientes visibles.</p>
            </div>
            <Button variant="outline" onClick={() => void clientsQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/70 p-8 text-center">
            <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">
              <Users className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No hay clientes visibles</h3>
              <p className="text-sm text-muted-foreground">
                Asigna primero clientes a tu cartera para poder otorgar este logro.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente por nombre o email"
                className="pl-9"
              />
            </div>

            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => {
                  const isSelected = selectedClientSet.has(client.id)

                  return (
                    <div
                      key={client.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        isSelected ? 'border-brand-primary/30 bg-brand-soft/10' : 'border-border/70 bg-card'
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-11 w-11 border border-border/60">
                            <AvatarImage src={client.profile?.avatar_url ?? undefined} alt={getUserDisplayName(client)} />
                            <AvatarFallback>
                              {getAchievementUserInitials({ email: client.email, profile: client.profile })}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{getUserDisplayName(client)}</p>
                            <p className="truncate text-sm text-muted-foreground">{client.email}</p>
                          </div>
                        </div>
                        <Button variant={isSelected ? 'outline' : 'secondary'} onClick={() => toggleClient(client.id)}>
                          {isSelected ? (
                            <>
                              <Check className="h-4 w-4" />
                              Seleccionado
                            </>
                          ) : (
                            'Seleccionar'
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                  No hay clientes que coincidan con esa búsqueda.
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {selectedClientIds.length} cliente{selectedClientIds.length === 1 ? '' : 's'} seleccionado{selectedClientIds.length === 1 ? '' : 's'}
            </p>

            {submitError && (
              <div className="rounded-xl border border-status-error/20 bg-status-error/10 p-4 text-sm text-status-error">
                {submitError}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={grantAchievement.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={grantAchievement.isPending || clientsQuery.isLoading || clients.length === 0}
          >
            {grantAchievement.isPending ? 'Otorgando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

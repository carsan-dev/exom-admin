import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { isApprovalPendingError } from '@/lib/api-utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getApiErrorMessage,
  useAchievementDetail,
  useRecomputeAchievements,
  useRevokeAchievement,
} from '../api'
import {
  getAchievementModeLabel,
  getAchievementRuleLabel,
  getAchievementUserDisplayName,
  getAchievementUserInitials,
  isAutomaticAchievement,
  type AchievementListItem,
  type RecomputeAchievementsResult,
} from '../types'

interface AchievementUsersDrawerProps {
  achievement: AchievementListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getRecomputeToastMessage(result: RecomputeAchievementsResult) {
  return `Recálculo completado: ${result.granted} otorgado${result.granted === 1 ? '' : 's'} y ${result.revoked} revocado${result.revoked === 1 ? '' : 's'}.`
}

export function AchievementUsersDrawer({ achievement, open, onOpenChange }: AchievementUsersDrawerProps) {
  const [page, setPage] = useState(1)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const revokeAchievement = useRevokeAchievement()
  const recomputeAchievements = useRecomputeAchievements()

  useEffect(() => {
    if (!open) {
      setPage(1)
      setSelectedUserIds([])
      return
    }
    setPage(1)
    setSelectedUserIds([])
  }, [achievement?.id, open])

  const detailQuery = useAchievementDetail(
    achievement?.id,
    { page, limit: 8 },
    open,
  )

  const detail = detailQuery.data
  const users = detail?.users.data ?? []
  const totalPages = detail?.users.totalPages ?? 1
  const selectedUserSet = new Set(selectedUserIds)
  const canRecompute = achievement ? isAutomaticAchievement(achievement.criteria_type) : false

  const handleRevoke = async (userId: string) => {
    if (!achievement) return

    try {
      await revokeAchievement.mutateAsync({ id: achievement.id, user_id: userId })
      toast.success('Logro revocado correctamente')
    } catch (error) {
      if (isApprovalPendingError(error)) {
        return
      }

      toast.error(getApiErrorMessage(error, 'No se ha podido revocar el logro'))
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    )
  }

  const handleRecomputeVisible = async () => {
    if (!achievement || !canRecompute) return

    try {
      const result = await recomputeAchievements.mutateAsync({
        values: {
          achievement_ids: [achievement.id],
          apply_to_all_visible_clients: true,
        },
      })
      toast.success(getRecomputeToastMessage(result))
    } catch (error) {
      if (isApprovalPendingError(error)) {
        return
      }

      toast.error(getApiErrorMessage(error, 'No se ha podido recalcular el logro'))
    }
  }

  const handleRecomputeSelected = async () => {
    if (!achievement || !canRecompute || selectedUserIds.length === 0) return

    try {
      const result = await recomputeAchievements.mutateAsync({
        values: {
          achievement_ids: [achievement.id],
          user_ids: selectedUserIds,
        },
      })
      toast.success(getRecomputeToastMessage(result))
      setSelectedUserIds([])
    } catch (error) {
      if (isApprovalPendingError(error)) {
        setSelectedUserIds([])
        return
      }

      toast.error(getApiErrorMessage(error, 'No se ha podido recalcular la selección'))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{achievement?.name ?? 'Usuarios con este logro'}</SheetTitle>
          <SheetDescription>
            Clientes que han desbloqueado este logro. Puedes revocar el logro de cualquier cliente.
          </SheetDescription>
        </SheetHeader>

        {!achievement ? null : detailQuery.isLoading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : detailQuery.isError ? (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-status-error/20 p-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No se pudo cargar el detalle</h3>
              <p className="text-sm text-muted-foreground">
                Reintenta para recuperar la lista de clientes con este logro.
              </p>
            </div>
            <Button variant="outline" onClick={() => void detailQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Criterio:</span>
                <span className="text-sm text-foreground">
                  {getAchievementRuleLabel(achievement.criteria_type, achievement.rule_config)}
                </span>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-foreground">Meta: {achievement.criteria_value}</span>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-foreground">Modo: {getAchievementModeLabel(achievement.criteria_type)}</span>
                {detailQuery.isRefetching && (
                  <span className="text-sm text-muted-foreground">Actualizando...</span>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{achievement.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRecomputeVisible()}
                  disabled={!canRecompute || recomputeAchievements.isPending}
                >
                  {recomputeAchievements.isPending ? 'Recalculando...' : 'Recalcular visibles'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRecomputeSelected()}
                  disabled={!canRecompute || recomputeAchievements.isPending || selectedUserIds.length === 0}
                >
                  Recalcular selección ({selectedUserIds.length})
                </Button>
              </div>

              {canRecompute && (
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Recalcular visibles:</span> revisa toda la cartera visible del admin actual y sincroniza otorgados y revocados.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Recalcular selección:</span> solo usa los clientes listados y seleccionados en este drawer.
                  </p>
                </div>
              )}

              {!canRecompute && (
                <p className="mt-3 text-xs text-muted-foreground">
                  `CUSTOM` no se autoevalúa. Este logro solo se actualiza con otorgación o revocación manual.
                </p>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-background p-4">
                  <p className="text-sm text-muted-foreground">Usuarios con logro</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{detail?.unlocked_count ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background p-4">
                  <p className="text-sm text-muted-foreground">Página actual</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-primary">{users.length}</p>
                </div>
              </div>
            </div>

            {users.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                {detail?.unlocked_count === 0
                  ? 'Ningún cliente ha desbloqueado este logro todavía.'
                  : 'No hay usuarios en esta página.'}
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((row) => (
                  <div
                    key={row.id}
                    className={`rounded-xl border p-5 ${selectedUserSet.has(row.user_id) ? 'border-brand-primary/30 bg-brand-soft/10' : 'border-border/70 bg-card'}`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-11 w-11 border border-border/60">
                          <AvatarImage
                            src={row.user.profile?.avatar_url ?? undefined}
                            alt={getAchievementUserDisplayName(row.user)}
                          />
                          <AvatarFallback>{getAchievementUserInitials(row.user)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-medium text-foreground">{getAchievementUserDisplayName(row.user)}</p>
                          <p className="truncate text-sm text-muted-foreground">{row.user.email}</p>
                          <p className="text-xs text-muted-foreground">Desbloqueado: {formatDate(row.unlocked_at)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {canRecompute && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserSelection(row.user_id)}
                            disabled={recomputeAchievements.isPending}
                          >
                            {selectedUserSet.has(row.user_id) ? 'Quitar selección' : 'Seleccionar'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRevoke(row.user_id)}
                          disabled={revokeAchievement.isPending}
                        >
                          Revocar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                    Anterior
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

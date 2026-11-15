import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { useResourceApprovalBatch } from '@/features/approval-requests/api'
import { buildResourceApprovalMap } from '@/features/approval-requests/types'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAchievements } from '../api'
import { AchievementFormDialog } from '../components/achievement-form-dialog'
import { AchievementUsersDrawer } from '../components/achievement-users-drawer'
import { AchievementsStatsCards } from '../components/achievements-stats-cards'
import { AchievementsTable } from '../components/achievements-table'
import { DeleteAchievementDialog } from '../components/delete-achievement-dialog'
import { GrantAchievementDialog } from '../components/grant-achievement-dialog'
import {
  CRITERIA_TYPE_LABELS,
  CRITERIA_TYPE_OPTIONS,
  type AchievementFilters,
  type AchievementListItem,
  type CriteriaType,
} from '../types'

const PAGE_SIZE = 10

function getPage(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function getCriteriaTypeFilter(value: string | null): CriteriaType | 'ALL' {
  return CRITERIA_TYPE_OPTIONS.includes(value as CriteriaType) ? (value as CriteriaType) : 'ALL'
}

export function AchievementsPage() {
  const currentUserRole = useAuth((state) => state.user?.role ?? 'ADMIN')
  const canDeleteAchievements = currentUserRole === 'SUPER_ADMIN'
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchDraft, setSearchDraft] = useState(searchParams.get('search') ?? '')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<AchievementListItem | null>(null)
  const [grantingAchievement, setGrantingAchievement] = useState<AchievementListItem | null>(null)
  const [usersAchievement, setUsersAchievement] = useState<AchievementListItem | null>(null)
  const [deletingAchievement, setDeletingAchievement] = useState<AchievementListItem | null>(null)

  const page = getPage(searchParams.get('page'))
  const search = searchParams.get('search') ?? ''
  const criteriaType = getCriteriaTypeFilter(searchParams.get('criteria_type'))

  useEffect(() => {
    setSearchDraft(search)
  }, [search])

  const filters: AchievementFilters = {
    page,
    limit: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(criteriaType !== 'ALL' ? { criteria_type: criteriaType } : {}),
  }

  const achievementsQuery = useAchievements(filters)
  const data = achievementsQuery.data
  const items = data?.data ?? []
  const achievementApprovalQuery = useResourceApprovalBatch('achievement', items.map((item) => item.id))
  const achievementApprovalById = buildResourceApprovalMap(achievementApprovalQuery.data ?? [])
  const totalPages = data?.totalPages ?? 1
  const hasActiveFilters = Boolean(search) || criteriaType !== 'ALL'

  const updateSearchParams = (updates: {
    search?: string
    criteria_type?: CriteriaType | 'ALL'
    page?: number
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (updates.search !== undefined) {
      const nextSearch = updates.search.trim()
      if (nextSearch) {
        nextSearchParams.set('search', nextSearch)
      } else {
        nextSearchParams.delete('search')
      }
    }

    if (updates.criteria_type !== undefined) {
      if (updates.criteria_type === 'ALL') {
        nextSearchParams.delete('criteria_type')
      } else {
        nextSearchParams.set('criteria_type', updates.criteria_type)
      }
    }

    if (updates.page !== undefined) {
      if (updates.page <= 1) {
        nextSearchParams.delete('page')
      } else {
        nextSearchParams.set('page', String(updates.page))
      }
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateSearchParams({ search: searchDraft, page: 1 })
  }

  const clearFilters = () => {
    setSearchDraft('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-6 md:mb-6"
        eyebrow="Motivación"
        title="Gestión de logros"
        description="Crea logros para premiar hitos medibles, define su meta de desbloqueo y mantén separada esta gestión del objetivo principal del cliente."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="max-md:h-11">
            <Plus className="h-4 w-4" />
            Nuevo logro
          </Button>
        }
      />

      <p className="border-l border-border-strong pl-4 text-sm text-foreground-secondary">
        Los <span className="font-medium text-foreground">logros</span> premian hitos desbloqueables. El <span className="font-medium text-foreground">objetivo principal</span> sigue viviéndose en retos (`MAIN_GOAL`) y no debe mezclarse con la meta de un logro.
      </p>

      <AchievementsStatsCards
        summary={data?.summary}
        isLoading={achievementsQuery.isLoading}
        isError={achievementsQuery.isError}
        isFetching={achievementsQuery.isFetching}
        onRetry={() => void achievementsQuery.refetch()}
      />

      <section aria-label="Filtros de logros">
        <div className="space-y-4">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 md:items-end xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label htmlFor="achievement-search">Buscar</Label>
                <div className="flex gap-2">
                  <Input
                    id="achievement-search"
                    className="max-md:h-11"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Nombre o descripción"
                  />
                  <Button type="submit" variant="outline" className="max-md:h-11">
                    Buscar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de criterio</Label>
                <Select
                  value={criteriaType}
                  onValueChange={(value) => updateSearchParams({ criteria_type: value as CriteriaType | 'ALL', page: 1 })}
                >
                  <SelectTrigger className="max-md:h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {CRITERIA_TYPE_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {CRITERIA_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] tabular-nums text-foreground-muted" aria-live="polite">
              {data ? `${data.total} logro${data.total === 1 ? '' : 's'} encontrado${data.total === 1 ? '' : 's'}` : 'Cargando resultados...'}
            </p>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="max-md:h-11">
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      </section>

      <AchievementsTable
        items={items}
        approvalById={achievementApprovalById}
        page={page}
        totalPages={totalPages}
        isLoading={achievementsQuery.isLoading}
        isError={achievementsQuery.isError}
        isRefetching={achievementsQuery.isRefetching}
        hasActiveFilters={hasActiveFilters}
        onRetry={() => void achievementsQuery.refetch()}
        onPageChange={(nextPage) => updateSearchParams({ page: nextPage })}
        onCreate={() => setCreateOpen(true)}
        onEdit={setEditingAchievement}
        onGrant={setGrantingAchievement}
        onViewUsers={setUsersAchievement}
        onDelete={canDeleteAchievements ? setDeletingAchievement : () => undefined}
        canDelete={canDeleteAchievements}
      />

      <AchievementFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AchievementFormDialog
        achievement={editingAchievement}
        open={Boolean(editingAchievement)}
        onOpenChange={(open) => {
          if (!open) setEditingAchievement(null)
        }}
        onSubmitted={() => setEditingAchievement(null)}
      />
      <GrantAchievementDialog
        achievement={grantingAchievement}
        open={Boolean(grantingAchievement)}
        onOpenChange={(open) => {
          if (!open) setGrantingAchievement(null)
        }}
        onGranted={() => setGrantingAchievement(null)}
      />
      <AchievementUsersDrawer
        achievement={usersAchievement}
        open={Boolean(usersAchievement)}
        onOpenChange={(open) => {
          if (!open) setUsersAchievement(null)
        }}
      />
      {canDeleteAchievements && (
        <DeleteAchievementDialog
          achievement={deletingAchievement}
          open={Boolean(deletingAchievement)}
          onOpenChange={(open) => {
            if (!open) setDeletingAchievement(null)
          }}
          onDeleted={() => setDeletingAchievement(null)}
        />
      )}
    </div>
  )
}

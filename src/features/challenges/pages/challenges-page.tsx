import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useChallenges } from '../api'
import { AssignChallengeDialog } from '../components/assign-challenge-dialog'
import { ChallengeFormDialog } from '../components/challenge-form-dialog'
import { ChallengeProgressDrawer } from '../components/challenge-progress-drawer'
import { ChallengesStatsCards } from '../components/challenges-stats-cards'
import { ChallengesTable } from '../components/challenges-table'
import { DeleteChallengeDialog } from '../components/delete-challenge-dialog'
import {
  CHALLENGE_COMPLETION_FILTER_OPTIONS,
  CHALLENGE_COMPLETION_LABELS,
  CHALLENGE_SCOPE_FILTER_OPTIONS,
  CHALLENGE_SOURCE_FILTER_OPTIONS,
  CHALLENGE_TYPE_LABELS,
  CHALLENGE_TYPE_OPTIONS,
  type ChallengeCompletionFilter,
  type ChallengeFilters,
  type ChallengeListItem,
  type ChallengeScopeFilter,
  type ChallengeSourceFilter,
  type ChallengeType,
} from '../types'

const PAGE_SIZE = 10

function getPage(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function getTypeFilter(value: string | null): ChallengeType | 'ALL' {
  return value === 'WEEKLY' || value === 'MAIN_GOAL' ? value : 'ALL'
}

function getSourceFilter(value: string | null): ChallengeSourceFilter {
  return value === 'MANUAL' || value === 'AUTOMATIC' ? value : 'ALL'
}

function getScopeFilter(value: string | null): ChallengeScopeFilter {
  return value === 'CLIENT' || value === 'GLOBAL' ? value : 'ALL'
}

function getCompletionFilter(value: string | null): ChallengeCompletionFilter {
  return value === 'NOT_ASSIGNED' || value === 'IN_PROGRESS' || value === 'COMPLETED' ? value : 'ALL'
}

export function ChallengesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchDraft, setSearchDraft] = useState(searchParams.get('search') ?? '')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<ChallengeListItem | null>(null)
  const [assigningChallenge, setAssigningChallenge] = useState<ChallengeListItem | null>(null)
  const [progressChallenge, setProgressChallenge] = useState<ChallengeListItem | null>(null)
  const [deletingChallenge, setDeletingChallenge] = useState<ChallengeListItem | null>(null)

  const page = getPage(searchParams.get('page'))
  const search = searchParams.get('search') ?? ''
  const type = getTypeFilter(searchParams.get('type'))
  const source = getSourceFilter(searchParams.get('source'))
  const scope = getScopeFilter(searchParams.get('scope'))
  const completionStatus = getCompletionFilter(searchParams.get('status'))

  useEffect(() => {
    setSearchDraft(search)
  }, [search])

  const filters: ChallengeFilters = {
    page,
    limit: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(type !== 'ALL' ? { type } : {}),
    ...(source !== 'ALL' ? { is_manual: source === 'MANUAL' } : {}),
    ...(scope !== 'ALL' ? { is_global: scope === 'GLOBAL' } : {}),
    ...(completionStatus !== 'ALL' ? { completion_status: completionStatus } : {}),
  }

  const challengesQuery = useChallenges(filters)
  const data = challengesQuery.data
  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const hasActiveFilters = Boolean(search) || type !== 'ALL' || source !== 'ALL' || scope !== 'ALL' || completionStatus !== 'ALL'

  const updateSearchParams = (updates: {
    search?: string
    type?: ChallengeType | 'ALL'
    source?: ChallengeSourceFilter
    scope?: ChallengeScopeFilter
    status?: ChallengeCompletionFilter
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

    if (updates.type !== undefined) {
      if (updates.type === 'ALL') {
        nextSearchParams.delete('type')
      } else {
        nextSearchParams.set('type', updates.type)
      }
    }

    if (updates.source !== undefined) {
      if (updates.source === 'ALL') {
        nextSearchParams.delete('source')
      } else {
        nextSearchParams.set('source', updates.source)
      }
    }

    if (updates.scope !== undefined) {
      if (updates.scope === 'ALL') {
        nextSearchParams.delete('scope')
      } else {
        nextSearchParams.set('scope', updates.scope)
      }
    }

    if (updates.status !== undefined) {
      if (updates.status === 'ALL') {
        nextSearchParams.delete('status')
      } else {
        nextSearchParams.set('status', updates.status)
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Gestión de retos</h1>
          <p className="text-sm text-muted-foreground">
            Crea objetivos principales y retos semanales, asígnalos por cliente o globalmente y revisa el progreso visible desde el panel admin.
          </p>
        </div>

        <Button onClick={() => setCreateOpen(true)}>Nuevo reto</Button>
      </div>

      <ChallengesStatsCards
        summary={data?.summary}
        isLoading={challengesQuery.isLoading}
        isError={challengesQuery.isError}
        isFetching={challengesQuery.isFetching}
        onRetry={() => void challengesQuery.refetch()}
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))] xl:items-end">
              <div className="space-y-2">
                <Label htmlFor="challenge-search">Buscar</Label>
                <div className="flex gap-2">
                  <Input
                    id="challenge-search"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Título o descripción"
                  />
                  <Button type="submit" variant="outline">
                    Buscar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(value) => updateSearchParams({ type: value as ChallengeType | 'ALL', page: 1 })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {CHALLENGE_TYPE_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {CHALLENGE_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modo</Label>
                <Select value={source} onValueChange={(value) => updateSearchParams({ source: value as ChallengeSourceFilter, page: 1 })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_SOURCE_FILTER_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value === 'ALL' ? 'Todos' : value === 'MANUAL' ? 'Manual' : 'Automático'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Alcance</Label>
                <Select value={scope} onValueChange={(value) => updateSearchParams({ scope: value as ChallengeScopeFilter, page: 1 })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_SCOPE_FILTER_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value === 'ALL' ? 'Todos' : value === 'GLOBAL' ? 'Global' : 'Por cliente'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={completionStatus} onValueChange={(value) => updateSearchParams({ status: value as ChallengeCompletionFilter, page: 1 })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_COMPLETION_FILTER_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value === 'ALL' ? 'Todos' : CHALLENGE_COMPLETION_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {data ? `${data.total} reto${data.total === 1 ? '' : 's'} encontrado${data.total === 1 ? '' : 's'}` : 'Cargando resultados...'}
            </p>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ChallengesTable
        items={items}
        page={page}
        totalPages={totalPages}
        isLoading={challengesQuery.isLoading}
        isError={challengesQuery.isError}
        isRefetching={challengesQuery.isRefetching}
        hasActiveFilters={hasActiveFilters}
        onRetry={() => void challengesQuery.refetch()}
        onPageChange={(nextPage) => updateSearchParams({ page: nextPage })}
        onCreate={() => setCreateOpen(true)}
        onEdit={setEditingChallenge}
        onAssign={setAssigningChallenge}
        onViewProgress={setProgressChallenge}
        onDelete={setDeletingChallenge}
      />

      <ChallengeFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ChallengeFormDialog
        challenge={editingChallenge}
        open={Boolean(editingChallenge)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingChallenge(null)
          }
        }}
        onSubmitted={() => setEditingChallenge(null)}
      />
      <AssignChallengeDialog
        challenge={assigningChallenge}
        open={Boolean(assigningChallenge)}
        onOpenChange={(open) => {
          if (!open) {
            setAssigningChallenge(null)
          }
        }}
        onAssigned={() => setAssigningChallenge(null)}
      />
      <ChallengeProgressDrawer
        challenge={progressChallenge}
        open={Boolean(progressChallenge)}
        onOpenChange={(open) => {
          if (!open) {
            setProgressChallenge(null)
          }
        }}
      />
      <DeleteChallengeDialog
        challenge={deletingChallenge}
        open={Boolean(deletingChallenge)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingChallenge(null)
          }
        }}
        onDeleted={() => setDeletingChallenge(null)}
      />
    </div>
  )
}

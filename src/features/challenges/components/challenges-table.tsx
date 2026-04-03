import { AlertTriangle, RefreshCcw, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  getChallengeProgressVariant,
  getChallengeRuleLabel,
  getChallengeScopeLabel,
  getChallengeTypeLabel,
  type ChallengeListItem,
} from '../types'

interface ChallengesTableProps {
  items: ChallengeListItem[]
  page: number
  totalPages: number
  isLoading: boolean
  isError: boolean
  isRefetching: boolean
  hasActiveFilters: boolean
  onRetry: () => void
  onPageChange: (page: number) => void
  onCreate: () => void
  onEdit: (challenge: ChallengeListItem) => void
  onAssign: (challenge: ChallengeListItem) => void
  onViewProgress: (challenge: ChallengeListItem) => void
  onDelete: (challenge: ChallengeListItem) => void
}

function formatDeadline(deadline: string | null) {
  if (!deadline) {
    return 'Sin fecha límite'
  }

  return new Date(deadline).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getProgressClass(variant: ReturnType<typeof getChallengeProgressVariant>) {
  if (variant === 'complete') {
    return 'bg-status-success'
  }

  if (variant === 'active') {
    return 'bg-brand-primary'
  }

  return 'bg-muted-foreground/40'
}

function getModeBadgeClass(challenge: ChallengeListItem) {
  return challenge.is_manual
    ? 'border-border bg-muted text-muted-foreground'
    : 'border-violet-500/30 bg-violet-500/10 text-violet-600'
}

export function ChallengesTable({
  items,
  page,
  totalPages,
  isLoading,
  isError,
  isRefetching,
  hasActiveFilters,
  onRetry,
  onPageChange,
  onCreate,
  onEdit,
  onAssign,
  onViewProgress,
  onDelete,
}: ChallengesTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              {['Reto', 'Tipo', 'Regla', 'Alcance', 'Progreso', 'Límite', 'Acciones'].map((label) => (
                <TableHead key={label}>{label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: 7 }).map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-status-error/20 p-8 text-center">
        <div className="rounded-full bg-status-error/10 p-4 text-status-error">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">No se pudieron cargar los retos</h3>
          <p className="text-sm text-muted-foreground">
            Reintenta para recuperar el listado de objetivos principales y retos semanales.
          </p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCcw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/70 p-10 text-center">
        <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">
          <Target className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {hasActiveFilters ? 'Ningún reto coincide con los filtros' : 'Todavía no hay retos creados'}
          </h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'Ajusta los filtros para volver a ver retos o crea uno nuevo si todavía no existe.'
              : 'Empieza con un objetivo principal o un reto semanal y asígnalo a clientes concretos o a toda tu cartera visible.'}
          </p>
        </div>
        {!hasActiveFilters && (
          <Button onClick={onCreate}>Crear primer reto</Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isRefetching && (
        <p className="text-sm text-muted-foreground">Actualizando listado de retos...</p>
      )}

      <div className="rounded-xl border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Modo</TableHead>
              <TableHead>Alcance</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead>Límite</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((challenge) => {
              const progressVariant = getChallengeProgressVariant(challenge.completion_rate)

              return (
                <TableRow key={challenge.id}>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{challenge.title}</p>
                        <Badge variant="outline" className={cn('font-medium', getModeBadgeClass(challenge))}>
                          {challenge.is_manual ? 'Manual' : 'Automático'}
                        </Badge>
                      </div>
                      <p className="max-w-lg text-sm text-muted-foreground">{challenge.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-brand-primary/20 bg-brand-soft/10 text-brand-primary">
                      {getChallengeTypeLabel(challenge.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getChallengeRuleLabel(challenge.rule_key)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getChallengeScopeLabel(challenge.is_global)}</TableCell>
                  <TableCell>
                    <div className="min-w-[180px] space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {challenge.completed_clients}/{challenge.assigned_clients} clientes
                        </span>
                        <span>{challenge.completion_rate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={cn('h-2 rounded-full transition-all', getProgressClass(progressVariant))}
                          style={{ width: `${Math.min(challenge.completion_rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDeadline(challenge.deadline)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onViewProgress(challenge)}>
                        Progreso
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onAssign(challenge)}>
                        Asignar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onEdit(challenge)}>
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onDelete(challenge)}>
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Anterior
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

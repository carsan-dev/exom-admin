import { AlertTriangle, RefreshCcw, Trophy } from 'lucide-react'
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
import {
  getAchievementModeLabel,
  getAchievementRuleLabel,
  isAutomaticAchievement,
  type AchievementListItem,
} from '../types'

interface AchievementsTableProps {
  items: AchievementListItem[]
  page: number
  totalPages: number
  isLoading: boolean
  isError: boolean
  isRefetching: boolean
  hasActiveFilters: boolean
  onRetry: () => void
  onPageChange: (page: number) => void
  onCreate: () => void
  onEdit: (achievement: AchievementListItem) => void
  onViewUsers: (achievement: AchievementListItem) => void
  onGrant: (achievement: AchievementListItem) => void
  onDelete: (achievement: AchievementListItem) => void
  canDelete: boolean
}

export function AchievementsTable({
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
  onViewUsers,
  onGrant,
  onDelete,
  canDelete,
}: AchievementsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              {['Logro', 'Regla', 'Meta', 'Modo', 'Usuarios', 'Acciones'].map((label) => (
                <TableHead key={label}>{label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: 6 }).map((_, cellIndex) => (
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
          <h3 className="text-lg font-semibold text-foreground">No se pudieron cargar los logros</h3>
          <p className="text-sm text-muted-foreground">
            Reintenta para recuperar el listado de logros configurados.
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
          <Trophy className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {hasActiveFilters ? 'Ningún logro coincide con los filtros' : 'Todavía no hay logros creados'}
          </h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'Ajusta los filtros para volver a ver logros o crea uno nuevo si todavía no existe.'
              : 'Crea logros para premiar a tus clientes por sus esfuerzos y objetivos alcanzados.'}
          </p>
        </div>
        {!hasActiveFilters && (
          <Button onClick={onCreate}>Crear primer logro</Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isRefetching && (
        <p className="text-sm text-muted-foreground">Actualizando listado de logros...</p>
      )}

      <div className="rounded-xl border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logro</TableHead>
              <TableHead>Regla</TableHead>
              <TableHead>Meta</TableHead>
              <TableHead>Modo</TableHead>
              <TableHead>Usuarios</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((achievement) => (
              <TableRow key={achievement.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{achievement.name}</p>
                    <p className="max-w-sm text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-brand-primary/20 bg-brand-soft/10 text-brand-primary">
                    {getAchievementRuleLabel(achievement.criteria_type, achievement.rule_config)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{achievement.criteria_value}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={isAutomaticAchievement(achievement.criteria_type) ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700' : 'border-amber-500/20 bg-amber-500/10 text-amber-700'}>
                    {getAchievementModeLabel(achievement.criteria_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-foreground">{achievement.unlocked_count}</span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    {achievement.unlocked_count === 1 ? 'cliente' : 'clientes'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onViewUsers(achievement)}>
                      Usuarios
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onGrant(achievement)}>
                      Otorgar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(achievement)}>
                      Editar
                    </Button>
                    {canDelete && (
                      <Button variant="outline" size="sm" onClick={() => onDelete(achievement)}>
                        Eliminar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
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

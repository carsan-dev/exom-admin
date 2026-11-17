import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'
import { cn } from '@/lib/utils'
import type { CatalogAvailability } from '../types'

interface AssignmentsCatalogErrorStateProps {
  availability: CatalogAvailability
  onRetryTrainings: () => void
  onRetryDiets: () => void
}

export function AssignmentsCatalogErrorState({
  availability,
  onRetryTrainings,
  onRetryDiets,
}: AssignmentsCatalogErrorStateProps) {
  const affectedCatalogs = [availability.trainings, availability.diets].filter(
    (catalog) => catalog.is_loading || catalog.is_error || catalog.is_empty,
  )

  if (affectedCatalogs.length === 0) {
    return null
  }

  const hasErrors = affectedCatalogs.some((catalog) => catalog.is_error)
  const hasLoading = affectedCatalogs.some((catalog) => catalog.is_loading)
  const onlyRestMode = availability.is_rest_only

  return (
    <div
      className={cn(
        'min-w-0 space-y-4 border p-4',
        hasErrors
          ? 'border-status-error bg-status-error-soft'
          : 'border-status-warning bg-status-warning-soft',
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className={hasErrors ? 'text-status-error' : 'text-status-warning'}>
            {hasLoading && !hasErrors ? (
              <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />
            ) : (
              <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              {hasLoading && !hasErrors ? 'Cargando catálogos de planificación' : 'Catálogos incompletos'}
            </p>
            <p className="text-[13px] text-foreground-secondary">
              {onlyRestMode
                ? 'Ahora mismo solo puedes marcar descanso o limpiar días hasta recuperar entrenamientos y dietas.'
                : 'Puedes seguir planificando con los catálogos disponibles mientras reintentas los que faltan.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(availability.trainings.is_error || availability.trainings.is_loading) && (
            <Button type="button" variant="outline" onClick={onRetryTrainings}>
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Reintentar entrenos
            </Button>
          )}
          {(availability.diets.is_error || availability.diets.is_loading) && (
            <Button type="button" variant="outline" onClick={onRetryDiets}>
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Reintentar dietas
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {affectedCatalogs.map((catalog) => {
          if (catalog.is_loading) {
            return (
              <StatusChip key={catalog.key} variant="brand">
                {catalog.label}: cargando
              </StatusChip>
            )
          }

          if (catalog.is_error) {
            return (
              <StatusChip key={catalog.key} variant="danger">
                {catalog.label}: error
              </StatusChip>
            )
          }

          return (
            <StatusChip key={catalog.key} variant="neutral">
              {catalog.label}: sin elementos disponibles
            </StatusChip>
          )
        })}
      </div>

      {affectedCatalogs.some((catalog) => catalog.error_message) && (
        <div className="space-y-2 border-t border-border pt-3">
          {affectedCatalogs
            .filter((catalog) => catalog.error_message)
            .map((catalog) => (
              <p key={catalog.key} className="text-[13px] text-foreground-secondary">
                <span className="font-semibold text-foreground">{catalog.label}:</span> {catalog.error_message}
              </p>
            ))}
        </div>
      )}
    </div>
  )
}

import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
    <Card className="border-dashed border-border/70">
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={hasErrors ? 'rounded-full bg-status-error/10 p-3 text-status-error' : 'rounded-full bg-brand-soft/10 p-3 text-brand-primary'}
            >
              {hasLoading && !hasErrors ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">
                {hasLoading && !hasErrors ? 'Cargando catalogos de planificacion' : 'Catalogos incompletos'}
              </p>
              <p className="text-sm text-muted-foreground">
                {onlyRestMode
                  ? 'Ahora mismo solo puedes marcar descanso o limpiar dias hasta recuperar entrenamientos y dietas.'
                  : 'Puedes seguir planificando con los catalogos disponibles mientras reintentas los que faltan.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(availability.trainings.is_error || availability.trainings.is_loading) && (
              <Button type="button" variant="outline" onClick={onRetryTrainings}>
                <RefreshCw className="h-4 w-4" />
                Reintentar entrenos
              </Button>
            )}
            {(availability.diets.is_error || availability.diets.is_loading) && (
              <Button type="button" variant="outline" onClick={onRetryDiets}>
                <RefreshCw className="h-4 w-4" />
                Reintentar dietas
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {affectedCatalogs.map((catalog) => {
            if (catalog.is_loading) {
              return (
                <Badge key={catalog.key} variant="outline" className="border-brand-primary/30 bg-brand-soft/20 text-brand-primary">
                  {catalog.label}: cargando
                </Badge>
              )
            }

            if (catalog.is_error) {
              return (
                <Badge key={catalog.key} variant="outline" className="border-status-error/30 bg-status-error/10 text-status-error">
                  {catalog.label}: error
                </Badge>
              )
            }

            return (
              <Badge key={catalog.key} variant="outline" className="border-border/70 bg-muted/20 text-muted-foreground">
                {catalog.label}: sin elementos disponibles
              </Badge>
            )
          })}
        </div>

        {affectedCatalogs.some((catalog) => catalog.error_message) && (
          <div className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-4">
            {affectedCatalogs
              .filter((catalog) => catalog.error_message)
              .map((catalog) => (
                <p key={catalog.key} className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{catalog.label}:</span> {catalog.error_message}
                </p>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

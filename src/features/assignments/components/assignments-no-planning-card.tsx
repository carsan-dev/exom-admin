import { Card, CardContent } from '@/components/ui/card'
import type { AssignmentsViewMode } from '../types'

export function AssignmentsNoPlanningCard({ viewMode }: { viewMode: AssignmentsViewMode }) {
  return (
    <Card className="border-dashed border-border/70">
      <CardContent className="flex min-h-28 flex-col items-center justify-center py-6 text-center sm:py-6">
        <div>
          <p className="text-sm font-medium text-foreground">
            {viewMode === 'week' ? 'Semana sin planificación' : 'Mes sin planificación'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {viewMode === 'week'
              ? 'Selecciona uno o varios días en el grid para crear la primera asignación de esta semana.'
              : 'Selecciona varios días en el calendario mensual para construir una planificación más rápida.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

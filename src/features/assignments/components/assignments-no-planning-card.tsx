import { CalendarX2 } from 'lucide-react'
import type { AssignmentsViewMode } from '../types'

export function AssignmentsNoPlanningCard({ viewMode }: { viewMode: AssignmentsViewMode }) {
  return (
    <div className="flex items-start gap-2 text-[13px] text-foreground-secondary">
      <CalendarX2 aria-hidden="true" className="mt-0.5 size-4 flex-none text-foreground-muted" />
      <div>
        <p className="font-semibold text-foreground">
          {viewMode === 'week' ? 'Semana sin planificación' : 'Mes sin planificación'}
        </p>
        <p className="mt-0.5">
          {viewMode === 'week'
            ? 'Selecciona uno o varios días en el grid para crear la primera asignación de esta semana.'
            : 'Selecciona varios días en el calendario mensual para construir una planificación más rápida.'}
        </p>
      </div>
    </div>
  )
}

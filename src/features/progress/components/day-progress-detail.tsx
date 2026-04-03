import { CheckCircle2, Dumbbell, Salad, StickyNote } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { DayProgress } from '../types'

interface DayProgressDetailProps {
  date: string
  progress: DayProgress | null | undefined
  isLoading?: boolean
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export function DayProgressDetail({ date, progress, isLoading }: DayProgressDetailProps) {
  const formattedDate = dateFormatter.format(new Date(date + 'T00:00:00'))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl capitalize">{formattedDate}</CardTitle>
        <CardDescription>Detalle de actividad del día</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-52" />
          </div>
        ) : !progress ? (
          <p className="text-sm text-muted-foreground">Sin registro de progreso para este día.</p>
        ) : (
          <>
            {/* Entrenamiento */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-brand-primary" />
                <span className="text-sm font-medium">Entrenamiento</span>
                <Badge variant={progress.training_completed ? 'default' : 'secondary'}>
                  {progress.training_completed ? 'Completado' : 'No completado'}
                </Badge>
              </div>
              {progress.exercises_completed.length > 0 ? (
                <ul className="space-y-1 pl-6">
                  {progress.exercises_completed.map((ex, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-success shrink-0" />
                      <span className="font-mono text-xs">{ex.exercise_id}</span>
                      {ex.weight_used != null && (
                        <span className="text-xs">— {ex.weight_used} kg</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pl-6 text-xs text-muted-foreground">Sin ejercicios registrados</p>
              )}
            </div>

            {/* Dieta */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Salad className="h-4 w-4 text-status-success" />
                <span className="text-sm font-medium">Dieta</span>
                <Badge variant={progress.meals_completed.length > 0 ? 'default' : 'secondary'}>
                  {progress.meals_completed.length > 0
                    ? `${progress.meals_completed.length} comidas`
                    : 'Sin comidas'}
                </Badge>
              </div>
              {progress.meals_completed.length > 0 ? (
                <ul className="space-y-1 pl-6">
                  {progress.meals_completed.map((mealId, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-success shrink-0" />
                      <span className="font-mono text-xs">{mealId}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pl-6 text-xs text-muted-foreground">Sin comidas registradas</p>
              )}
            </div>

            {/* Notas */}
            {progress.notes && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Notas</span>
                </div>
                <p className="pl-6 text-sm text-muted-foreground">{progress.notes}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { CalendarDay } from '../types'

interface ProgressCalendarProps {
  year: number
  month: number
  days: CalendarDay[] | undefined
  isLoading?: boolean
  selectedDate: string
  onDateSelect: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function getDayStatus(day: CalendarDay): { color: string; label: string } {
  const today = new Date().toISOString().split('T')[0]
  const isPast = day.date < today

  if (day.is_rest_day) return { color: 'bg-muted/60 text-muted-foreground', label: 'Día de descanso' }

  const completedBoth = day.training_completed && day.diet_completed
  const completedSome = day.training_completed || day.diet_completed

  if (completedBoth || (!day.has_training && day.diet_completed) || (!day.has_diet && day.training_completed)) {
    return { color: 'bg-status-success/20 text-status-success border border-status-success/40', label: 'Completado' }
  }

  if (completedSome) {
    return { color: 'bg-status-warning/20 text-status-warning border border-status-warning/40', label: 'Parcialmente completado' }
  }

  if (isPast) {
    return { color: 'bg-status-error/20 text-status-error border border-status-error/40', label: 'No completado' }
  }

  return { color: 'bg-status-info/10 text-foreground border border-border/60', label: 'Pendiente' }
}

export function ProgressCalendar({
  year,
  month,
  days,
  isLoading,
  selectedDate,
  onDateSelect,
  onMonthChange,
}: ProgressCalendarProps) {
  function goToPrev() {
    if (month === 1) onMonthChange(year - 1, 12)
    else onMonthChange(year, month - 1)
  }

  function goToNext() {
    if (month === 12) onMonthChange(year + 1, 1)
    else onMonthChange(year, month + 1)
  }

  // Build grid: first weekday of the month (Monday-based, 0=Mon)
  const firstDay = new Date(year, month - 1, 1)
  const firstWeekday = (firstDay.getDay() + 6) % 7 // 0=Mon
  const daysInMonth = new Date(year, month, 0).getDate()

  const gridCells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }),
  ]

  // Pad to complete last row
  while (gridCells.length % 7 !== 0) gridCells.push(null)

  const daysByDate = new Map(days?.map((d) => [d.date, d]) ?? [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Calendario de cumplimiento</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-36 text-center">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mt-2">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-md" />
            ))}
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-7 gap-1">
              {gridCells.map((dateStr, idx) => {
                if (!dateStr) return <div key={idx} />

                const day = daysByDate.get(dateStr)
                const dayNum = new Date(dateStr).getDate()
                const isSelected = dateStr === selectedDate

                if (!day) {
                  return (
                    <button
                      key={dateStr}
                      onClick={() => onDateSelect(dateStr)}
                      className={cn(
                        'h-9 rounded-md text-sm font-medium transition-colors',
                        'border border-border/40 text-muted-foreground hover:bg-muted',
                        isSelected && 'ring-2 ring-brand-primary ring-offset-1',
                      )}
                    >
                      {dayNum}
                    </button>
                  )
                }

                const { color, label } = getDayStatus(day)
                return (
                  <Tooltip key={dateStr}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onDateSelect(dateStr)}
                        className={cn(
                          'h-9 rounded-md text-sm font-medium transition-colors',
                          color,
                          isSelected && 'ring-2 ring-brand-primary ring-offset-1',
                          'hover:opacity-80',
                        )}
                      >
                        {dayNum}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{label}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </TooltipProvider>
        )}
        <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-status-success/30 border border-status-success/40" />
            Completado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-status-warning/30 border border-status-warning/40" />
            Parcial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-status-error/30 border border-status-error/40" />
            No completado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-muted/60" />
            Descanso
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-status-info/15 border border-border/60" />
            Pendiente
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

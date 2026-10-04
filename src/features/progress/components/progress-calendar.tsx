import { Check, ChevronLeft, ChevronRight, CircleHelp, Clock, Minus, Moon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const statuses = {
  completed: { label: 'Completado', icon: Check, color: 'bg-status-success/10 text-foreground' },
  partial: { label: 'Parcialmente completado', icon: Minus, color: 'bg-status-warning/10 text-foreground' },
  missed: { label: 'No completado', icon: X, color: 'bg-status-error/10 text-foreground' },
  rest: { label: 'Día de descanso', icon: Moon, color: 'bg-muted text-foreground' },
  pending: { label: 'Pendiente', icon: Clock, color: 'bg-background text-foreground' },
  unassigned: { label: 'Sin asignaciones', icon: Minus, color: 'bg-background text-muted-foreground' },
  unknown: { label: 'Sin registro', icon: CircleHelp, color: 'bg-background text-muted-foreground' },
} as const

function getDayStatus(day: CalendarDay | undefined) {
  if (!day) return statuses.unknown
  if (day.is_rest_day) return statuses.rest
  if (!day.has_training && !day.has_diet && !day.training_completed && !day.diet_completed) return statuses.unassigned
  if ((day.training_completed && day.diet_completed) || (!day.has_training && day.diet_completed) || (!day.has_diet && day.training_completed)) return statuses.completed
  if (day.training_completed || day.diet_completed) return statuses.partial
  return day.date < new Date().toISOString().slice(0, 10) ? statuses.missed : statuses.pending
}

export function ProgressCalendar({ year, month, days, isLoading, selectedDate, onDateSelect, onMonthChange }: ProgressCalendarProps) {
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const dates = Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)
  const daysByDate = new Map(days?.map((day) => [day.date, day]) ?? [])
  const selectedStatus = getDayStatus(daysByDate.get(selectedDate))
  const previous = () => onMonthChange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)
  const next = () => onMonthChange(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1)

  return <section aria-label="Calendario de actividad" className="min-w-0 space-y-4 rounded-lg bg-card p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Calendario de actividad</h2>
      <div className="flex items-center gap-2">
        <Button aria-label="Mes anterior" variant="outline" size="icon" onClick={previous}><ChevronLeft aria-hidden="true" /></Button>
        <span aria-live="polite" className="w-32 text-center text-sm font-medium">{MONTH_NAMES[month - 1]} {year}</span>
        <Button aria-label="Mes siguiente" variant="outline" size="icon" onClick={next}><ChevronRight aria-hidden="true" /></Button>
      </div>
    </div>
    <p className="text-sm text-muted-foreground">Selecciona un día para consultar ejercicios, comidas y notas. Sin registro no significa incumplimiento.</p>
    {isLoading ? <Skeleton className="h-72 w-full" /> : <>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {DAY_NAMES.map((name) => <span key={name} className="py-1 text-center text-xs text-muted-foreground">{name}</span>)}
        {Array.from({ length: firstWeekday }, (_, i) => <span key={`blank-${i}`} />)}
        {dates.map((date, i) => {
          const { label, icon: Icon, color } = getDayStatus(daysByDate.get(date))
          return <button key={date} type="button" aria-label={`${date} · ${label}`} title={label}
            aria-pressed={date === selectedDate} onClick={() => onDateSelect(date)}
            className={cn('flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md border border-border text-sm tabular-nums transition-colors duration-150 motion-reduce:transition-none hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', color,
              date === selectedDate && 'border-brand-primary ring-2 ring-brand-primary ring-offset-1')}>
            <span>{i + 1}</span><Icon aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        })}
      </div>
      <p role="status" className="text-sm font-medium">Selección: {selectedDate} · {selectedStatus.label}</p>
    </>}
    <ul aria-label="Leyenda de actividad" className="flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
      {Object.values(statuses).map(({ label, icon: Icon }) => <li key={label} className="flex items-center gap-1.5"><Icon aria-hidden="true" className="h-3.5 w-3.5" />{label}</li>)}
    </ul>
    <details className="border-t pt-3">
      <summary className="cursor-pointer rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver historial del mes en lista</summary>
      <ul className="mt-3 max-h-72 overflow-y-auto divide-y">
        {!isLoading && dates.map((date) => <li key={date}><button type="button" aria-pressed={selectedDate === date} onClick={() => onDateSelect(date)} className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 rounded px-2 py-2 text-left text-sm tabular-nums hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>{date}</span><span>{getDayStatus(daysByDate.get(date)).label}</span></button></li>)}
      </ul>
    </details>
  </section>
}

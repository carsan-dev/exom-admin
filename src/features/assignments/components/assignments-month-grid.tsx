import { parseISO } from 'date-fns'
import { AssignmentDayCard } from './assignment-day-card'
import type { AssignmentDay } from '../types'

const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

interface AssignmentsMonthGridProps {
  days: AssignmentDay[]
  selectedDates: string[]
  disabled?: boolean
  /** Current date (yyyy-MM-dd); only the matching visible day is marked. */
  todayDate?: string
  onToggleDay: (date: string) => void
  onOpenDay?: (date: string) => void
}

function compareByDate(left: AssignmentDay, right: AssignmentDay) {
  return left.date.localeCompare(right.date)
}

export function AssignmentsMonthGrid({
  days,
  selectedDates,
  disabled = false,
  todayDate,
  onToggleDay,
  onOpenDay,
}: AssignmentsMonthGridProps) {
  const orderedDays = [...days].sort(compareByDate)
  const firstVisibleDay = orderedDays[0]
  const leadingEmptyCells = firstVisibleDay
    ? (parseISO(firstVisibleDay.date).getUTCDay() + 6) % 7
    : 0
  const totalCells = leadingEmptyCells + orderedDays.length
  const trailingEmptyCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)

  return (
    <div className="border-t border-border md:border-l">
      <div className="hidden grid-cols-7 md:grid">
        {weekdayLabels.map((label) => (
          <div key={label} className="border-r border-b border-border-strong px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground-muted">
            {label}
          </div>
        ))}
      </div>

      <div className="block md:grid md:grid-cols-7">
        {Array.from({ length: leadingEmptyCells }).map((_, index) => (
          <div key={`leading-${index}`} className="hidden h-[110px] border-r border-b border-border bg-background-darker md:block" />
        ))}

        {orderedDays.map((day) => (
          <AssignmentDayCard
            key={day.date}
            day={day}
            variant="month"
            isSelected={selectedDates.includes(day.date)}
            disabled={disabled}
            isToday={day.date === todayDate}
            onSelect={onToggleDay}
            onOpen={onOpenDay}
          />
        ))}

        {Array.from({ length: trailingEmptyCells }).map((_, index) => (
          <div key={`trailing-${index}`} className="hidden h-[110px] border-r border-b border-border bg-background-darker md:block" />
        ))}
      </div>
    </div>
  )
}

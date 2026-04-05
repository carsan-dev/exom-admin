import { parseISO } from 'date-fns'
import { AssignmentDayCard } from './assignment-day-card'
import type { AssignmentDay } from '../types'

const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

interface AssignmentsMonthGridProps {
  days: AssignmentDay[]
  selectedDates: string[]
  disabled?: boolean
  onToggleDay: (date: string) => void
}

function compareByDate(left: AssignmentDay, right: AssignmentDay) {
  return left.date.localeCompare(right.date)
}

export function AssignmentsMonthGrid({
  days,
  selectedDates,
  disabled = false,
  onToggleDay,
}: AssignmentsMonthGridProps) {
  const orderedDays = [...days].sort(compareByDate)
  const firstVisibleDay = orderedDays[0]
  const leadingEmptyCells = firstVisibleDay
    ? (parseISO(firstVisibleDay.date).getUTCDay() + 6) % 7
    : 0
  const totalCells = leadingEmptyCells + orderedDays.length
  const trailingEmptyCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)

  return (
    <div className="space-y-3">
      <div className="space-y-3 md:hidden">
        {orderedDays.map((day) => (
          <AssignmentDayCard
            key={day.date}
            day={day}
            variant="month"
            isSelected={selectedDates.includes(day.date)}
            disabled={disabled}
            onSelect={onToggleDay}
          />
        ))}
      </div>

      <div className="hidden space-y-3 md:block">
        <div className="grid grid-cols-7 gap-2">
          {weekdayLabels.map((label) => (
            <div key={label} className="px-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: leadingEmptyCells }).map((_, index) => (
            <div key={`leading-${index}`} className="min-h-32 rounded-2xl border border-dashed border-border/40 bg-muted/10" />
          ))}

          {orderedDays.map((day) => (
            <AssignmentDayCard
              key={day.date}
              day={day}
              variant="month"
              isSelected={selectedDates.includes(day.date)}
              disabled={disabled}
              onSelect={onToggleDay}
            />
          ))}

          {Array.from({ length: trailingEmptyCells }).map((_, index) => (
            <div key={`trailing-${index}`} className="min-h-32 rounded-2xl border border-dashed border-border/40 bg-muted/10" />
          ))}
        </div>
      </div>
    </div>
  )
}

import type { AssignmentDay } from '../types'
import { AssignmentDayCard } from './assignment-day-card'

interface AssignmentsWeekGridProps {
  days: AssignmentDay[]
  selectedDates: string[]
  disabled?: boolean
  /** Current date (yyyy-MM-dd); only the matching visible day is marked. */
  todayDate?: string
  onToggleDay: (date: string) => void
  onOpenDay?: (date: string) => void
}

export function AssignmentsWeekGrid({
  days,
  selectedDates,
  disabled = false,
  todayDate,
  onToggleDay,
  onOpenDay,
}: AssignmentsWeekGridProps) {
  return (
    <div className="grid border-t border-border md:grid-cols-7 md:border-t-0">
      {days.map((day) => (
        <AssignmentDayCard
          key={day.date}
          day={day}
          variant="week"
          isSelected={selectedDates.includes(day.date)}
          disabled={disabled}
          isToday={day.date === todayDate}
          onSelect={onToggleDay}
          onOpen={onOpenDay}
        />
      ))}
    </div>
  )
}

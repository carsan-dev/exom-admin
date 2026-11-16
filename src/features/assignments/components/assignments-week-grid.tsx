import type { AssignmentDay } from '../types'
import { AssignmentDayCard } from './assignment-day-card'

interface AssignmentsWeekGridProps {
  days: AssignmentDay[]
  selectedDates: string[]
  disabled?: boolean
  onToggleDay: (date: string) => void
}

export function AssignmentsWeekGrid({
  days,
  selectedDates,
  disabled = false,
  onToggleDay,
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
          onSelect={onToggleDay}
        />
      ))}
    </div>
  )
}

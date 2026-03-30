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
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      {days.map((day) => (
        <AssignmentDayCard
          key={day.date}
          day={day}
          isSelected={selectedDates.includes(day.date)}
          disabled={disabled}
          onSelect={onToggleDay}
        />
      ))}
    </div>
  )
}

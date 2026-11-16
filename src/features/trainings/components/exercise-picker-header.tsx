interface ExercisePickerHeaderProps {
  exerciseCount: number
  trackedCount: number
  allTracked: boolean
  onSetAllTracking: (enabled: boolean) => void
}

export function ExercisePickerHeader({
  exerciseCount,
  trackedCount,
  allTracked,
  onSetAllTracking,
}: ExercisePickerHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="font-display text-xl font-extrabold uppercase leading-none text-foreground">Ejercicios</p>
      {exerciseCount > 0 && (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground max-md:min-h-11">
          <input
            type="checkbox"
            checked={allTracked}
            ref={(node) => {
              if (node) node.indeterminate = trackedCount > 0 && !allTracked
            }}
            onChange={(event) => onSetAllTracking(event.target.checked)}
            className="h-4 w-4 rounded border-border accent-brand-primary"
          />
          Solicitar registro en todos
        </label>
      )}
    </div>
  )
}

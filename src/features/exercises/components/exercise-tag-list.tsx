import { Tag } from '@/components/ui/tag'

interface ExerciseTagListProps {
  values: string[]
  max?: number
  /** Texto cuando no hay valores. Sin él no se pinta nada. */
  emptyLabel?: string
}

export function ExerciseTagList({ values, max = 2, emptyLabel }: ExerciseTagListProps) {
  if (values.length === 0) {
    return emptyLabel ? <span className="text-xs text-foreground-muted">{emptyLabel}</span> : null
  }

  return (
    <div className="flex flex-wrap gap-1">
      {values.slice(0, max).map((value) => (
        <Tag key={value}>{value}</Tag>
      ))}
      {values.length > max && (
        <Tag className="text-foreground-muted" title={values.slice(max).join(', ')}>
          +{values.length - max}
        </Tag>
      )}
    </div>
  )
}

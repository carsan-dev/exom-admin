export function formatCompletedSet(set: {
  set_number: number
  reps?: number | null
  seconds?: number | null
  weight_kg?: number | null
}) {
  return [
    `Serie ${set.set_number}`,
    set.reps != null ? `${set.reps} reps` : null,
    set.seconds != null ? `${set.seconds}s` : null,
    set.weight_kg != null ? `${set.weight_kg} kg` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

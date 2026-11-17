import { useMediaQuery } from '@/hooks/use-media-query'
import { ExercisesMobileList } from './exercises-mobile-list'
import { ExercisesTable, type ExercisesTableProps } from './exercises-table'

/** Tabla desde md; lista apilada por debajo. Solo se monta una variante. */
export function ExercisesList(props: ExercisesTableProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)', true)
  return isDesktop ? <ExercisesTable {...props} /> : <ExercisesMobileList {...props} />
}

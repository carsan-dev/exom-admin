import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'
import { getApiErrorStatus } from '@/lib/api-utils'
import { useTrainingOverview, type ExerciseIdentification } from '../api'
import { useExerciseSearch } from './use-exercise-search'

const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const value = (amount: number | null | undefined, unit = '') => amount == null ? 'Sin dato' : `${number.format(amount)}${unit}`

export function TrainingExerciseTable({ clientId, from, to }: { clientId: string; from: string; to: string }) {
  const [identification, setIdentification] = useState<ExerciseIdentification>('identified')
  const { search, setSearch, debouncedSearch } = useExerciseSearch()
  const filterScope = JSON.stringify([identification, debouncedSearch])
  const [exerciseCursorState, setExerciseCursorState] = useState<{ scope: string; cursors: (string | null)[] }>({ scope: filterScope, cursors: [null] })
  const exerciseCursors = exerciseCursorState.scope === filterScope ? exerciseCursorState.cursors : [null]
  const waiting = search.trim() !== debouncedSearch
  const overview = useTrainingOverview(clientId, from, to, !waiting, exerciseCursors[exerciseCursors.length - 1], { identification, search: debouncedSearch })
  const exercises = (overview.data?.exercises ?? []).filter((item) => identification === 'all' || item.exercise_name?.trim())
  const exerciseLabels = Object.fromEntries(exercises.map((item, index) => [item.exercise_id,
    item.exercise_name?.trim() || `Nombre no disponible · Ref. ${exerciseCursors.length}.${index + 1}`]))

  return <section aria-label="Resumen de ejercicios" className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
    <div className="space-y-1">
      <h2 className="text-xl font-semibold">Ejercicios</h2>
      <p className="max-w-prose text-sm text-muted-foreground">Resumen del periodo por ejercicio, incluidos los que no tienen métricas. Selecciona «Todos» para consultar también registros sin nombre.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,360px)]">
      <label className="space-y-2 text-sm font-medium">Mostrar ejercicios
        <select aria-label="Mostrar ejercicios" value={identification} onChange={(event) => setIdentification(event.target.value === 'all' ? 'all' : 'identified')}
          className="block h-10 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="identified">Identificados</option><option value="all">Todos</option>
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium">Buscar ejercicios
        <Input type="search" aria-label="Buscar ejercicios" placeholder="Escribe el nombre de un ejercicio…" maxLength={120} value={search}
          onChange={(event) => setSearch(event.target.value)} className="border-input bg-background" />
      </label>
    </div>
    {waiting || overview.isPending ? <p role="status">Buscando ejercicios…</p> : overview.isError ? <div role="alert">
      {getApiErrorStatus(overview.error) === 413 ? 'Reduce el intervalo de fechas para buscar ejercicios.' : 'No se pudieron cargar los ejercicios.'}
      {getApiErrorStatus(overview.error) !== 413 && <Button variant="outline" onClick={() => void overview.refetch()}>Reintentar ejercicios</Button>}
    </div> : exercises.length === 0 ? <div className="space-y-3 rounded-md bg-muted p-4">
      <p className="text-sm text-muted-foreground">{identification === 'identified' ? 'No hay ejercicios identificados para esta consulta.' : 'Sin ejercicios registrados para esta consulta.'}</p>
      {identification === 'identified' && <Button variant="outline" onClick={() => setIdentification('all')}>Mostrar todos</Button>}
    </div> : <details open className="border-t pt-3">
      <summary className="cursor-pointer rounded-sm py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Ver métricas de {exercises.length} ejercicios · página {exerciseCursors.length}
      </summary>
      <p className="mb-3 text-xs text-muted-foreground">PR: registro de peso y repeticiones devuelto por el histórico. Su peso no es una carga media. Volumen: kg·reps; las series por tiempo no suman volumen.</p>
      <div role="region" tabIndex={0} aria-label="Tabla de ejercicios desplazable" className="overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full min-w-[800px] text-left text-sm tabular-nums [&_td]:px-3 [&_td]:py-3 [&_td]:align-top [&_thead_th]:px-3 [&_thead_th]:pb-3">
          <caption className="sr-only">Resumen de ejercicios del periodo</caption>
          <thead><tr><th scope="col">Ejercicio</th><th scope="col">Peso del PR (kg)</th><th scope="col">Máx. reps o segundos</th><th scope="col">Series</th><th scope="col">RIR</th><th scope="col">Volumen (kg·reps)</th><th scope="col">PR</th></tr></thead>
          <tbody>{exercises.map((item) => <tr key={item.exercise_id} className="border-t">
            <th scope="row" className="min-w-56 max-w-80 whitespace-normal break-words px-3 py-3 align-top font-medium">{exerciseLabels[item.exercise_id]}</th>
            <td>{value(item.pr?.weight_kg, ' kg')}</td>
            <td>{item.max_seconds !== null ? value(item.max_seconds, ' s') : value(item.max_reps, ' reps')}</td>
            <td>{item.sets === 0 ? 'Sin dato' : value(item.sets)}</td><td>{value(item.mean_rir)}</td><td>{value(item.volume, ' kg·reps')}</td>
            <td>{item.pr ? `${value(item.pr.weight_kg, ' kg')} × ${value(item.pr.reps, ' reps')} · ${formatDate(`${item.pr.date}T00:00:00`, "d 'de' MMMM 'de' yyyy")}` : 'Sin dato'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>}
    {!waiting && !overview.isError && exercises.some((item) => !item.exercise_name) && <p className="text-sm text-muted-foreground">Conservamos las series y cargas aunque el nombre original no esté disponible. Las referencias distinguen los ejercicios de esta página; no son sus nombres.</p>}
    {(exerciseCursors.length > 1 || overview.data?.next_cursor) && <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={waiting || overview.isPending || exerciseCursors.length === 1}
        onClick={() => setExerciseCursorState({ scope: filterScope, cursors: exerciseCursors.slice(0, -1) })}>Ejercicios anteriores</Button>
      <Button variant="outline" disabled={waiting || overview.isPending || overview.isError || !overview.data?.next_cursor}
        onClick={() => { const nextCursor = overview.data?.next_cursor; if (nextCursor) setExerciseCursorState({ scope: filterScope, cursors: [...exerciseCursors, nextCursor] }) }}>Más ejercicios</Button>
    </div>}
  </section>
}

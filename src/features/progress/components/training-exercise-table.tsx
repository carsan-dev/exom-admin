import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  return (<Card><CardHeader className="gap-4 space-y-0"><CardTitle>Ejercicios</CardTitle>
      <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,360px)]">
        <label className="space-y-2 text-sm font-medium">Mostrar ejercicios
          <select aria-label="Mostrar ejercicios" value={identification} onChange={(event) => setIdentification(event.target.value === 'all' ? 'all' : 'identified')} className="block h-10 w-full rounded-md border border-foreground/20 bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="identified">Identificados</option><option value="all">Todos</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">Buscar ejercicios
          <Input type="search" aria-label="Buscar ejercicios" placeholder="Escribe el nombre de un ejercicio…" maxLength={120} value={search} onChange={(event) => setSearch(event.target.value)} className="border-foreground/20 bg-background" />
        </label>
      </div>
    </CardHeader><CardContent>
      {waiting || overview.isPending ? <p role="status">Buscando ejercicios…</p> : overview.isError ? <div role="alert">
        {getApiErrorStatus(overview.error) === 413 ? 'Reduce el intervalo de fechas para buscar ejercicios.' : 'No se pudieron cargar los ejercicios.'}
        {getApiErrorStatus(overview.error) !== 413 && <Button variant="outline" onClick={() => void overview.refetch()}>Reintentar ejercicios</Button>}
      </div> : exercises.length === 0 ? <div className="flex flex-col items-center gap-4 rounded-md border border-dashed border-foreground/20 px-4 py-8 text-center"><p className="text-sm text-muted-foreground">{identification === 'identified' ? 'No hay ejercicios identificados para esta consulta.' : 'Sin ejercicios registrados para esta consulta.'}</p>
        {identification === 'identified' && <Button variant="outline" onClick={() => setIdentification('all')}>Mostrar todos</Button>}</div> : <div role="region" tabIndex={0} aria-label="Tabla de ejercicios desplazable" className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm [&_td]:px-3 [&_td]:py-3 [&_td]:align-top [&_thead_th]:px-3 [&_thead_th]:pb-3"><caption className="sr-only">Resumen de ejercicios del periodo</caption><thead><tr><th>Ejercicio</th><th>Carga</th><th>Reps o segundos</th><th>Series</th><th>RIR</th><th>Volumen</th><th>PR</th></tr></thead><tbody>{exercises.map((item) => <tr key={item.exercise_id} className="border-t"><th scope="row" className="min-w-56 max-w-80 whitespace-normal break-words px-3 py-3 align-top font-medium">{exerciseLabels[item.exercise_id]}</th><td>{value(item.pr?.weight_kg, ' kg')}</td><td>{item.max_seconds !== null ? value(item.max_seconds, ' s') : value(item.max_reps, ' reps')}</td><td>{item.sets === 0 ? 'Sin dato' : value(item.sets)}</td><td>{value(item.mean_rir)}</td><td>{value(item.volume, ' kg·reps')}</td><td>{item.pr ? `${value(item.pr.weight_kg, ' kg')} × ${value(item.pr.reps, ' reps')} · ${formatDate(`${item.pr.date}T00:00:00`, "d 'de' MMMM 'de' yyyy")}` : 'Sin dato'}</td></tr>)}</tbody></table></div>}
      {!waiting && !overview.isError && exercises.some((item) => !item.exercise_name) && <p className="mt-2 text-sm text-muted-foreground">Conservamos las series y cargas aunque el nombre original no esté disponible. Las referencias distinguen los ejercicios de esta página; no son sus nombres.</p>}
      {(exerciseCursors.length > 1 || overview.data?.next_cursor) && <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" disabled={waiting || overview.isPending || exerciseCursors.length === 1} onClick={() => setExerciseCursorState({ scope: filterScope, cursors: exerciseCursors.slice(0, -1) })}>Ejercicios anteriores</Button><Button variant="outline" disabled={waiting || overview.isPending || overview.isError || !overview.data?.next_cursor} onClick={() => { const nextCursor = overview.data?.next_cursor; if (nextCursor) setExerciseCursorState({ scope: filterScope, cursors: [...exerciseCursors, nextCursor] }) }}>Más ejercicios</Button></div>}
    </CardContent></Card>)
}

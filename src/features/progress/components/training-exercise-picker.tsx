import { useId, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getApiErrorStatus } from '@/lib/api-utils'
import { useTrainingExerciseSearch } from '../api'
import type { TrainingExerciseSummary } from '../types'
import { useExerciseSearch } from './use-exercise-search'

export function TrainingExercisePicker({ clientId, from, to, selected, onSelect }: {
  clientId: string; from: string; to: string; selected: TrainingExerciseSummary | null
  onSelect: (exercise: TrainingExerciseSummary) => void
}) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const { search, setSearch, debouncedSearch } = useExerciseSearch()
  const query = useTrainingExerciseSearch(clientId, from, to, debouncedSearch, open)
  const waiting = search.trim() !== debouncedSearch
  const exercises = Array.from(new Map((query.data?.pages.flatMap((page) => page.exercises) ?? [])
    .filter((exercise) => exercise.exercise_name?.trim()).map((exercise) => [exercise.exercise_id, exercise])).values())
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline" role="combobox" aria-label="Ejercicio para evolución de cargas" aria-expanded={open} aria-controls={listId}
        className="h-auto min-h-10 w-full justify-between gap-2 text-left">
        <span className="min-w-0 whitespace-normal break-words">{selected?.exercise_name || 'Selecciona un ejercicio'}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0" align="start">
      <Command shouldFilter={false}>
        <CommandInput aria-label="Buscar ejercicio para evolución de cargas" placeholder="Buscar ejercicio…" value={search} maxLength={120} onValueChange={setSearch} />
        <CommandList id={listId}>
          {waiting || query.isPending ? <p role="status" className="p-3 text-sm">Buscando ejercicios…</p> : <>
            {query.isError && <div role="alert" className="p-3 text-sm">
              {getApiErrorStatus(query.error) === 413 ? 'Reduce el intervalo de fechas para buscar ejercicios.' : 'No se pudieron cargar los ejercicios.'}
              {getApiErrorStatus(query.error) !== 413 && <Button variant="ghost" onClick={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}>Reintentar búsqueda</Button>}
            </div>}
            {!query.isError && exercises.length === 0 && <p className="p-3 text-sm">No hay ejercicios identificados para esta búsqueda.</p>}
            {exercises.map((exercise) => <CommandItem key={exercise.exercise_id} value={exercise.exercise_id} onSelect={() => { onSelect(exercise); setOpen(false) }}>
              <span className="min-w-0 break-words">{exercise.exercise_name}</span>
              {selected?.exercise_id === exercise.exercise_id && <Check className="ml-auto h-4 w-4 shrink-0" aria-hidden="true" />}
            </CommandItem>)}
          </>}
        </CommandList>
        {query.hasNextPage && !waiting && <Button variant="ghost" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {query.isFetchingNextPage ? 'Cargando…' : 'Cargar más ejercicios'}
        </Button>}
      </Command>
    </PopoverContent>
  </Popover>
}

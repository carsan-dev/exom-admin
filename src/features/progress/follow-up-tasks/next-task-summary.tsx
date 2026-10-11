import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { taskError, useTaskSummary } from './api'
import { TASK_PRIORITIES, type NextTask } from './types'

function NextSummary({ label, task }: { label: string; task: NextTask | null }) {
  return <div className="min-w-0 flex-1 space-y-1">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-medium">{task ? `${task.title} · ${task.due_date} · ${TASK_PRIORITIES[task.priority]}${task.overdue ? ' · Vencida' : ''}` : 'Sin tareas abiertas'}</dd>
  </div>
}

export function NextTaskSummary({ query }: { query: ReturnType<typeof useTaskSummary> }) {
  if (query.isPending) return <div role="status"><span className="sr-only">Cargando próximos pasos…</span><Skeleton className="h-20 w-full motion-reduce:animate-none" /></div>
  if (query.isError) return <div role="alert" className="space-y-2 text-sm"><p>{taskError(query.error)}</p><Button variant="outline" onClick={() => { void query.refetch() }}>Reintentar próximos pasos</Button></div>
  if (!query.data) return <p role="status">Próximos pasos no disponibles.</p>
  return <div className="space-y-2 border-y border-border py-3">
    <dl className="flex flex-col gap-3 sm:flex-row sm:gap-6"><NextSummary label="Próxima tarea" task={query.data.next_task} /><NextSummary label="Próxima revisión" task={query.data.next_review} /></dl>
    <p className="text-xs text-muted-foreground">Fecha del servidor: {query.data.as_of_date} · UTC</p>
  </div>
}

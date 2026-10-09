import { useCallback, useRef, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useLocation } from 'react-router'
import { RecapsList } from '@/features/recaps/components/recaps-list'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { taskError, useAssignees, useTaskIdentity, useTaskList, useTaskSummary } from './api'
import { TaskEditor, type NavigationGuard } from './task-editor'
import { isClosed, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES, TASK_VIEWS,
  type NextTask, type Task, type TaskFilters, type TaskStatus, type TaskView } from './types'

interface PanelProps { clientId: string; onGuard: (guard: NavigationGuard | null) => void }
export function FollowUpPanel(props: PanelProps) {
  const identity = useTaskIdentity()
  return <ClientTasks key={`${identity}:${props.clientId}`} {...props} identity={identity} />
}
function NextSummary({ label, task }: { label: string; task: NextTask | null }) {
  return <div className="min-w-0 flex-1 space-y-1">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-medium">{task ? `${task.title} · ${task.due_date} · ${TASK_PRIORITIES[task.priority]}${task.overdue ? ' · Vencida' : ''}` : 'Sin tareas abiertas'}</dd>
  </div>
}
function ClientTasks({ clientId, identity, onGuard }: PanelProps & { identity: string }) {
  const [filters, setFilters] = useState<TaskFilters>({ page: 1, view: 'active' })
  const [recapPage, setRecapPage] = useState(1)
  const location = useLocation()
  const [editor, setEditor] = useState<{ task: Task | null; key: number } | null>(null)
  const panel = useRef<HTMLElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const newTaskButton = useRef<HTMLButtonElement>(null)
  function restoreFocus() {
    const currentPanel = panel.current
    if (!currentPanel?.isConnected || useAuth.getState().user?.id !== identity) return
    const available = (target: HTMLButtonElement | null): target is HTMLButtonElement => Boolean(
      target?.isConnected && currentPanel.contains(target) && !target.disabled &&
      !target.closest('[hidden], [inert], [aria-hidden="true"]') &&
      (typeof target.checkVisibility !== 'function' || target.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })),
    )
    // A completed/cancelled row may disappear; fall back only within this live client panel.
    const target = available(opener.current) ? opener.current : newTaskButton.current
    if (available(target)) target.focus({ preventScroll: true })
  }
  const list = useTaskList(identity, clientId, filters)
  const summary = useTaskSummary(identity, clientId)
  const assignees = useAssignees(identity, clientId)
  const close = useCallback(() => { setEditor(null) }, [])
  const people = new Map(assignees.data?.pages.flatMap((page) => page.data).map((person) => [person.id, person]) ?? [])
  // Historical display is a filter option, never a new-assignment option.
  for (const task of list.data?.data ?? []) if (task.assignee) people.set(task.assignee.id, task.assignee)
  function filter(updates: Partial<TaskFilters>) { setFilters((current) => ({ ...current, ...updates, page: 1 })) }
  if (!identity) return <p role="alert">Inicia sesión para consultar tareas internas.</p>
  return <section ref={panel} aria-label="Seguimiento del cliente" className="min-w-0 space-y-5">
    <div className="space-y-1"><h2 className="text-lg font-semibold">Seguimiento</h2><p className="text-sm text-muted-foreground">Tareas internas del equipo. El vencimiento se consulta en UTC, independientemente del periodo de métricas.</p></div>
    {summary.isPending ? <Skeleton className="h-20 w-full" /> : summary.isError ? <div role="alert" className="space-y-2 text-sm"><p>{taskError(summary.error)}</p><Button variant="outline" onClick={() => { void summary.refetch() }}>Reintentar próximos pasos</Button></div> : summary.data && <div className="space-y-2 border-y border-border py-3">
      <dl className="flex flex-col gap-3 sm:flex-row sm:gap-6"><NextSummary label="Próxima tarea" task={summary.data.next_task} /><NextSummary label="Próxima revisión" task={summary.data.next_review} /></dl>
      <p className="text-xs text-muted-foreground">Fecha del servidor: {summary.data.as_of_date} · UTC</p>
    </div>}
    <Tabs defaultValue="tasks" className="space-y-4">
      <TabsList aria-label="Organización de seguimiento"><TabsTrigger value="tasks">Tareas</TabsTrigger><TabsTrigger value="recaps">Recaps</TabsTrigger></TabsList>
      <TabsContent value="recaps"><RecapsList clientId={clientId} archived={false} page={recapPage} onPageChange={setRecapPage} returnTo={`${location.pathname}${location.search}`} /></TabsContent>
      <TabsContent value="tasks" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2" aria-label="Vista de tareas">{Object.entries(TASK_VIEWS).map(([value, label]) => <Button key={value} variant={filters.view === value ? 'default' : 'outline'} aria-pressed={filters.view === value} onClick={() => filter({ view: value as TaskView, status: undefined })}>{label}</Button>)}</div>
          <Button ref={newTaskButton} onClick={(event) => { opener.current = event.currentTarget; setEditor({ task: null, key: Date.now() }) }}>Nueva tarea</Button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">Filtrar por estado<select className="mt-1 block min-h-11 rounded-md border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.status ?? ''} onChange={(event) => filter({ status: (event.target.value || undefined) as TaskStatus | undefined })}>
            <option value="">Todos los estados de esta vista</option>
            {Object.entries(TASK_STATUSES).filter(([value]) => (filters.view === 'history') === isClosed(value as TaskStatus)).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select></label>
          <label className="text-sm font-medium">Filtrar por responsable<select className="mt-1 block min-h-11 max-w-full rounded-md border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.assigned_to_id ?? ''} onChange={(event) => filter({ assigned_to_id: event.target.value || undefined })}>
            <option value="">Todo el equipo</option><option value="unassigned">Sin responsable</option>
            {[...people.values()].map((person) => <option value={person.id} key={person.id}>{person.display_name ?? `Profesional ${person.id}`}</option>)}
          </select></label>
          {assignees.hasNextPage && <Button variant="outline" disabled={assignees.isFetchingNextPage} onClick={() => { void assignees.fetchNextPage() }}>Más responsables para filtrar</Button>}
          {assignees.isError && <div role="alert" className="text-sm"><p>{taskError(assignees.error)}</p><Button variant="outline" onClick={() => { void assignees.refetch() }}>Reintentar filtro de responsables</Button></div>}
        </div>
        {list.isPending ? <div aria-label="Cargando tareas" className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : list.isError ? <div role="alert" className="space-y-2 text-sm"><p>{taskError(list.error)}</p><Button variant="outline" onClick={() => { void list.refetch() }}>Reintentar tareas</Button></div> : list.data && <>
          {list.data.data.length === 0 ? <p role="status" className="py-6 text-sm text-muted-foreground">No hay tareas en esta página con estos filtros. Cambia los filtros o crea una tarea interna.</p> : <table className="block w-full text-sm md:table">
            <caption className="sr-only">Tareas del cliente · {TASK_VIEWS[filters.view]}</caption>
            <thead className="sr-only md:not-sr-only md:table-header-group"><tr className="border-b text-left text-muted-foreground"><th className="py-3 pr-4 font-medium">Título / tipo</th><th className="py-3 pr-4 font-medium">Fecha límite</th><th className="py-3 pr-4 font-medium">Responsable</th><th className="py-3 pr-4 font-medium">Prioridad</th><th className="py-3 font-medium">Estado</th></tr></thead>
            <tbody className="block divide-y md:table-row-group">{list.data.data.map((task) => <tr key={task.id} className="flex flex-col gap-2 py-4 md:table-row">
              <td className="min-w-0 md:w-2/5 md:py-4 md:pr-4"><button type="button" className="min-h-11 max-w-full break-words rounded-sm text-left font-medium [overflow-wrap:anywhere] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={(event) => { opener.current = event.currentTarget; setEditor({ task, key: Date.now() }) }}>{task.title}</button><p className="text-xs text-muted-foreground">{TASK_TYPES[task.type]}</p></td>
              <td className="tabular-nums md:pr-4"><span className="md:hidden">Fecha límite: </span>{task.due_date}{!isClosed(task.status) && summary.data && task.due_date < summary.data.as_of_date && <span className="ml-2 font-medium text-status-error">Vencida</span>}</td>
              <td className="break-words md:pr-4"><span className="md:hidden">Responsable: </span>{task.assignee?.display_name ?? (task.assigned_to_id ? 'Profesional sin nombre' : 'Sin responsable')}</td>
              <td className="md:pr-4"><span className="md:hidden">Prioridad: </span>{TASK_PRIORITIES[task.priority]}</td>
              <td><span className="md:hidden">Estado: </span>{TASK_STATUSES[task.status]}</td>
            </tr>)}</tbody>
          </table>}
          <nav aria-label="Paginación de tareas" className="flex flex-wrap items-center gap-3 border-t pt-3">
            <Button variant="outline" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Página anterior</Button>
            <p role="status" className="text-sm tabular-nums">Página {list.data.page} de {Math.max(1, list.data.totalPages)} · {list.data.total} tareas</p>
            <Button variant="outline" disabled={filters.page >= list.data.totalPages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Página siguiente</Button>
          </nav>
        </>}
      </TabsContent>
    </Tabs>
    {editor && <TaskEditor key={editor.key} clientId={clientId} identity={identity} task={editor.task} onClose={close} onGuard={onGuard} onRestoreFocus={restoreFocus}
      onReload={(task) => setEditor((current) => ({ task, key: (current?.key ?? 0) + 1 }))} />}
  </section>
}

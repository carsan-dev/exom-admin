import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorStatus } from '@/lib/api-utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { createTask, getTask, taskError, taskKeys, uncertainResult, updateTask, useAssignees } from './api'
import { civilDate, isClosed, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES, validCivilDate,
  type CreateTask, type Task, type TaskFields, type TaskRecord, type TaskStatus, type UpdateTask } from './types'

export type NavigationGuard = () => boolean
interface EditorProps {
  clientId: string; identity: string; task: Task | null; onClose: () => void
  onGuard: (guard: NavigationGuard | null) => void
  onReload: (task: Task) => void
  onRestoreFocus: () => void
}
const fieldClass = 'mt-1 block min-h-11 w-full rounded-md border border-input bg-background p-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function TaskEditor({ clientId, identity, task, onClose, onGuard, onReload, onRestoreFocus }: EditorProps) {
  const [id] = useState(() => task?.id ?? crypto.randomUUID())
  const [fields, setFields] = useState<TaskFields>(() => ({
    title: task?.title ?? '', type: task?.type ?? 'REVIEW', description: task?.description ?? '',
    due_date: task ? civilDate(task.due_date) : '', priority: task?.priority ?? 'MEDIUM',
    assigned_to_id: task?.assigned_to_id ?? '',
  }))
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'PENDING')
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [frozen, setFrozen] = useState<CreateTask | UpdateTask | null>(null)
  const [conflict, setConflict] = useState(false)
  const [server, setServer] = useState<TaskRecord | null>(null)
  const [reading, setReading] = useState(false)
  const busy = useRef(false)
  const alive = useRef(true)
  const queryClient = useQueryClient()
  const assignees = useAssignees(identity, clientId)
  const eligible = assignees.data?.pages.flatMap((page) => page.data) ?? []
  const closed = task ? isClosed(task.status) : false
  const stillHere = () => alive.current && useAuth.getState().user?.id === identity
  const mutation = useMutation({ retry: false,
    mutationFn: (payload: CreateTask | UpdateTask) => 'id' in payload ? createTask(clientId, payload) : updateTask(clientId, id, payload),
  })

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  useEffect(() => {
    const guard = () => {
      if (busy.current) return false
      return !(dirty || frozen) || window.confirm(frozen
        ? 'El resultado del guardado es incierto. ¿Cerrar el borrador? Comprueba el listado antes de crear otra tarea.'
        : '¿Descartar los cambios de esta tarea sin guardar?')
    }
    onGuard(guard)
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty || frozen || busy.current) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => { onGuard(null); window.removeEventListener('beforeunload', beforeUnload) }
  }, [dirty, frozen, onGuard])

  function change<K extends keyof TaskFields>(key: K, value: TaskFields[K]) {
    setFields((current) => ({ ...current, [key]: value })); setDirty(true)
  }
  async function readServer() {
    if (!stillHere() || reading) return
    setReading(true)
    try {
      const current = await getTask(clientId, id)
      if (stillHere()) setServer(current)
    } catch (failure) { if (stillHere()) setError(taskError(failure)) }
    finally { if (stillHere()) setReading(false) }
  }
  async function save(nextStatus = status) {
    if (busy.current || closed || conflict || !stillHere()) return
    let payload = frozen
    if (!payload) {
      if (!fields.title.trim() || fields.title.trim().length > 160 || (fields.description?.length ?? 0) > 3000 || !validCivilDate(fields.due_date)) {
        setError('Indica un título de 1 a 160 caracteres, una fecha válida y una descripción de hasta 3000 caracteres.'); return
      }
      // Retained assignees need not be revalidated when only editing other fields.
      const reassigned = !task || (fields.assigned_to_id || null) !== task.assigned_to_id
      if (reassigned && !eligible.some((person) => person.id === fields.assigned_to_id)) {
        setError('Selecciona un responsable habilitado para este cliente.'); return
      }
      if (nextStatus === 'CANCELLED' && !window.confirm('¿Cancelar esta tarea? Quedará en el historial y no podrá reabrirse.')) return
      const command = { ...fields, title: fields.title.trim(), description: fields.description?.trim() || null }
      if (!reassigned) delete command.assigned_to_id
      payload = task ? { ...command, expected_version: task.version, status: nextStatus } : { ...command, id }
    }
    busy.current = true; setError('')
    try {
      await mutation.mutateAsync(payload)
      // Invalidate only the operation's original owner/client, never the currently navigated client.
      await queryClient.invalidateQueries({ queryKey: taskKeys.scope(identity, clientId) })
      if (stillHere()) { setDirty(false); setFrozen(null); onClose() }
    } catch (failure) {
      if (stillHere()) {
        setError(taskError(failure))
        if (getApiErrorStatus(failure) === 409) { setConflict(true); void readServer() }
        else if (uncertainResult(failure)) setFrozen(payload)
      }
    } finally { busy.current = false }
  }
  function close() {
    if (busy.current) return
    if ((dirty || frozen) && !window.confirm(frozen
      ? 'El guardado puede haberse realizado. ¿Cerrar y comprobar el listado antes de crear otra tarea?'
      : '¿Descartar los cambios sin guardar?')) return
    onClose()
  }
  function submit(event: FormEvent) { event.preventDefault(); void save() }
  const locked = closed || mutation.isPending || Boolean(frozen)
  const retained = task?.assigned_to_id && !eligible.some((person) => person.id === task.assigned_to_id)
  return <Sheet open onOpenChange={(open) => { if (!open) close() }}>
    <SheetContent onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus() }} className="w-full overflow-y-auto sm:max-w-lg motion-reduce:transition-none motion-reduce:animate-none [--muted-foreground:var(--foreground-secondary)]">
      <SheetHeader className="mb-6 pr-6 text-left">
        <SheetTitle>{task ? 'Detalle de tarea' : 'Nueva tarea'}</SheetTitle>
        <SheetDescription>Tarea interna del equipo. Completarla no cambia pautas ni envía mensajes.</SheetDescription>
      </SheetHeader>
      <form onSubmit={submit} className="space-y-4">
        {task && <p className="text-sm text-muted-foreground">Versión {task.version} · {TASK_STATUSES[task.status]}</p>}
        {closed && <p role="status" className="text-sm">Esta tarea está cerrada. El historial no se puede editar ni reabrir.</p>}
        <fieldset disabled={locked} className="space-y-4 disabled:opacity-70">
          <label className="block text-sm font-medium">Título<input className={fieldClass} value={fields.title} required maxLength={160} onChange={(event) => change('title', event.target.value)} /></label>
          <label className="block text-sm font-medium">Tipo<select className={fieldClass} value={fields.type} onChange={(event) => change('type', event.target.value as TaskFields['type'])}>
            {Object.entries(TASK_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="block text-sm font-medium">Descripción (opcional)<textarea className={fieldClass} rows={3} maxLength={3000} value={fields.description ?? ''} onChange={(event) => change('description', event.target.value)} /></label>
          <label className="block text-sm font-medium">Responsable<select className={fieldClass} value={fields.assigned_to_id ?? ''} onChange={(event) => change('assigned_to_id', event.target.value)}>
            <option value="">Selecciona un responsable</option>
            {retained && <option value={task.assigned_to_id ?? ''} disabled>{task.assignee?.display_name ?? 'Responsable anterior'} · asignación conservada</option>}
            {eligible.map((person) => <option value={person.id} key={person.id}>{person.display_name ?? `Profesional ${person.id}`}</option>)}
          </select></label>
          {retained && <p className="text-sm text-muted-foreground">El responsable anterior se conserva. Para cambiarlo, selecciona uno habilitado; no se elimina automáticamente.</p>}
          <label className="block text-sm font-medium">Fecha límite · UTC<input className={fieldClass} type="date" required value={fields.due_date} onChange={(event) => change('due_date', event.target.value)} /></label>
          <label className="block text-sm font-medium">Prioridad<select className={fieldClass} value={fields.priority} onChange={(event) => change('priority', event.target.value as TaskFields['priority'])}>
            {Object.entries(TASK_PRIORITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          {task && !closed ? <label className="block text-sm font-medium">Estado<select className={fieldClass} value={status} onChange={(event) => { setStatus(event.target.value as TaskStatus); setDirty(true) }}>
            <option value="PENDING">Pendiente</option><option value="IN_PROGRESS">En progreso</option>
          </select></label> : <p className="text-sm">Estado: {TASK_STATUSES[status]}</p>}
        </fieldset>
        {!closed && <div className="space-y-2">
          {assignees.isPending && <p role="status" className="text-sm">Cargando responsables habilitados…</p>}
          {assignees.isError && <div role="alert" className="text-sm"><p>{taskError(assignees.error)}</p><Button type="button" variant="outline" onClick={() => { void assignees.refetch() }}>Reintentar responsables</Button></div>}
          {assignees.hasNextPage && <Button type="button" variant="outline" disabled={assignees.isFetchingNextPage || locked} onClick={() => { void assignees.fetchNextPage() }}>Cargar más responsables</Button>}
        </div>}
        {error && <p role="alert" className="text-sm text-status-error">{error}</p>}
        {frozen && <p className="text-sm">El contenido está bloqueado para reintentar exactamente el mismo identificador y payload.</p>}
        {conflict && <section aria-label="Versión del servidor" className="space-y-3 border-y py-3 text-sm">
          {server ? <><p>Servidor: versión {server.version} · {TASK_STATUSES[server.status]}</p><p>{server.title} · {TASK_TYPES[server.type]} · {civilDate(server.due_date)} · {TASK_PRIORITIES[server.priority]}</p><p className="whitespace-pre-wrap">{server.description || 'Sin descripción'}</p><p>Responsable: {server.assigned_to_id ?? 'Sin responsable'}</p>
            <Button type="button" variant="outline" onClick={() => {
              if (window.confirm('¿Descartar tu borrador y cargar la versión del servidor para revisarla?')) {
                onReload({ ...server, due_date: civilDate(server.due_date), assignee: server.assigned_to_id === task?.assigned_to_id ? task.assignee : eligible.find((person) => person.id === server.assigned_to_id) ?? null })
              }
            }}>Descartar borrador y cargar versión</Button></> : <p>Tu borrador sigue intacto. La versión actual aún no está disponible.</p>}
          <Button type="button" variant="outline" disabled={reading} onClick={() => { void readServer() }}>Consultar versión del servidor</Button>
        </section>}
        {!closed && <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button type="submit" disabled={mutation.isPending || conflict}>{mutation.isPending ? 'Guardando…' : frozen ? 'Reintentar mismo guardado' : task ? 'Guardar cambios' : 'Crear tarea'}</Button>
          {task && !frozen && <><Button type="button" variant="outline" disabled={mutation.isPending || conflict} onClick={() => { void save('COMPLETED') }}>Completar tarea</Button>
            <Button type="button" variant="ghost" disabled={mutation.isPending || conflict} onClick={() => { void save('CANCELLED') }}>Cancelar tarea</Button></>}
        </div>}
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cerrar detalle</Button>
      </form>
    </SheetContent>
  </Sheet>
}

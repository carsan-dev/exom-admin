import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { getApiErrorStatus } from '@/lib/api-utils'
import { useAdherenceConfig, useUpdateAdherenceConfig } from '../api'
import type { AdherencePolicyFields } from '../types'

type Field = keyof AdherencePolicyFields
const fields: { key: Field; label: string; max: number; min: number }[] = [
  { key: 'steps_goal', label: 'Meta de pasos', min: 1, max: Number.MAX_SAFE_INTEGER },
  { key: 'calorie_lower_percent', label: 'Calorías: límite inferior (%)', min: 0, max: 100 },
  { key: 'calorie_upper_percent', label: 'Calorías: límite superior (%)', min: 0, max: 100 },
  { key: 'protein_min_percent', label: 'Proteínas: mínimo (%)', min: 0, max: 200 },
  { key: 'steps_min_percent', label: 'Pasos: mínimo (%)', min: 0, max: 200 },
  { key: 'low_global_percent', label: 'Cumplimiento global bajo (%)', min: 0, max: 100 },
]
type Draft = Record<Field, string>

function utcTomorrow() {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
}

function validFutureDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))
    && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date
    && date > new Date().toISOString().slice(0, 10)
}

function policyDraft(config: AdherencePolicyFields): Draft {
  return {
    steps_goal: config.steps_goal?.toString() ?? '',
    calorie_lower_percent: String(config.calorie_lower_percent),
    calorie_upper_percent: String(config.calorie_upper_percent),
    protein_min_percent: String(config.protein_min_percent),
    steps_min_percent: String(config.steps_min_percent),
    low_global_percent: String(config.low_global_percent),
  }
}

function validDraft(draft: Draft) {
  return fields.every(({ key, min, max }) => {
    const value = draft[key]
    return (key === 'steps_goal' && value === '')
      || (/^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max)
  })
}

/** Only renders a draft for its own admin, client and effective UTC date. */
export function AdherenceConfigEditor({ clientId }: { clientId: string }) {
  const adminId = useAuth((state) => state.isAuthenticated && !state.isLoading ? state.user?.id : undefined)
  const [date, setDate] = useState(utcTomorrow)
  const [dirtyEditor, setDirtyEditor] = useState<string | null>(null)
  const editorKey = `${adminId}:${clientId}:${date}`
  const onDirtyChange = useCallback((dirty: boolean) => {
    setDirtyEditor((current) => dirty ? editorKey : current === editorKey ? null : current)
  }, [editorKey])

  function changeDate(nextDate: string) {
    if (nextDate === date) return
    if (dirtyEditor === editorKey && !window.confirm('¿Descartar los cambios sin guardar y cambiar la fecha?')) return
    setDate(nextDate)
  }

  // Logout unmounts the editor and intentionally drops its in-memory draft; never carry it to another account.
  return (
    <section aria-label="Configuración de adherencia">
      <label className="block text-sm font-medium">
        Fecha de vigencia (UTC)
        <input className="mt-1 block rounded-md border p-2" type="date" min={utcTomorrow()} value={date}
          onChange={(event) => changeDate(event.target.value)} />
      </label>
      {adminId && clientId && validFutureDate(date)
        ? <PolicyEditor key={editorKey} adminId={adminId} clientId={clientId} date={date}
            onDirtyChange={onDirtyChange} />
        : <>
            <p role="alert">{!validFutureDate(date) ? 'Seleccione una fecha futura en UTC.' : 'La sesión no está validada o falta seleccionar un cliente.'}</p>
            <button type="button" disabled>Guardar configuración</button>
          </>}
    </section>
  )
}

function PolicyEditor({ adminId, clientId, date, onDirtyChange }: {
  adminId: string; clientId: string; date: string; onDirtyChange: (dirty: boolean) => void
}) {
  const query = useAdherenceConfig(clientId, date)
  const mutation = useUpdateAdherenceConfig()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [baseline, setBaseline] = useState<Draft | null>(null)
  const [version, setVersion] = useState<number | null>(null)
  const dirty = Boolean(draft && baseline && fields.some(({ key }) => draft[key] !== baseline[key]))
  useUnsavedChanges(`adherence-config:${adminId}:${clientId}:${date}`, dirty)
  useEffect(() => {
    onDirtyChange(dirty)
    return () => onDirtyChange(false)
  }, [dirty, onDirtyChange])
  const [message, setMessage] = useState('')
  const [conflict, setConflict] = useState(false)

  useEffect(() => {
    if (query.data?.known && !draft && !conflict) {
      const loaded = policyDraft(query.data)
      setDraft(loaded)
      setBaseline(loaded)
      setVersion(query.data.version)
    }
  }, [query.data, draft, conflict])

  async function reload() {
    const result = await query.refetch()
    if (result.data?.known && !result.error) {
      const loaded = policyDraft(result.data)
      setDraft(loaded)
      setBaseline(loaded)
      setVersion(result.data.version)
      setConflict(false)
      setMessage('Configuración recargada; revise los cambios antes de guardar.')
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validFutureDate(date)) { setMessage('Seleccione una fecha futura en UTC.'); return }
    const session = useAuth.getState()
    if (!session.isAuthenticated || session.isLoading || session.user?.id !== adminId
      || !draft || version === null || !validDraft(draft) || query.isFetching || conflict || mutation.isPending) return
    setMessage('')
    try {
      const saved = await mutation.mutateAsync({ clientId, config: {
        effective_date: date, expected_version: version,
        steps_goal: draft.steps_goal === '' ? null : Number(draft.steps_goal),
        calorie_lower_percent: Number(draft.calorie_lower_percent),
        calorie_upper_percent: Number(draft.calorie_upper_percent),
        protein_min_percent: Number(draft.protein_min_percent),
        steps_min_percent: Number(draft.steps_min_percent),
        low_global_percent: Number(draft.low_global_percent),
      } })
      setMessage('Configuración guardada')
      if (saved.known) {
        const loaded = policyDraft(saved)
        setDraft(loaded)
        setBaseline(loaded)
        setVersion(saved.version)
      } else {
        setDraft(null)
        setBaseline(null)
        setVersion(null)
      }
    } catch (error) {
      const status = getApiErrorStatus(error)
      if (status === 409) setConflict(true)
      setMessage(status === 409 ? 'Conflicto: la configuración cambió en el servidor. Recargue antes de guardar.'
        : status === 403 || status === 404 ? 'No tiene acceso a esta configuración.' : 'No se ha podido guardar la configuración. Inténtelo de nuevo.')
    }
  }

  const ready = query.data?.known && draft && version !== null && !query.isFetching && !query.isError
  return (
    <form onSubmit={save} noValidate className="mt-4 space-y-4">
      {query.isPending || query.isFetching && !draft ? <p role="status">Cargando configuración...</p> : null}
      {query.isError && <div role="alert">
        <p>{getApiErrorStatus(query.error) === 403 ? 'No tiene permiso para consultar esta configuración.'
          : getApiErrorStatus(query.error) === 404 ? 'No se ha encontrado la configuración del cliente.'
            : 'No se ha podido cargar la configuración.'}</p>
        <button type="button" onClick={() => { void query.refetch() }}>Reintentar</button>
      </div>}
      {query.data && !query.data.known && !query.isError && <p>configuración histórica no capturada</p>}
      {ready && fields.map(({ key, label, min, max }) => (
        <label key={key} className="block text-sm font-medium">
          {label}
          <input className="mt-1 block w-full rounded-md border p-2" type="number" step="1" min={min} max={max}
            value={draft[key]} onChange={(event) => { setDraft({ ...draft, [key]: event.target.value }); if (!conflict) setMessage('') }} />
        </label>
      ))}
      {message && <p role={conflict || message.includes('futura') || message.includes('No ') ? 'alert' : 'status'}>{message}</p>}
      {conflict && <button type="button" onClick={() => { void reload() }} disabled={query.isFetching}>Recargar configuración</button>}
      <button type="submit" disabled={!ready || !validDraft(draft) || conflict || mutation.isPending || !validFutureDate(date)}>
        {mutation.isPending ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </form>
  )
}

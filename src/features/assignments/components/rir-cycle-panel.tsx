import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { unwrapResponse, type ApiEnvelope, getApiErrorMessage } from '@/lib/api-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RirOverrideEditor, RirSequenceEditor } from '../../trainings/components/rir-editor'
import {
  rirOverrideSchema,
  rirSequenceSchema,
  resolveRir,
  type RirConfig,
  type RirOverride,
} from '../../trainings/rir'
import type { Training } from '../../trainings/types'

interface Occurrence {
  id: string
  name: string
  base_rir: number | null
  target_rir: number | null
  rir_override: RirOverride | null
  block_id: string | null
}
interface Group {
  id: string
  name: string
  rir_proposal: number[] | null
  exercises: Occurrence[]
}
export interface RirState {
  revision: number
  versions: {
    revision: number
    effective_from: string
    starts_on: string
    config: RirConfig | null
  }[]
  dates: {
    date: string
    protected: boolean
    week: number | null
    weeks: number | null
    target_rir: number | null
    trainings: Group[]
  }[]
}
const today = () => new Date().toISOString().slice(0, 10)
function nextMonday() {
  const d = new Date(`${today()}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + (8 - (d.getUTCDay() || 7)))
  return d.toISOString().slice(0, 10)
}

export function RirCyclePanel({
  clientId,
  from,
  to,
  trainings,
}: {
  clientId: string
  from: string
  to: string
  trainings: { id: string; name: string }[]
}) {
  const query = useQuery({
    queryKey: ['assignments', 'rir-cycle', clientId, from, to],
    queryFn: async () =>
      unwrapResponse(
        await api.get<ApiEnvelope<RirState>>(`/assignments/clients/${clientId}/rir-cycle`, {
          params: { from, to },
        })
      ),
  })
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Mesociclo de RIR</h2>
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando objetivos…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{getApiErrorMessage(query.error)}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <RirCycleContent
          key={`${clientId}:${query.data.revision}`}
          state={query.data}
          clientId={clientId}
          trainings={trainings}
        />
      )}
    </section>
  )
}

function RirCycleContent({
  state,
  clientId,
  trainings,
}: {
  state: RirState
  clientId: string
  trainings: { id: string; name: string }[]
}) {
  const current = state.versions[0]
  const [editing, setEditing] = useState(false)
  const [sequence, setSequence] = useState(current?.config?.sequence ?? [3, 2, 1, 0])
  const [overrides, setOverrides] = useState<RirConfig['overrides']>(
    current?.config?.overrides ?? {}
  )
  const [effective, setEffective] = useState(nextMonday)
  const [starts, setStarts] = useState(current?.starts_on ?? nextMonday())
  const [cancel, setCancel] = useState(false)
  const [preview, setPreview] = useState(false)
  const [proposalId, setProposalId] = useState('')
  const [loadedGroup, setLoadedGroup] = useState<Group | null>(null)
  const [proposalError, setProposalError] = useState('')
  const [loadingProposal, setLoadingProposal] = useState(false)
  const operation = useRef<{ key: string; id: string } | null>(null)
  const cache = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (body: {
      operation_id: string
      expected_revision: number
      effective_from: string
      starts_on: string
      config: RirConfig | null
    }) => api.put(`/assignments/clients/${clientId}/rir-cycle`, body),
    onSettled: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['assignments', 'rir-cycle', clientId] }),
        cache.invalidateQueries({ queryKey: ['assignments'] }),
      ])
    },
    onSuccess: () => setEditing(false),
  })
  const groups = [
    ...new Map(
      [...state.dates.flatMap((d) => d.trainings), ...(loadedGroup ? [loadedGroup] : [])].map(
        (g) => [g.id, g]
      )
    ).values(),
  ]
  const config = cancel ? null : { sequence, overrides }
  const valid =
    cancel ||
    (rirSequenceSchema.safeParse(sequence).success &&
      Object.values(overrides).every(
        (o) =>
          rirOverrideSchema.safeParse(o).success &&
          (o.mode !== 'SEQUENCE' || o.sequence.length === sequence.length)
      ))
  const change = (action: () => void) => {
    action()
    setPreview(false)
  }
  async function loadProposal() {
    setLoadingProposal(true)
    setProposalError('')
    try {
      const t = unwrapResponse(await api.get<ApiEnvelope<Training>>(`/trainings/${proposalId}`))
      if (!t.rir_proposal) {
        setProposalError('Este entrenamiento no tiene una propuesta guardada.')
        return
      }
      const selected: RirConfig['overrides'] = {}
      for (const e of t.exercises) if (e.rir_override) selected[e.id] = e.rir_override
      change(() => {
        setSequence(t.rir_proposal!)
        setOverrides(selected)
        setCancel(false)
        setLoadedGroup({
          id: t.id,
          name: t.name,
          rir_proposal: t.rir_proposal!,
          exercises: t.exercises.map((e) => ({
            id: e.id,
            name: e.exercise.name,
            base_rir: e.target_rir ?? null,
            target_rir: e.target_rir ?? null,
            rir_override: e.rir_override ?? null,
            block_id: e.block_id ?? null,
          })),
        })
      })
    } catch (e) {
      setProposalError(getApiErrorMessage(e))
    } finally {
      setLoadingProposal(false)
    }
  }
  async function save() {
    const payload = {
      expected_revision: state.revision,
      effective_from: effective,
      starts_on: starts,
      config,
    }
    const key = JSON.stringify(payload)
    if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() }
    await mutation.mutateAsync({ ...payload, operation_id: operation.current.id }).catch(() => {})
  }
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Un ciclo común para todos los entrenamientos de este cliente. El RIR realizado por serie se
        conserva por separado.
      </p>
      {current && (
        <p className="text-sm">
          {current.config
            ? `Última configuración desde ${current.effective_from}: ${current.config.sequence.join(' → ')} → repetir`
            : `Cancelación desde ${current.effective_from}`}
        </p>
      )}
      {!editing && (
        <>
          <Button variant="outline" onClick={() => setEditing(true)}>
            {current ? 'Editar o cancelar mesociclo' : 'Configurar mesociclo'}
          </Button>
          <div className="space-y-2">
            {state.dates
              .filter((d) => d.trainings.length)
              .map((d) => (
                <details key={d.date} className="rounded-lg border p-3">
                  <summary className="cursor-pointer text-sm">
                    {d.date} ·{' '}
                    {d.week
                      ? `Semana ${d.week} de ${d.weeks} · RIR ${d.target_rir}`
                      : 'RIR fijo del entrenamiento'}
                    {d.protected ? ' · Protegido' : ''}
                  </summary>
                  {d.trainings.map((g) => (
                    <div key={g.id} className="mt-2">
                      <h4 className="text-sm font-medium">{g.name}</h4>
                      {g.exercises.map((e, i) => (
                        <p key={e.id} className="text-sm text-muted-foreground">
                          {i + 1}. {e.name}
                          {e.block_id ? ' · Circuito' : ''}:{' '}
                          {e.target_rir === null ? 'Sin objetivo RIR' : `RIR ${e.target_rir}`}
                        </p>
                      ))}
                    </div>
                  ))}
                </details>
              ))}
          </div>
        </>
      )}
      {editing && (
        <fieldset disabled={mutation.isPending || loadingProposal} className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              Aplicar desde
              <Input
                aria-label="Aplicar desde"
                type="date"
                min={today()}
                value={effective}
                onChange={(e) => change(() => setEffective(e.target.value))}
              />
            </label>
            <label className="text-sm">
              Semana de inicio
              <Input
                aria-label="Semana de inicio"
                type="date"
                value={starts}
                onChange={(e) => change(() => setStarts(e.target.value))}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Cambiar la fecha de aplicación conserva la semana de inicio. Hoy solo está permitido sin
            progreso. Se conserva el pasado y cualquier día iniciado. Un nuevo cambio sustituye las
            configuraciones programadas desde su fecha de aplicación.
          </p>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={cancel}
              onChange={(e) => change(() => setCancel(e.target.checked))}
            />
            Cancelar solo el ciclo de RIR y volver al RIR fijo de cada ejercicio
          </label>
          {!cancel && (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  Cargar propuesta de un entrenamiento
                  <select
                    aria-label="Propuesta de entrenamiento"
                    className="ml-2 rounded-md border bg-background p-2"
                    value={proposalId}
                    onChange={(e) => setProposalId(e.target.value)}
                  >
                    <option value="">Seleccionar entrenamiento</option>
                    {trainings.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!proposalId}
                  onClick={loadProposal}
                >
                  Cargar propuesta
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cargar sustituye la secuencia y excepciones de este borrador por una sola propuesta.
                Revisa los cambios antes de guardar.
              </p>
              {proposalError && <p role="alert">{proposalError}</p>}
              <RirSequenceEditor value={sequence} onChange={(s) => change(() => setSequence(s))} />
              {groups.map((g) => (
                <details key={g.id} open>
                  <summary className="font-medium">{g.name}</summary>
                  {g.exercises.map((e, i) => (
                    <RirOverrideEditor
                      key={e.id}
                      label={`${i + 1}. ${e.name}${e.block_id ? ' · Circuito' : ''}`}
                      sequence={sequence}
                      value={overrides[e.id]}
                      onChange={(v) => change(() => setOverrides({ ...overrides, [e.id]: v }))}
                    />
                  ))}
                </details>
              ))}
            </>
          )}
          {!valid && (
            <p role="alert" className="text-sm text-destructive">
              Usa RIR enteros de 0 a 10 y la misma duración en todas las secuencias.
            </p>
          )}
          {preview && (
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <h3 className="font-medium">Vista previa del periodo visible</h3>
              <p className="text-sm">
                El cambio se repetirá también en las fechas futuras que se asignen. Las asignaciones
                se conservan.
              </p>
              {state.dates.map((d) => (
                <details key={d.date}>
                  <summary className="text-sm">
                    {d.date} ·{' '}
                    {d.protected
                      ? 'Protegida, sin cambios'
                      : d.date < effective
                        ? 'Anterior a la aplicación, sin cambios'
                        : 'Se aplicará el cambio'}
                  </summary>
                  {d.trainings.map((g) => (
                    <div key={g.id}>
                      <p className="text-sm font-medium">{g.name}</p>
                      {g.exercises.map((e) => {
                        const target =
                          d.protected || d.date < effective
                            ? e.target_rir
                            : resolveRir(config, starts, d.date, e.id, e.base_rir)
                        return (
                          <p key={e.id} className="text-sm">
                            {e.name}: {e.target_rir ?? 'Sin RIR'} → {target ?? 'Sin RIR'}
                          </p>
                        )
                      })}
                    </div>
                  ))}
                </details>
              ))}
            </div>
          )}
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(mutation.error)}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Cerrar
            </Button>
            <Button
              type="button"
              disabled={!valid || !effective || !starts || effective < today()}
              onClick={() => (preview ? void save() : setPreview(true))}
            >
              {mutation.isPending
                ? 'Guardando…'
                : preview
                  ? 'Confirmar cambio de RIR'
                  : 'Revisar fechas y objetivos'}
            </Button>
          </div>
        </fieldset>
      )}
    </>
  )
}

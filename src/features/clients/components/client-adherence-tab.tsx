import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getApiErrorStatus } from '@/lib/api-utils'
import {
  isAdherenceRange, isCivilDate, useAdherenceIdentity, useClientAdherence,
  useClientAdherenceConfig, useUpdateClientAdherenceConfig,
} from '../adherence.api'
import type {
  AdherenceConfig, AdherenceDay, AdherenceRange, AdherenceReport, ClosedAggregate,
  ComponentAdherence, ConfigValues, GlobalAdherence, IndicatorStatus,
} from '../adherence.types'

const civil = (at: Date) => at.toISOString().slice(0, 10)
const shift = (date: string, days: number) => civil(new Date(Date.parse(date + 'T00:00:00Z') + days * 86_400_000))
function minimumEffectiveDate() {
  // Same conservative 31-second midnight horizon as the service. Scheduled
  // revisions can require a later date; only the server can validate that.
  return shift(civil(new Date(Date.now() + 31_000)), 1)
}
function weekRange(date: string): AdherenceRange {
  const at = new Date(date + 'T00:00:00Z')
  const start = shift(date, -((at.getUTCDay() + 6) % 7))
  return { start, end: shift(start, 6) }
}
function monthRange(date: string): AdherenceRange {
  const at = new Date(date + 'T00:00:00Z')
  return { start: civil(new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1))),
    end: civil(new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0))) }
}
const indicatorLabels: Record<IndicatorStatus, string> = {
  met: 'Dentro del objetivo', below: 'Por debajo del objetivo', above: 'Por encima del objetivo',
  insufficient: 'Información insuficiente', not_applicable: 'No aplicable',
}
const sourceLabels = {
  both: 'Entrenamiento y nutrición', training_only: 'Solo entrenamiento', nutrition_only: 'Solo nutrición', none: 'Sin componente evaluable',
}
const calendarLabels = {
  complete: 'Cumplimiento completo', partial: 'Cumplimiento parcial', incomplete: 'Sin cumplimiento registrado',
  insufficient: 'Información insuficiente', rest: 'Descanso', future: 'Futuro', not_assigned: 'Sin asignación',
}
const scheduleLabels = { rest: 'Descanso', assigned: 'Pautado', not_assigned: 'Sin asignación', unknown: 'Pauta desconocida' }
function Metric({ label, value }: { label: string; value: ComponentAdherence }) {
  const text = value.status === 'evaluable' && value.ratio !== null
    ? `${new Intl.NumberFormat('es', { maximumFractionDigits: 2 }).format(value.ratio * 100)} %`
    : value.status === 'insufficient' ? 'Información insuficiente'
      : value.status === 'neutral' ? 'Neutral' : 'No aplicable'
  return <div className="space-y-1"><p className="text-sm font-medium">{label}</p><p>{text}</p>
    {value.status === 'evaluable' && <p className="text-xs text-muted-foreground">{value.numerator} / {value.denominator} evaluables</p>}
    {value.caveats.length > 0 && <p className="text-xs text-muted-foreground">Hay información indeterminada excluida del cálculo.</p>}
  </div>
}
function Aggregate({ value }: { value: ClosedAggregate }) {
  return <><div className="grid gap-3 sm:grid-cols-3">
    <Metric label="Entrenamiento" value={value.training} /><Metric label="Nutrición" value={value.nutrition} />
    <Metric label="Global" value={value.global} />
  </div><p className="text-sm text-muted-foreground">{sourceLabels[value.global.source]}</p></>
}
function isLow(value: GlobalAdherence, day: AdherenceDay) {
  return value.status === 'evaluable' && value.ratio !== null && day.configuration.known &&
    day.configuration.low_global_percent !== null && value.ratio * 100 < day.configuration.low_global_percent
}
function DayDetail({ day }: { day: AdherenceDay }) {
  const closed = day.evaluation.period === 'closed'
  const tone = !closed ? 'border-border' : day.calendar === 'complete' ? 'border-status-success/50'
    : day.calendar === 'partial' ? 'border-status-warning/50'
      : day.calendar === 'incomplete' ? 'border-status-error/50' : 'border-border'
  return <article aria-label={`Día ${day.date}`} className={`rounded-xl border p-4 space-y-3 ${tone}`}>
    <h3 className="font-semibold">{day.date} · <span>{calendarLabels[day.calendar]}</span></h3>
    <p className="text-sm">{day.evaluation.period === 'provisional' ? 'Provisional · no incluido en el periodo cerrado'
      : day.evaluation.period === 'future' ? 'Fecha futura · no penaliza el periodo cerrado' : 'Día cerrado'}</p>
    <p className="text-xs text-muted-foreground">{day.basis === 'original' ? 'Pauta original al cierre UTC conservada'
      : day.basis === 'current_provisional' ? 'Pauta actual provisional' : 'Pauta original desconocida'}
      {day.revision !== null && ` · Revisión ${day.revision}`}</p>
    <p className="text-sm">Entrenamiento: {scheduleLabels[day.schedule.training]} · Nutrición: {scheduleLabels[day.schedule.nutrition]}</p>
    <Aggregate value={day.evaluation} />
    {isLow(day.evaluation.global, day) && <p className="text-sm font-medium">Baja adherencia · menos del {day.configuration.low_global_percent} % (umbral de este día)</p>}
    <p className="text-xs text-muted-foreground">Configuración {day.configuration.known ? `versión ${day.configuration.version ?? 'sin versión'}` : 'desconocida'}
      {day.configuration.known && day.configuration.low_global_percent !== null && ` · umbral global ${day.configuration.low_global_percent} %`}</p>
    <div className="text-sm space-y-1">
      <p>Calorías: {day.intake.estimated_calories ?? 'Sin dato'} kcal estimadas / {day.targets.calories ?? 'Sin objetivo'} kcal pautadas · {indicatorLabels[day.indicators.calories.status]}</p>
      <p>Proteína: {day.intake.estimated_protein_g ?? 'Sin dato'} g estimados / {day.targets.protein_g ?? 'Sin objetivo'} g pautados · {indicatorLabels[day.indicators.protein.status]}</p>
    </div>
  </article>
}
function Report({ report }: { report: AdherenceReport }) {
  return <div className="space-y-5">
    <section aria-label="Periodo cerrado" className="rounded-xl border p-4 space-y-3">
      <h2 className="font-semibold">Periodo cerrado · {report.start} — {report.end}</h2>
      <Aggregate value={report.aggregate} />
      <p className="text-xs text-muted-foreground">Resultado del servidor: hoy provisional y futuro quedan fuera. Los umbrales históricos pueden variar; no se aplica un único umbral actual al periodo.</p>
    </section>
    <p className="text-xs text-muted-foreground">Evaluado: {report.evaluated_at} · Hoy UTC: {report.today}. Las evidencias tardías aceptadas pueden añadir revisiones sin modificar la pauta original. La configuración no reconstruye el histórico desconocido.</p>
    <div className="space-y-4">{report.weeks.map((week) => <section key={week.start} aria-label={`Pasos semanales ${week.start}`} className="rounded-xl border p-4 space-y-3">
      <h2 className="font-semibold">Semana UTC {week.start} — {shift(week.start, 6)}</h2>
      <p>Media de pasos del recap</p><p>{week.average_daily_steps ?? 'Sin recap suficiente'}</p>
      <p>{indicatorLabels[week.weeklySteps.status]} · Umbral semanal del servidor: {week.weeklySteps.threshold ?? 'Desconocido'}</p>
      <p className="text-xs text-muted-foreground">Semana completa, incluidos objetivos fuera del periodo seleccionado. Los pasos no modifican el porcentaje global.</p>
      <ul className="grid gap-2 text-sm sm:grid-cols-2">{week.dailyTargets.map((target) => <li key={target.date}>
        {target.date}: {target.goal ?? 'Sin objetivo'} pasos · mínimo {target.steps_min_percent ?? 'desconocido'} % · {indicatorLabels[target.status]}
        <span className="block text-xs text-muted-foreground">Versión {target.version ?? 'desconocida'} · vigencia {target.effective_date ?? 'desconocida'}</span>
      </li>)}</ul>
      <h3 className="text-sm font-semibold">Agregado cerrado de esta semana dentro del periodo seleccionado</h3><Aggregate value={week.aggregate} />
    </section>)}</div>
    <section aria-label="Calendario de adherencia" className="grid gap-3 lg:grid-cols-2">{report.days.map((day) => <DayDetail key={day.date} day={day} />)}</section>
    <p className="text-xs text-muted-foreground">Nutrición: día cumplido solo con todos los grupos pautados; las alternativas no se suman como grupos extra. Calorías y proteína son estimaciones independientes frente a objetivos de la pauta del día.</p>
  </div>
}

const fields = [
  { key: 'steps_goal', label: 'Objetivo de pasos', min: 1, max: undefined, help: 'Entero positivo; vacío desactiva la comparación de pasos.' },
  { key: 'calorie_lower_percent', label: 'Margen inferior de calorías (%)', min: 0, max: 100, help: '0–100 %, respecto a la dieta pautada.' },
  { key: 'calorie_upper_percent', label: 'Margen superior de calorías (%)', min: 0, max: 100, help: '0–100 %, respecto a la dieta pautada.' },
  { key: 'protein_min_percent', label: 'Proteína mínima (%)', min: 0, max: 200, help: '0–200 % del objetivo de proteína pautado.' },
  { key: 'steps_min_percent', label: 'Pasos mínimos (%)', min: 0, max: 200, help: '0–200 % del objetivo; comparación semanal.' },
  { key: 'low_global_percent', label: 'Baja adherencia global (%)', min: 0, max: 100, help: '0–100 %; por debajo de este umbral.' },
] as const satisfies ReadonlyArray<{ key: keyof ConfigValues; label: string; min: number; max: number | undefined; help: string }>
type Draft = Record<keyof ConfigValues, string>
function initialDraft(config: AdherenceConfig): Draft {
  return Object.fromEntries(fields.map(({ key }) => [key, config.known && config[key] !== null ? String(config[key]) : ''])) as Draft
}
function valuesFromDraft(draft: Draft): ConfigValues | null {
  const result: ConfigValues = { steps_goal: null, calorie_lower_percent: 0, calorie_upper_percent: 0, protein_min_percent: 0, steps_min_percent: 0, low_global_percent: 0 }
  for (const field of fields) {
    if (field.key === 'steps_goal' && draft[field.key] === '') continue
    const value = Number(draft[field.key])
    if (draft[field.key].trim() === '' || !Number.isSafeInteger(value) || value < field.min || (field.max !== undefined && value > field.max)) return null
    result[field.key] = value
  }
  return result
}
interface ConfigFormProps {
  clientId: string
  config: AdherenceConfig
  effectiveDate: string
  changeDate: (date: string) => void
  loadDate: () => void
  reloadVersion: () => Promise<AdherenceConfig | undefined>
}
function ConfigForm({ clientId, config, effectiveDate, changeDate, loadDate, reloadVersion }: ConfigFormProps) {
  const [draft, setDraft] = useState(() => initialDraft(config))
  const [version, setVersion] = useState(config.version)
  const [message, setMessage] = useState('')
  const [conflict, setConflict] = useState(false)
  const [reloading, setReloading] = useState(false)
  const mutation = useUpdateClientAdherenceConfig(clientId)
  const values = valuesFromDraft(draft)
  const validDate = isCivilDate(effectiveDate) && effectiveDate >= minimumEffectiveDate()
  const validVersion = Number.isSafeInteger(version) && version >= 0
  const pending = mutation.isPending || reloading
  async function save() {
    if (!values || !validDate || !validVersion || pending || conflict) return
    setMessage('')
    try {
      const saved = await mutation.mutateAsync({ ...values, effective_date: effectiveDate, expected_version: version })
      setVersion(saved.version)
      setMessage(`Guardada · vigente desde ${saved.effective_date ?? effectiveDate}. No modifica días anteriores.`)
    } catch (error) {
      const stale = getApiErrorStatus(error) === 409
      setConflict(stale)
      setMessage(stale ? 'Conflicto: cambió la versión, la fecha ya no es válida o hay revisiones programadas posteriores. Recarga la versión y revisa la vigencia; reintenta manualmente.' : 'No se pudo guardar la configuración. El borrador se conserva.')
    }
  }
  async function reload() {
    setReloading(true)
    try {
      const latest = await reloadVersion()
      if (!latest || !Number.isSafeInteger(latest.version) || latest.version < 0) throw new Error('Missing version')
      setVersion(latest.version); setConflict(false)
      setMessage('Versión actualizada. Borrador conservado; revisa la fecha y guarda solo cuando lo decidas.')
    } catch {
      setMessage('No se pudo recargar la versión. Borrador conservado.')
    } finally { setReloading(false) }
  }
  return <div className="space-y-4">
    <p className="text-sm">{config.known ? config.source === 'default' ? 'Valores predeterminados para esta fecha; no acreditan el histórico.' : `Configuración con vigencia desde ${config.effective_date}` : 'Configuración desconocida: completa los campos para una nueva vigencia futura; no se inventan valores históricos.'}</p>
    <p className="text-sm">Versión de escritura: {validVersion ? version : 'desconocida'}</p>
    <fieldset disabled={pending} className="space-y-4">
      <label className="block text-sm space-y-1">Vigencia desde (UTC)<Input type="date" min={minimumEffectiveDate()} value={effectiveDate} onChange={(event) => changeDate(event.target.value)} /></label>
      <p className="text-xs text-muted-foreground">Solo fechas futuras UTC; debe seguir a todas las revisiones programadas. El servidor valida la vigencia final. Cargar otra fecha sustituye este borrador.</p>
      <Button type="button" variant="outline" disabled={!isCivilDate(effectiveDate)} onClick={loadDate}>Cargar configuración de la fecha</Button>
      <div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <label key={field.key} className="block text-sm space-y-1">{field.label}
        <Input aria-label={field.label} type="number" step="1" min={field.min} max={field.max} value={draft[field.key]} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} />
        <span className="block text-xs text-muted-foreground">{field.help}</span>
      </label>)}</div>
    </fieldset>
    {!validDate && <p role="alert">La vigencia debe ser una fecha futura UTC válida.</p>}
    {message && <p role={mutation.isError || conflict ? 'alert' : 'status'} className="text-sm">{message}</p>}
    {conflict && <Button variant="outline" disabled={pending} onClick={reload}>Recargar versión conservando borrador</Button>}
    <Button disabled={pending || !values || !validDate || !validVersion || conflict} onClick={save}>{mutation.isPending ? 'Guardando…' : 'Guardar configuración futura'}</Button>
  </div>
}
function Settings({ clientId }: { clientId: string }) {
  const [effectiveDate, setEffectiveDate] = useState(minimumEffectiveDate)
  const [selectedDate, setSelectedDate] = useState(effectiveDate)
  const [load, setLoad] = useState(0)
  const query = useClientAdherenceConfig(clientId, selectedDate)
  return <Card><CardContent className="pt-6 space-y-4">
    <h2 className="font-semibold">Configuración de adherencia</h2>
    {query.data ? <ConfigForm key={`${selectedDate}:${load}`} clientId={clientId} config={query.data} effectiveDate={effectiveDate}
      changeDate={setEffectiveDate} loadDate={() => { if (isCivilDate(effectiveDate)) { setSelectedDate(effectiveDate); setLoad(load + 1) } }}
      reloadVersion={async () => { const result = await query.refetch(); if (result.isError) throw result.error; return result.data }} />
      : query.isPending ? <p>Cargando configuración…</p>
        : <div><p role="alert">No se pudo cargar la configuración.</p><Button variant="outline" onClick={() => query.refetch()}>Reintentar configuración</Button></div>}
  </CardContent></Card>
}
interface RangeControlsProps {
  range: AdherenceRange
  applyRange: (range: AdherenceRange) => void
  fetching: boolean
  refresh: () => void
}
function RangeControls({ range, applyRange, fetching, refresh }: RangeControlsProps) {
  const [draft, setDraft] = useState(range)
  const [rangeError, setRangeError] = useState(!isAdherenceRange(range))
  function apply(next = draft) {
    if (!isAdherenceRange(next)) { setRangeError(true); return }
    setRangeError(false); setDraft(next); applyRange(next)
  }
  function preset(month: boolean) {
    const anchor = isCivilDate(draft.start) ? draft.start : civil(new Date())
    apply(month ? monthRange(anchor) : weekRange(anchor))
  }
  return <>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Desde (UTC)<Input type="date" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} /></label>
      <label className="text-sm">Hasta (UTC)<Input type="date" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} /></label>
    </div>
    <div className="flex flex-wrap gap-2"><Button onClick={() => apply()}>Consultar periodo</Button>
      <Button variant="outline" onClick={() => preset(false)}>Semana de la fecha inicial</Button>
      <Button variant="outline" onClick={() => preset(true)}>Mes de la fecha inicial</Button>
      <Button variant="outline" disabled={fetching || !isAdherenceRange(range)} onClick={refresh}>Actualizar evaluaciones</Button>
    </div>
    {rangeError && <p role="alert">Selecciona fechas UTC válidas y ordenadas, de 1 a 31 días inclusive.</p>}
  </>
}
function AdherenceContent({ clientId }: { clientId: string }) {
  const [params, setParams] = useSearchParams()
  const hasRange = params.has('adherence_start') || params.has('adherence_end')
  const range = hasRange ? { start: params.get('adherence_start') ?? '', end: params.get('adherence_end') ?? '' } : monthRange(civil(new Date()))
  const query = useClientAdherence(clientId, range)
  function applyRange(next: AdherenceRange) {
    setParams((previous) => {
      const updated = new URLSearchParams(previous)
      updated.set('adherence_start', next.start); updated.set('adherence_end', next.end)
      return updated
    })
  }
  return <div className="space-y-5">
    <Card><CardContent className="pt-6 space-y-4">
      <h2 className="text-lg font-semibold">Adherencia</h2>
      <RangeControls key={`${range.start}:${range.end}`} range={range} applyRange={applyRange} fetching={query.isFetching} refresh={() => query.refetch()} />
      {isAdherenceRange(range) && (query.isPending ? <p role="status">Cargando adherencia…</p> : query.isError ? <p role="alert">No se pudo cargar la adherencia. Reintenta la consulta; este error no significa información histórica insuficiente.</p>
        : query.data && <Report report={query.data} />)}
      {query.isFetching && !query.isPending && <p role="status">Actualizando evaluaciones…</p>}
    </CardContent></Card>
    <Settings clientId={clientId} />
  </div>
}
export function ClientAdherenceTab({ clientId }: { clientId: string }) {
  const identity = useAdherenceIdentity()
  if (!identity.allowed) return <p>Sesión de administrador requerida</p>
  return <AdherenceContent key={`${clientId}:${identity.owner}:${identity.role}:${identity.session}`} clientId={clientId} />
}

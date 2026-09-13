import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  parseTimeInput,
  timeInputValue,
  timedInstructions,
  type TimeUnit,
  type TimedConfig,
} from '../timed-prescription'

function DurationInput({
  seconds,
  unit,
  label,
  onChange,
}: {
  seconds: number
  unit: TimeUnit
  label: string
  onChange: (seconds: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Input
      className="w-28 min-w-0"
      aria-label={label}
      inputMode="decimal"
      value={draft ?? timeInputValue(seconds, unit)}
      onBlur={() => {
        if (Number.isFinite(seconds)) setDraft(null)
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        onChange(parseTimeInput(e.target.value, unit))
      }}
    />
  )
}

function UnitSelect({
  value,
  label,
  onChange,
}: {
  value: TimeUnit
  label: string
  onChange: (v: TimeUnit) => void
}) {
  return (
    <select
      aria-label={label}
      className="h-9 rounded-md border border-input bg-input px-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value === 'MINUTES' ? 'MINUTES' : 'SECONDS')}
    >
      <option value="SECONDS">Segundos</option>
      <option value="MINUTES">Minutos</option>
    </select>
  )
}

export function TimedPrescriptionEditor({
  total,
  minimum,
  maximum,
  config: supplied,
  onChange,
}: {
  total?: number | null
  minimum?: number | null
  maximum?: number | null
  config?: TimedConfig | null
  onChange: (value: {
    target_value: number | null
    target_value_min: number | null
    target_value_max: number | null
    timed_config: TimedConfig
  }) => void
}) {
  const config = supplied ?? { version: 1, unit: 'SECONDS', segments: [] }
  const update = (next: TimedConfig) =>
    onChange({
      target_value: total ?? null,
      target_value_min: minimum ?? null,
      target_value_max: maximum ?? null,
      timed_config: next,
    })
  const setTotal = (value: number) =>
    onChange({
      target_value: value,
      target_value_min: null,
      target_value_max: null,
      timed_config: config,
    })
  return (
    <div className="col-span-full space-y-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">Duración {minimum != null ? 'mínima / máxima' : 'total'}</span>
        {minimum != null && maximum != null ? (
          <>
            <DurationInput
              key={`min-${config.unit}`}
              seconds={minimum}
              unit={config.unit}
              label="Duración mínima"
              onChange={(n) =>
                onChange({
                  target_value: null,
                  target_value_min: n,
                  target_value_max: maximum,
                  timed_config: config,
                })
              }
            />
            <DurationInput
              key={`max-${config.unit}`}
              seconds={maximum}
              unit={config.unit}
              label="Duración máxima"
              onChange={(n) =>
                onChange({
                  target_value: null,
                  target_value_min: minimum,
                  target_value_max: n,
                  timed_config: config,
                })
              }
            />
            <Button type="button" variant="outline" onClick={() => setTotal(minimum)}>
              Usar total exacto
            </Button>
          </>
        ) : (
          <DurationInput
            key={config.unit}
            seconds={total ?? NaN}
            unit={config.unit}
            label="Duración total"
            onChange={setTotal}
          />
        )}
        <UnitSelect
          value={config.unit}
          label="Unidad del total"
          onChange={(unit) => update({ ...config, unit })}
        />
        {minimum == null && config.segments.length === 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                target_value: null,
                target_value_min: total ?? 60,
                target_value_max: total ?? 60,
                timed_config: config,
              })
            }
          >
            Usar rango
          </Button>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.segments.length > 0}
          onChange={(e) => {
            const next = {
              ...config,
              segments: e.target.checked
                ? [{ action: '', seconds: 60, unit: 'MINUTES' as const }]
                : [],
            }
            onChange({
              target_value: total ?? minimum ?? 60,
              target_value_min: null,
              target_value_max: null,
              timed_config: next,
            })
          }}
        />
        Alternar acciones dentro del ejercicio
      </label>
      {config.segments.map((s, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-32 flex-1"
            aria-label={`Acción ${i + 1}`}
            value={s.action}
            placeholder="Ej. Corre"
            maxLength={80}
            onChange={(e) =>
              update({
                ...config,
                segments: config.segments.map((v, j) =>
                  j === i ? { ...v, action: e.target.value } : v
                ),
              })
            }
          />
          <DurationInput
            key={`${i}-${s.unit}`}
            seconds={s.seconds}
            unit={s.unit}
            label={`Duración tramo ${i + 1}`}
            onChange={(seconds) =>
              update({
                ...config,
                segments: config.segments.map((v, j) => (j === i ? { ...v, seconds } : v)),
              })
            }
          />
          <UnitSelect
            value={s.unit}
            label={`Unidad tramo ${i + 1}`}
            onChange={(unit) =>
              update({
                ...config,
                segments: config.segments.map((v, j) => (j === i ? { ...v, unit } : v)),
              })
            }
          />
          <Button
            type="button"
            variant="outline"
            disabled={i === 0}
            onClick={() => {
              const segments = [...config.segments]
              ;[segments[i - 1], segments[i]] = [segments[i], segments[i - 1]]
              update({ ...config, segments })
            }}
          >
            Subir
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              update({ ...config, segments: config.segments.filter((_, j) => j !== i) })
            }
          >
            Quitar tramo
          </Button>
        </div>
      ))}
      {config.segments.length > 0 && (
        <Button
          type="button"
          variant="outline"
          disabled={config.segments.length >= 20}
          onClick={() =>
            update({
              ...config,
              segments: [...config.segments, { action: '', seconds: 60, unit: 'MINUTES' }],
            })
          }
        >
          Añadir tramo
        </Button>
      )}
      <p className="text-sm" aria-live="polite">
        {minimum != null
          ? 'Rango de duración; los intervalos requieren un total exacto.'
          : timedInstructions(total ?? NaN, config)}
      </p>
      <p className="text-xs text-muted-foreground">
        Todos los tramos cuentan dentro del total. El descanso entre series se configura aparte. Los
        decimales de minutos deben equivaler a segundos enteros.
      </p>
    </div>
  )
}

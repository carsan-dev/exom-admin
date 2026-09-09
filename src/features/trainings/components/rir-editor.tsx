import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RirOverride } from '../rir'

export function RirSequenceEditor({
  value,
  onChange,
  label = 'Secuencia común',
}: {
  value: number[]
  onChange: (v: number[]) => void
  label?: string
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap items-end gap-3">
        {value.map((rir, i) => (
          <label key={i} className="space-y-1 text-xs">
            Semana {i + 1}
            <Input
              aria-label={`${label} · Semana ${i + 1}`}
              type="number"
              min={0}
              max={10}
              step={1}
              value={Number.isNaN(rir) ? '' : rir}
              className="w-20"
              onChange={(e) =>
                onChange(value.map((v, n) => (n === i ? e.target.valueAsNumber : v)))
              }
            />
          </label>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, value[value.length - 1] ?? 3])}
        >
          Añadir semana
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={value.length <= 1}
          onClick={() => onChange(value.slice(0, -1))}
        >
          Quitar última
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        RIR entero de 0 a 10. Semanas de lunes a domingo; la secuencia se repite aunque no haya
        entrenamientos.
      </p>
    </fieldset>
  )
}

export function RirOverrideEditor({
  value,
  onChange,
  sequence,
  label,
}: {
  value?: RirOverride | null
  onChange: (v: RirOverride) => void
  sequence: number[]
  label: string
}) {
  const mode = value?.mode ?? 'INHERIT'
  return (
    <div className="space-y-2 border-b border-border py-3">
      <label className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <select
          aria-label={`Objetivo de ${label}`}
          className="rounded-md border border-input bg-background px-3 py-2"
          value={mode}
          onChange={(e) => {
            const next = e.target.value
            onChange(
              next === 'FIXED'
                ? { mode: 'FIXED', value: 3 }
                : next === 'SEQUENCE'
                  ? { mode: 'SEQUENCE', sequence: [...sequence] }
                  : { mode: next === 'NONE' ? 'NONE' : 'INHERIT' }
            )
          }}
        >
          <option value="INHERIT">Heredar secuencia común</option>
          <option value="SEQUENCE">Secuencia propia</option>
          <option value="FIXED">RIR fijo</option>
          <option value="NONE">Sin objetivo RIR</option>
        </select>
      </label>
      {value?.mode === 'FIXED' && (
        <Input
          aria-label={`RIR fijo de ${label}`}
          type="number"
          min={0}
          max={10}
          step={1}
          value={Number.isNaN(value.value) ? '' : value.value}
          className="w-24"
          onChange={(e) => onChange({ mode: 'FIXED', value: e.target.valueAsNumber })}
        />
      )}
      {value?.mode === 'SEQUENCE' && (
        <>
          <RirSequenceEditor
            value={value.sequence}
            onChange={(s) => onChange({ mode: 'SEQUENCE', sequence: s })}
            label={`Secuencia de ${label}`}
          />
          {value.sequence.length !== sequence.length && (
            <p role="alert" className="text-sm text-destructive">
              Debe tener {sequence.length} semanas, igual que la secuencia común.
            </p>
          )}
        </>
      )}
    </div>
  )
}

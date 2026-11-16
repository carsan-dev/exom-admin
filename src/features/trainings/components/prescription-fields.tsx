import { Input } from '@/components/ui/input'

interface PrescriptionFieldsProps {
  measureType: 'REPS' | 'SECONDS'
  targetValue?: number | null
  targetValueMin?: number | null
  targetValueMax?: number | null
  targetRir?: number | null
  legacyValue: string
  onMeasureTypeChange: (value: 'REPS' | 'SECONDS') => void
  onTargetInputChange: (value: string) => void
  onTargetRirChange: (value: number | null) => void
}

export function PrescriptionFields({
  measureType,
  targetValue,
  targetValueMin,
  targetValueMax,
  targetRir,
  legacyValue,
  onMeasureTypeChange,
  onTargetInputChange,
  onTargetRirChange,
}: PrescriptionFieldsProps) {
  const targetInput =
    targetValue != null
      ? String(targetValue)
      : targetValueMin != null && targetValueMax != null
        ? `${targetValueMin}-${targetValueMax}`
        : legacyValue

  return (
    <>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Tipo de objetivo</label>
        <select
          value={measureType}
          onChange={(event) => onMeasureTypeChange(event.target.value as 'REPS' | 'SECONDS')}
          className="flex h-8 w-full rounded-md border border-input bg-input px-3 text-sm text-foreground max-md:h-11"
        >
          <option value="REPS">Repeticiones</option>
          <option value="SECONDS">Tiempo</option>
        </select>
      </div>
      <div className={measureType === 'SECONDS' ? 'hidden' : 'space-y-1'}>
        <label className="text-xs text-muted-foreground">
          {measureType === 'SECONDS' ? 'Segundos objetivo' : 'Repeticiones objetivo'}
        </label>
        <Input
          type="text"
          value={targetInput}
          placeholder="Ej. 8 o 8-10"
          onChange={(event) => onTargetInputChange(event.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">RIR objetivo (opcional)</label>
        <Input
          type="number"
          min={0}
          max={10}
          step={1}
          value={targetRir ?? ''}
          onChange={(event) =>
            onTargetRirChange(event.target.value === '' ? null : Number(event.target.value))
          }
          className="h-8 text-sm"
        />
      </div>
    </>
  )
}

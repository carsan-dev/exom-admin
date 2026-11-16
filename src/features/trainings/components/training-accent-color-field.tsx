import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  TRAINING_ACCENT_SWATCHES,
  getTrainingAccentSoftTextColor,
  getTrainingAccentStyle,
  normalizeTrainingAccentColor,
} from '../types'

interface AccentColorFieldProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  error?: string
  inputInstanceKey?: number
}

export function AccentColorField({
  value,
  onChange,
  error,
  inputInstanceKey,
}: AccentColorFieldProps) {
  const normalizedColor = normalizeTrainingAccentColor(value)
  const previewStyle = getTrainingAccentStyle(normalizedColor, 'solid')

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Preview del color</p>
            <p className="text-xs text-muted-foreground">
              {normalizedColor ?? 'Se usara fallback temporal por tipo en datos legacy.'}
            </p>
          </div>
          <div
            className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={
              previewStyle ?? {
                borderColor: 'rgba(197, 227, 132, 0.24)',
                backgroundColor: 'rgba(197, 227, 132, 0.08)',
                color: getTrainingAccentSoftTextColor('#C5E384'),
              }
            }
          >
            Vista previa
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {TRAINING_ACCENT_SWATCHES.map((swatch) => {
          const isSelected = normalizedColor === swatch

          return (
            <button
              key={swatch}
              type="button"
              onClick={() => onChange(swatch)}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-card px-2 py-3 transition-colors hover:border-brand-primary/50"
            >
              <span
                className="h-8 w-8 rounded-full border border-foreground/20 shadow-sm"
                style={{ backgroundColor: swatch }}
              />
              <span
                className={`text-[10px] font-medium ${
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {swatch.replace('#', '')}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-[88px_minmax(0,1fr)_auto]">
        <label className="flex items-center justify-center rounded-md border border-input bg-input p-1">
          <input
            key={inputInstanceKey}
            type="color"
            value={normalizedColor ?? '#C5E384'}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 w-full cursor-pointer rounded border-0 bg-transparent"
          />
        </label>

        <Input
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
          placeholder="#C5E384"
        />

        <Button type="button" variant="outline" onClick={() => onChange(null)} disabled={!value}>
          Limpiar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Usa swatches, picker o hex. El preview ajusta contraste del texto automáticamente.
      </p>

      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}

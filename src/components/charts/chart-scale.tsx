import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CHART_SCALE_OPTIONS, type ChartScale } from './chart-scale-utils'

interface ChartScaleSelectProps {
  value: ChartScale
  onValueChange: (value: ChartScale) => void
}

export function ChartScaleSelect({ value, onValueChange }: ChartScaleSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-sm text-muted-foreground">Escala Y</span>
      <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as ChartScale)}>
        <SelectTrigger className="w-[105px]" aria-label="Escala del eje Y">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHART_SCALE_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option === 'auto' ? 'Auto' : option.replace('.', ',')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

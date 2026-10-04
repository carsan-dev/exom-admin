import { Tooltip, type TooltipProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

/** Enforce the EXOM theme pair on default content, including nested item/label text. */
export function ProgressChartTooltip<TValue extends ValueType, TName extends NameType>(props: TooltipProps<TValue, TName>) {
  return <Tooltip<TValue, TName> {...props}
    contentStyle={{ ...props.contentStyle, backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
    itemStyle={{ ...props.itemStyle, color: 'var(--foreground)' }}
    labelStyle={{ ...props.labelStyle, color: 'var(--foreground)' }} />
}
// Recharts 2 discovers chart children by displayName before injecting hover payload.
ProgressChartTooltip.displayName = 'Tooltip'

import { ChevronRight } from 'lucide-react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'
import { formatDiffValue, getDiffFieldLabel } from '../diff-labels'
import type { SuperAdminApprovalRequestDetail } from '../types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function buildComparisonRows(request: SuperAdminApprovalRequestDetail) {
  const current = isRecord(request.current_resource) ? request.current_resource : {}
  const payload = isRecord(request.payload) ? request.payload : {}
  const keys = [...new Set([...Object.keys(current), ...Object.keys(payload)])]

  return keys.map((key) => {
    const currentValue = current[key]
    const nextValue = payload[key]
    return {
      key,
      currentValue,
      nextValue,
      changed: JSON.stringify(currentValue ?? null) !== JSON.stringify(nextValue ?? null),
    }
  })
}

type ComparisonRow = ReturnType<typeof buildComparisonRows>[number]

const valueClassName = 'min-w-0 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]'

function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  const isDesktop = useMediaQuery('(min-width: 768px)', true)

  if (isDesktop) {
    return (
      <div className="min-w-0 border-y border-border">
        <div className="grid grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-border-strong px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <span>Campo</span>
          <span>Estado actual</span>
          <span>Cambio propuesto</span>
        </div>
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div
              key={row.key}
              className={cn(
                'grid grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)_minmax(0,1fr)] gap-4 px-3 py-3',
                row.changed && 'bg-lime-soft',
              )}
            >
              <span className="min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                {getDiffFieldLabel(row.key)}
              </span>
              <span className={cn(valueClassName, 'text-foreground-secondary')}>{formatDiffValue(row.currentValue)}</span>
              <span className={cn(valueClassName, row.changed ? 'text-foreground' : 'text-foreground-secondary')}>
                {formatDiffValue(row.nextValue)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ul className="min-w-0 divide-y divide-border border-y border-border">
      {rows.map((row) => (
        <li key={row.key} className={cn('min-w-0 space-y-2 px-3 py-3', row.changed && 'bg-lime-soft')}>
          <p className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">{getDiffFieldLabel(row.key)}</p>
          <dl className="space-y-2">
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Estado actual</dt>
              <dd className={cn(valueClassName, 'text-foreground-secondary')}>{formatDiffValue(row.currentValue)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Cambio propuesto</dt>
              <dd className={cn(valueClassName, row.changed ? 'text-foreground' : 'text-foreground-secondary')}>
                {formatDiffValue(row.nextValue)}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  )
}

function FieldList({ title, data }: { title: string; data: Record<string, unknown> | null | undefined }) {
  const entries = Object.entries(isRecord(data) ? data : {})

  return (
    <div className="min-w-0 space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {entries.length === 0 ? (
        <p className="border-y border-border py-3 text-sm text-foreground-secondary">—</p>
      ) : (
        <dl className="divide-y divide-border border-y border-border">
          {entries.map(([key, value]) => (
            <div key={key} className="grid min-w-0 gap-1 py-3 md:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)] md:gap-4">
              <dt className="min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]">{getDiffFieldLabel(key)}</dt>
              <dd className={cn(valueClassName, 'text-foreground-secondary')}>{formatDiffValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

function TechnicalData({ request }: { request: SuperAdminApprovalRequestDetail }) {
  return (
    <details className="group min-w-0 border-y border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-1 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus md:min-h-9 [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="size-4 flex-none transition-transform group-open:rotate-90" />
        Datos técnicos
      </summary>
      <div className="min-w-0 space-y-4 px-1 pb-4 pt-2">
        <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Estado actual (JSON)</p>
            <pre className="max-h-72 max-w-full overflow-auto whitespace-pre border border-border bg-background-secondary p-3 font-mono text-xs text-foreground-secondary">
              {JSON.stringify(request.current_resource ?? {}, null, 2)}
            </pre>
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Payload (JSON)</p>
          <pre className="max-h-72 max-w-full overflow-auto whitespace-pre border border-border bg-background-secondary p-3 font-mono text-xs text-foreground-secondary">
            {JSON.stringify(request.payload, null, 2)}
          </pre>
        </div>
      </div>
    </details>
  )
}

export function ApprovalDiff({ request }: { request: SuperAdminApprovalRequestDetail }) {
  const isUpdate = request.action_type.endsWith('.update')
  const isDelete = request.action_type.endsWith('.delete')
  const rows = isUpdate ? buildComparisonRows(request) : []

  return (
    <div className="min-w-0 space-y-4">
      {isUpdate ? (
        <ComparisonTable rows={rows} />
      ) : (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          {isDelete ? (
            <FieldList title="Estado actual" data={request.current_resource} />
          ) : (
            <>
              <FieldList title="Payload solicitado" data={request.payload} />
              <FieldList title="Estado actual" data={request.current_resource} />
            </>
          )}
        </div>
      )}
      <TechnicalData request={request} />
    </div>
  )
}

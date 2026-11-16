import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { formatAverageDailySteps, getRecapClientName } from '../types'
import type { RecapsListViewProps } from './recaps-desktop-table'
import {
  formatDate,
  formatWeekRange,
  getRecapDetailPath,
  truncateText,
} from './recaps-list-format'
import { RecapStatusChip } from './recap-status-chip'

/** Filas apiladas por debajo de md; mismos datos y acción que la tabla. */
export function RecapsMobileList({ items, returnTo }: RecapsListViewProps) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <li key={item.id} className="space-y-3 py-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-foreground [overflow-wrap:anywhere]">{getRecapClientName(item.client)}</p>
              <p className="text-sm text-foreground-secondary">
                {formatWeekRange(item.week_start_date, item.week_end_date)}
              </p>
            </div>
            <RecapStatusChip status={item.status} archivedAt={item.archived_at} />
          </div>
          <p className="text-xs text-foreground-muted tabular-nums">
            {formatDate(item.submitted_at ?? item.created_at)} · {formatAverageDailySteps(item.average_daily_steps)}
          </p>
          <p className="text-sm text-foreground-secondary [overflow-wrap:anywhere]">{truncateText(item.admin_comments)}</p>
          <Button variant="outline" className="h-11 w-full" asChild>
            <Link to={getRecapDetailPath(item.id, returnTo)}>Abrir</Link>
          </Button>
        </li>
      ))}
    </ul>
  )
}

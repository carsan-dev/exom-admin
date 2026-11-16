import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatAverageDailySteps, getRecapClientName } from '../types'
import type { RecapListItem } from '../types'
import {
  formatDate,
  formatWeekRange,
  getRecapDetailPath,
  truncateText,
} from './recaps-list-format'
import { RecapStatusChip } from './recap-status-chip'

export interface RecapsListViewProps {
  items: RecapListItem[]
  returnTo?: string
}

/** Tabla desde md; por debajo se monta la lista apilada. */
export function RecapsDesktopTable({ items, returnTo }: RecapsListViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Semana</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Enviado</TableHead>
          <TableHead className="text-right">Pasos/día</TableHead>
          <TableHead>Comentario admin</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="min-w-[10rem] max-w-[16rem] font-medium text-foreground [overflow-wrap:anywhere]">
              {getRecapClientName(item.client)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-foreground-secondary">
              {formatWeekRange(item.week_start_date, item.week_end_date)}
            </TableCell>
            <TableCell>
              <RecapStatusChip status={item.status} archivedAt={item.archived_at} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-foreground-secondary">
              {formatDate(item.submitted_at ?? item.created_at)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums text-foreground-secondary">
              {formatAverageDailySteps(item.average_daily_steps)}
            </TableCell>
            <TableCell className="min-w-[10rem] max-w-[260px] text-foreground-secondary [overflow-wrap:anywhere]">
              {truncateText(item.admin_comments)}
            </TableCell>
            <TableCell className="w-px whitespace-nowrap text-right">
              <Button size="sm" variant="outline" asChild>
                <Link to={getRecapDetailPath(item.id, returnTo)}>Abrir</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

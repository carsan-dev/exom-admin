import { Card, CardContent } from '@/components/ui/card'
import type { RecapItem } from '../types'
import { RecapDetailField } from './recap-detail-field'
import { formatDate, formatWeekRange } from './recap-detail-format'
import { RecapStatusBadge } from './recap-status-badge'

export function RecapDetailSummaryCard({ recap, clientName }: { recap: RecapItem; clientName: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex flex-col gap-5 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-accent-text">Revisión de recap</p>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">{clientName}</h1>
              <p className="text-sm text-muted-foreground">{recap.client.email}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Semana {formatWeekRange(recap.week_start_date, recap.week_end_date)}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <RecapStatusBadge status={recap.status} archivedAt={recap.archived_at} />
            <p className="text-sm text-muted-foreground">
              Enviado: {formatDate(recap.submitted_at ?? recap.created_at)}
            </p>
            {recap.reviewed_at && (
              <p className="text-sm text-muted-foreground">Revisado: {formatDate(recap.reviewed_at)}</p>
            )}
            {recap.archived_at && (
              <p className="text-sm text-muted-foreground">Archivado: {formatDate(recap.archived_at)}</p>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <RecapDetailField label="Semana" value={formatWeekRange(recap.week_start_date, recap.week_end_date)} />
          <RecapDetailField label="Cliente" value={clientName} />
          <RecapDetailField label="Correo" value={recap.client.email} />
        </div>
      </CardContent>
    </Card>
  )
}

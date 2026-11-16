import type { ReactNode } from 'react'
import { PageHeader } from '@/components/page'
import type { RecapItem } from '../types'
import { RecapDetailField } from './recap-detail-field'
import { formatDate, formatWeekRange } from './recap-detail-format'
import { RecapStatusChip } from './recap-status-chip'

interface RecapDetailSummaryCardProps {
  recap: RecapItem
  clientName: string
  /** Acciones de la cabecera (imprimir, revisar, archivar). */
  actions?: ReactNode
}

/** Cabecera del detalle: título, estado, fechas y datos del recap en filetes. */
export function RecapDetailSummaryCard({ recap, clientName, actions }: RecapDetailSummaryCardProps) {
  return (
    <section className="min-w-0">
      <PageHeader
        className="mb-3 min-w-0 md:mb-3 [&_h1]:min-w-0 [&_h1]:[overflow-wrap:anywhere]"
        eyebrow="Revisión de recap"
        title={clientName}
        description={
          <>
            <span className="block [overflow-wrap:anywhere]">{recap.client.email}</span>
            <span className="block">Semana {formatWeekRange(recap.week_start_date, recap.week_end_date)}</span>
          </>
        }
        actions={actions}
      />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-4 text-[13px] leading-5 text-foreground-secondary">
        <RecapStatusChip status={recap.status} archivedAt={recap.archived_at} />
        <p>Enviado: {formatDate(recap.submitted_at ?? recap.created_at)}</p>
        {recap.reviewed_at && <p>Revisado: {formatDate(recap.reviewed_at)}</p>}
        {recap.archived_at && <p>Archivado: {formatDate(recap.archived_at)}</p>}
      </div>
      <div className="grid gap-x-8 md:grid-cols-3">
        <RecapDetailField label="Semana" value={formatWeekRange(recap.week_start_date, recap.week_end_date)} />
        <RecapDetailField label="Cliente" value={clientName} />
        <RecapDetailField label="Correo" value={recap.client.email} />
      </div>
    </section>
  )
}

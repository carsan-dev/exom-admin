import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented'
import { ClientSelector } from '../../progress/components/client-selector'
import type { FeedbackStatusFilter } from '../types'

interface FeedbackFiltersProps {
  clientId: string
  status: FeedbackStatusFilter
  onClientChange: (clientId: string) => void
  onStatusChange: (status: FeedbackStatusFilter) => void
}

const STATUS_OPTIONS: { value: FeedbackStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'REVIEWED', label: 'Revisados' },
]

export function FeedbackFilters({
  clientId,
  status,
  onClientChange,
  onStatusChange,
}: FeedbackFiltersProps) {
  return (
    <div role="search" aria-label="Filtrar feedback" className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground-muted">Cliente:</span>
        <div className="flex min-w-0 items-center gap-2 max-md:[&_button]:h-11 [&>button:first-child]:min-w-0 [&>button:first-child]:flex-1 sm:[&>button:first-child]:flex-none">
          <ClientSelector selectedClientId={clientId} onSelect={onClientChange} />
          {clientId && (
            <Button variant="ghost" size="sm" className="flex-none" onClick={() => onClientChange('')}>
              Todos
            </Button>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span id="feedback-status-label" className="text-sm font-medium text-foreground-muted">
          Estado:
        </span>
        <SegmentedControl
          aria-labelledby="feedback-status-label"
          value={status}
          onValueChange={onStatusChange}
          options={STATUS_OPTIONS}
          className="w-full self-start sm:w-auto [&>button]:max-sm:flex-1"
        />
      </div>
    </div>
  )
}

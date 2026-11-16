import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented'
import { ClientSelector } from '../../progress/components/client-selector'
import type { RecapStatusFilter } from '../types'

interface RecapsFiltersProps {
  clientId: string
  status: RecapStatusFilter
  archived: boolean
  onClientChange: (clientId: string) => void
  onStatusChange: (status: RecapStatusFilter) => void
  onArchivedChange: (archived: boolean) => void
}

const STATUS_OPTIONS: { value: RecapStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'SUBMITTED', label: 'Por revisar' },
  { value: 'REVIEWED', label: 'Revisados' },
]

export function RecapsFilters({
  clientId,
  status,
  archived,
  onClientChange,
  onStatusChange,
  onArchivedChange,
}: RecapsFiltersProps) {
  return (
    <div role="search" aria-label="Filtrar recaps" className="flex min-w-0 flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
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
        <span id="recaps-status-label" className="text-sm font-medium text-foreground-muted">
          Estado:
        </span>
        <SegmentedControl
          aria-labelledby="recaps-status-label"
          value={status}
          onValueChange={onStatusChange}
          options={STATUS_OPTIONS}
          className="w-full self-start sm:w-auto [&>button]:max-sm:flex-1"
        />
      </div>

      <Button
        variant={archived ? 'default' : 'outline'}
        size="sm"
        className="max-md:h-11 md:ml-auto"
        onClick={() => onArchivedChange(!archived)}
      >
        {archived ? 'Ver activos' : 'Ver archivados'}
      </Button>
    </div>
  )
}

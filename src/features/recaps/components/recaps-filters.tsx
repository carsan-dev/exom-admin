import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

export function RecapsFilters({
  clientId,
  status,
  archived,
  onClientChange,
  onStatusChange,
  onArchivedChange,
}: RecapsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Cliente:</span>
        <ClientSelector selectedClientId={clientId} onSelect={onClientChange} />
        {clientId && (
          <Button variant="ghost" size="sm" onClick={() => onClientChange('')}>
            Todos
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Estado:</span>
        <Select value={status} onValueChange={(value) => onStatusChange(value as RecapStatusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="SUBMITTED">Por revisar</SelectItem>
            <SelectItem value="REVIEWED">Revisados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant={archived ? 'default' : 'outline'} size="sm" onClick={() => onArchivedChange(!archived)}>
        {archived ? 'Ver activos' : 'Ver archivados'}
      </Button>
    </div>
  )
}

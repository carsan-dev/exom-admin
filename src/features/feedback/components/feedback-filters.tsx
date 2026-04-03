import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ClientSelector } from '../../progress/components/client-selector'
import type { FeedbackStatusFilter } from '../types'

interface FeedbackFiltersProps {
  clientId: string
  status: FeedbackStatusFilter
  onClientChange: (clientId: string) => void
  onStatusChange: (status: FeedbackStatusFilter) => void
}

export function FeedbackFilters({
  clientId,
  status,
  onClientChange,
  onStatusChange,
}: FeedbackFiltersProps) {
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
        <Select value={status} onValueChange={(v) => onStatusChange(v as FeedbackStatusFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="PENDING">Pendientes</SelectItem>
            <SelectItem value="REVIEWED">Revisados</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

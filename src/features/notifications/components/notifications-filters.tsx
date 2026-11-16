import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClientSelector } from '../../progress/components/client-selector'
import type { NotificationStatusFilter } from '../types'

interface NotificationsFiltersProps {
  recipientId: string
  status: NotificationStatusFilter
  search: string
  onRecipientChange: (recipientId: string) => void
  onStatusChange: (status: NotificationStatusFilter) => void
  onSearchChange: (search: string) => void
}

export function NotificationsFilters({
  recipientId,
  status,
  search,
  onRecipientChange,
  onStatusChange,
  onSearchChange,
}: NotificationsFiltersProps) {
  const hasActiveFilters = Boolean(recipientId) || status !== 'ALL' || Boolean(search.trim())

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      <div className="flex items-center gap-2 max-md:[&_button]:h-11">
        <span className="text-sm font-medium text-foreground-muted">Cliente:</span>
        <ClientSelector selectedClientId={recipientId} onSelect={onRecipientChange} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground-muted">Estado:</span>
        <Select value={status} onValueChange={(value) => onStatusChange(value as NotificationStatusFilter)}>
          <SelectTrigger className="w-full max-md:h-11 md:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="SENT">Enviadas</SelectItem>
            <SelectItem value="FAILED">Fallidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative min-w-0 md:min-w-[260px] md:max-w-md md:flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por título o cuerpo"
          className="pl-9 max-md:h-11"
        />
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="max-md:h-11"
          onClick={() => {
            onRecipientChange('')
            onStatusChange('ALL')
            onSearchChange('')
          }}
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}

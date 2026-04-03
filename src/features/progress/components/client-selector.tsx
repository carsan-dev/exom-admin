import { useState } from 'react'
import { Check, ChevronsUpDown, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useClients } from '../../clients/api'
import { getUserDisplayName } from '../../clients/types'
import { cn } from '@/lib/utils'

const ALL_CLIENTS_LIMIT = 200

interface ClientSelectorProps {
  selectedClientId: string
  onSelect: (clientId: string) => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function ClientSelector({ selectedClientId, onSelect }: ClientSelectorProps) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useClients(1, ALL_CLIENTS_LIMIT)

  const clients = data?.data ?? []
  const selected = clients.find((c) => c.id === selectedClientId)
  const selectedName = selected ? getUserDisplayName(selected) : ''

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          {selectedClientId && selected ? (
            <div className="flex items-center gap-2 truncate">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selected.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{getInitials(selectedName)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedName}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Seleccionar cliente...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Buscar por nombre o email..." />
          <CommandList>
            {isLoading && (
              <CommandEmpty>Cargando clientes...</CommandEmpty>
            )}
            {!isLoading && clients.length === 0 && (
              <CommandEmpty>Sin clientes disponibles.</CommandEmpty>
            )}
            <CommandGroup>
              {clients.map((client) => {
                const displayName = getUserDisplayName(client)
                return (
                  <CommandItem
                    key={client.id}
                    value={`${displayName} ${client.email}`}
                    onSelect={() => {
                      onSelect(client.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedClientId === client.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <Avatar className="mr-2 h-6 w-6">
                      <AvatarImage src={client.profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm font-medium">{displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">{client.email}</span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function EmptyClientState() {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center">
      <div className="rounded-full bg-muted p-6">
        <User className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-medium text-foreground">Selecciona un cliente</p>
        <p className="text-sm text-muted-foreground">
          Elige un cliente en el selector de arriba para ver su progreso detallado
        </p>
      </div>
    </div>
  )
}

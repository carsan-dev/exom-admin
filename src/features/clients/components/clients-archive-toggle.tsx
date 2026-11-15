import { Button } from '@/components/ui/button'

export type ClientsArchiveFilter = 'visible' | 'archived'

interface ClientsArchiveToggleProps {
  archive: ClientsArchiveFilter
  onSelect: (value: ClientsArchiveFilter) => void
}

export function ClientsArchiveToggle({ archive, onSelect }: ClientsArchiveToggleProps) {
  return (
    <div className="flex gap-2" role="group" aria-label="Visibilidad de clientes">
      {(['visible', 'archived'] as const).map((value) => (
        <Button key={value} variant={archive === value ? 'default' : 'outline'} aria-pressed={archive === value}
          onClick={() => onSelect(value)}>
          {value === 'visible' ? 'Listado principal' : 'Archivados'}
        </Button>
      ))}
    </div>
  )
}

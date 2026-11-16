import { SegmentedControl } from '@/components/ui/segmented'

export type ClientsArchiveFilter = 'visible' | 'archived'

interface ClientsArchiveToggleProps {
  archive: ClientsArchiveFilter
  onSelect: (value: ClientsArchiveFilter) => void
}

const ARCHIVE_OPTIONS: { value: ClientsArchiveFilter; label: string }[] = [
  { value: 'visible', label: 'Listado principal' },
  { value: 'archived', label: 'Archivados' },
]

export function ClientsArchiveToggle({ archive, onSelect }: ClientsArchiveToggleProps) {
  return (
    <SegmentedControl
      aria-label="Visibilidad de clientes"
      value={archive}
      onValueChange={onSelect}
      options={ARCHIVE_OPTIONS}
      className="max-w-full flex-wrap"
    />
  )
}

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { SortDir } from '@/lib/sort-search-params'

interface SortableTableHeadProps {
  field: string
  label: string
  sortBy?: string
  sortDir: SortDir
  onSortChange: (field: string) => void
  className?: string
}

export function SortableTableHead({
  field,
  label,
  sortBy,
  sortDir,
  onSortChange,
  className,
}: SortableTableHeadProps) {
  const active = sortBy === field
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <TableHead className={className} aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'h-9 gap-1 px-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-transparent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus',
          active && 'text-foreground',
          className?.includes('text-center') && 'mx-auto'
        )}
        onClick={() => onSortChange(field)}
      >
        {label}
        <Icon className={cn('h-3.5 w-3.5', active ? 'text-accent-line' : 'opacity-50')} aria-hidden="true" />
      </Button>
    </TableHead>
  )
}

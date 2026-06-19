import { useDroppable } from '@dnd-kit/core'
import { Folder, FolderMinus, Layers3, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { CatalogGroup, CatalogGroupFilter } from '../types'

function GroupCard({ group, active, onSelect, onEdit, onDelete, disabled }: {
  group: CatalogGroup
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${group.id}`, disabled })
  return (
    <div ref={setNodeRef} className={`min-w-44 rounded-xl border p-3 transition-colors ${isOver || active ? 'border-brand-primary bg-brand-soft/20' : 'border-border bg-card'}`}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" aria-pressed={active} className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onSelect}>
          <Folder className="h-5 w-5 flex-none text-brand-primary" />
          <span className="truncate font-medium">{group.name}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Renombrar</DropdownMenuItem>
            <DropdownMenuItem className="text-status-error" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{group.item_count} elementos</p>
    </div>
  )
}

export function CatalogGroupStrip({ groups, activeFilter, onFilterChange, onCreate, onEdit, onDelete, disabled }: {
  groups: CatalogGroup[]
  activeFilter: CatalogGroupFilter
  onFilterChange: (filter: CatalogGroupFilter) => void
  onCreate: () => void
  onEdit: (group: CatalogGroup) => void
  onDelete: (group: CatalogGroup) => void
  disabled?: boolean
}) {
  const ungrouped = useDroppable({ id: 'group:ungrouped', disabled })
  return (
    <section aria-label="Grupos del catálogo" className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Grupos</h2><Button variant="outline" size="sm" onClick={onCreate}><Plus className="h-4 w-4" />Nuevo grupo</Button></div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        <button type="button" aria-pressed={activeFilter === 'all'} onClick={() => onFilterChange('all')} className={`min-w-40 rounded-xl border p-3 text-left transition-colors ${activeFilter === 'all' ? 'border-brand-primary bg-brand-soft/20' : 'border-border bg-card'}`}>
          <span className="flex items-center gap-2 font-medium"><Layers3 className="h-5 w-5 text-brand-primary" />Todos</span>
          <span className="mt-2 block text-xs text-muted-foreground">Catálogo completo</span>
        </button>
        {groups.map((group) => <GroupCard key={group.id} group={group} active={activeFilter === group.id} onSelect={() => onFilterChange(group.id)} onEdit={() => onEdit(group)} onDelete={() => onDelete(group)} disabled={disabled} />)}
        <div ref={ungrouped.setNodeRef} className={`min-w-40 rounded-xl border border-dashed transition-colors ${ungrouped.isOver || activeFilter === 'ungrouped' ? 'border-brand-primary bg-brand-soft/20' : 'border-border bg-card'}`}>
          <button type="button" aria-pressed={activeFilter === 'ungrouped'} onClick={() => onFilterChange('ungrouped')} className="h-full w-full p-3 text-left">
            <span className="flex items-center gap-2 font-medium"><FolderMinus className="h-5 w-5 text-brand-primary" />Sin grupo</span>
            <span className="mt-2 block text-xs text-muted-foreground">Filtrar o soltar aquí</span>
          </button>
        </div>
      </div>
    </section>
  )
}

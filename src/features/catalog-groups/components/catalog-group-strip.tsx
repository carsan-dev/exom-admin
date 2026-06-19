import { useDroppable } from '@dnd-kit/core'
import { Folder, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { CatalogGroup } from '../types'

function GroupCard({ group, onOpen, onEdit, onDelete, disabled }: {
  group: CatalogGroup
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${group.id}`, disabled })
  return (
    <div ref={setNodeRef} className={`min-w-44 rounded-xl border p-3 transition-colors ${isOver ? 'border-brand-primary bg-brand-soft/20' : 'border-border bg-card'}`}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onOpen}>
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

export function CatalogGroupStrip({ groups, onCreate, onOpen, onEdit, onDelete, disabled }: {
  groups: CatalogGroup[]
  onCreate: () => void
  onOpen: (group: CatalogGroup) => void
  onEdit: (group: CatalogGroup) => void
  onDelete: (group: CatalogGroup) => void
  disabled?: boolean
}) {
  const ungrouped = useDroppable({ id: 'group:ungrouped', disabled })
  return (
    <section aria-label="Grupos del catálogo" className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Grupos</h2><Button variant="outline" size="sm" onClick={onCreate}><Plus className="h-4 w-4" />Nuevo grupo</Button></div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {groups.map((group) => <GroupCard key={group.id} group={group} onOpen={() => onOpen(group)} onEdit={() => onEdit(group)} onDelete={() => onDelete(group)} disabled={disabled} />)}
        <div ref={ungrouped.setNodeRef} className={`min-w-40 rounded-xl border border-dashed p-3 ${ungrouped.isOver ? 'border-brand-primary bg-brand-soft/20' : 'border-border'}`}>
          <p className="font-medium">Sin grupo</p><p className="mt-2 text-xs text-muted-foreground">Suelta aquí para quitar</p>
        </div>
      </div>
    </section>
  )
}

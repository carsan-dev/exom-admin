import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { CatalogGroup } from '../types'

export function CatalogGroupSheet({ open, onOpenChange, group, items, search, onSearchChange, page, totalPages, loading, pending, onPageChange, onRemove }: {
  open: boolean; onOpenChange: (open: boolean) => void; group: CatalogGroup | null
  items: Array<{ id: string; name: string }>; search: string; onSearchChange: (value: string) => void
  page: number; totalPages: number; loading?: boolean; pending?: boolean
  onPageChange: (page: number) => void; onRemove: (id: string) => void
}) {
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{group?.name ?? 'Grupo'}</SheetTitle><SheetDescription>Miembros del grupo. Puedes buscar, paginar o quitar elementos.</SheetDescription></SheetHeader><div className="mt-5 space-y-4"><Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar miembros..." />{loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : items.length ? <ul className="divide-y divide-border rounded-lg border">{items.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 p-3"><span className="truncate text-sm font-medium">{item.name}</span><Button variant="ghost" size="sm" disabled={pending} onClick={() => onRemove(item.id)}><X className="h-4 w-4" />Quitar</Button></li>)}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">Sin miembros.</p>}<div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div></div></SheetContent></Sheet>
}

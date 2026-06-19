import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CatalogGroup } from '../types'

export function CatalogGroupDialog({ open, onOpenChange, group, pending, onSubmit }: {
  open: boolean; onOpenChange: (open: boolean) => void; group: CatalogGroup | null; pending?: boolean; onSubmit: (name: string) => void
}) {
  const [name, setName] = useState('')
  useEffect(() => { if (open) setName(group?.name ?? '') }, [open, group])
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{group ? 'Renombrar grupo' : 'Crear grupo'}</DialogTitle><DialogDescription>Nombre único, entre 1 y 100 caracteres.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="group-name">Nombre</Label><Input id="group-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={pending || !name.trim()} onClick={() => onSubmit(name)}>Guardar</Button></DialogFooter></DialogContent></Dialog>
}

export function DeleteCatalogGroupDialog({ open, onOpenChange, group, pending, onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; group: CatalogGroup | null; pending?: boolean; onConfirm: () => void
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Eliminar grupo</DialogTitle><DialogDescription>Se eliminará “{group?.name}”. Su contenido permanecerá intacto y quedará sin grupo.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="destructive" disabled={pending} onClick={onConfirm}>Eliminar</Button></DialogFooter></DialogContent></Dialog>
}

export function MoveToGroupDialog({ open, onOpenChange, groups, count, pending, onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; groups: CatalogGroup[]; count: number; pending?: boolean; onConfirm: (groupId: string | null) => void
}) {
  const [value, setValue] = useState('ungrouped')
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Mover a grupo</DialogTitle><DialogDescription>Se moverán {count} elementos seleccionados.</DialogDescription></DialogHeader><Select value={value} onValueChange={setValue}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ungrouped">Sin grupo</SelectItem>{groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent></Select><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={pending || count === 0} onClick={() => onConfirm(value === 'ungrouped' ? null : value)}>Mover</Button></DialogFooter></DialogContent></Dialog>
}

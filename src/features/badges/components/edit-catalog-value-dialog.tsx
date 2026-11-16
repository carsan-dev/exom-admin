import type { KeyboardEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tag } from '@/components/ui/tag'
import { isValidCatalogColor, normalizeCatalogLabel, type CatalogItem } from './catalog'

interface EditCatalogValueDialogProps {
  editingItem: CatalogItem | null
  catalogLabel: string
  supportsColor: boolean
  draftValue: string
  draftColor: string
  onDraftValueChange: (value: string) => void
  onDraftColorChange: (value: string) => void
  onDraftValueKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  isPending: boolean
  saveDisabled: boolean
  onSave: () => void
  onClose: () => void
}

export function EditCatalogValueDialog({
  editingItem,
  catalogLabel,
  supportsColor,
  draftValue,
  draftColor,
  onDraftValueChange,
  onDraftColorChange,
  onDraftValueKeyDown,
  isPending,
  saveDisabled,
  onSave,
  onClose,
}: EditCatalogValueDialogProps) {
  return (
    <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent disableOutsideClose className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar valor</DialogTitle>
          <DialogDescription>
            Renombrar "{editingItem?.value}" en{' '}
            {catalogLabel}.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={draftValue}
          onChange={(event) => onDraftValueChange(event.target.value)}
          onKeyDown={onDraftValueKeyDown}
          autoFocus
        />

        {editingItem && supportsColor ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={isValidCatalogColor(draftColor) ? draftColor : '#6B7280'}
                onChange={(event) => onDraftColorChange(event.target.value.toUpperCase())}
                className="h-10 w-14 cursor-pointer p-1"
                aria-label="Color"
              />
              <Input
                value={draftColor}
                onChange={(event) => onDraftColorChange(event.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>
            <Tag
              className="w-fit text-foreground"
              color={isValidCatalogColor(draftColor) ? draftColor : undefined}
            >
              {normalizeCatalogLabel(draftValue) || editingItem.value}
            </Tag>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saveDisabled}>
            {isPending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useDraggable } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CatalogDragHandle({ id, label, disabled }: { id: string; label: string; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled })
  return (
    <Button
      ref={setNodeRef}
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 w-8 cursor-grab p-0 ${isDragging ? 'opacity-40' : ''}`}
      aria-label={`Mover ${label}`}
      disabled={disabled}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="h-4 w-4" />
    </Button>
  )
}

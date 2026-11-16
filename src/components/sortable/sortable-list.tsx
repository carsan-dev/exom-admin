import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type DragEndEvent,
  type Modifier,
  type Over,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'

const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })
const MODIFIERS = [restrictToVerticalAxis]

const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    'Para reordenar, pulsa Espacio o Intro para coger el elemento, usa las flechas arriba y abajo para moverlo y pulsa Espacio o Intro para soltarlo. Pulsa Escape para cancelar.',
}

const positionOf = (entry: Active | Over | null) => {
  const sortable = entry?.data.current?.sortable as { index: number } | undefined
  return sortable ? sortable.index + 1 : null
}

interface SortableListProps {
  ids: string[]
  /** Accessible name of an item, used by the screen-reader announcements. */
  getLabel: (id: string) => string
  onReorder: (from: number, to: number) => void
  children: ReactNode
}

/**
 * Own drag-and-drop context for one vertical list of the builder. Each list (top level
 * and each circuit) gets its own context, so items never move between lists, and it
 * stays independent from the page context that moves trainings into groups.
 */
export function SortableList({ ids, getLabel, onReorder, children }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Escape cancels the drag (dnd-kit listens on the document, bubble phase). Radix
  // Dialog listens for Escape on the document in the capture phase and would close the
  // Workbench first: while a drag is active, mark Escape as handled before it gets there.
  const escapeGuard = useRef<((event: KeyboardEvent) => void) | null>(null)
  const releaseEscape = useCallback(() => {
    if (escapeGuard.current) window.removeEventListener('keydown', escapeGuard.current, true)
    escapeGuard.current = null
  }, [])
  const guardEscape = useCallback(() => {
    releaseEscape()
    escapeGuard.current = (event: KeyboardEvent) => {
      if (event.key === 'Escape') event.preventDefault()
    }
    window.addEventListener('keydown', escapeGuard.current, true)
  }, [releaseEscape])
  useEffect(() => releaseEscape, [releaseEscape])

  const total = ids.length
  const announcements = useMemo<Announcements>(() => {
    const name = (id: UniqueIdentifier) => getLabel(String(id))
    return {
      onDragStart: ({ active }) =>
        `Has cogido ${name(active.id)}. Posición ${positionOf(active)} de ${total}.`,
      onDragOver: ({ active, over }) =>
        over
          ? `${name(active.id)} se ha movido a la posición ${positionOf(over)} de ${total}.`
          : `${name(active.id)} no está sobre ninguna posición de la lista.`,
      onDragEnd: ({ active, over }) =>
        over
          ? `${name(active.id)} se ha soltado en la posición ${positionOf(over)} de ${total}.`
          : `${name(active.id)} se ha soltado sin cambiar de posición.`,
      onDragCancel: ({ active }) =>
        `Reordenación cancelada. ${name(active.id)} vuelve a la posición ${positionOf(active)} de ${total}.`,
    }
  }, [getLabel, total])

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    releaseEscape()
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(from, to)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={MODIFIERS}
      accessibility={{ announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}
      onDragStart={guardEscape}
      onDragEnd={handleDragEnd}
      onDragCancel={releaseEscape}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

type SortableHandleBinding = Pick<
  ReturnType<typeof useSortable>,
  'attributes' | 'listeners' | 'setActivatorNodeRef' | 'isDragging'
>

const SortableHandleContext = createContext<SortableHandleBinding | null>(null)

interface SortableItemProps {
  id: string
  className?: string
  /** Turns the drag off (e.g. while the surrounding form is busy). */
  disabled?: boolean
  children: ReactNode
}

/**
 * A movable row. Only the handle rendered inside it (`SortableHandle`) starts a drag;
 * the rest of the row keeps native touch scrolling and field editing.
 */
export function SortableItem({ id, className, disabled, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled, attributes: { roleDescription: 'elemento reordenable' } })

  const style: CSSProperties = {
    transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
  }

  const handle = useMemo(
    () => ({ attributes, listeners, setActivatorNodeRef, isDragging }),
    [attributes, listeners, setActivatorNodeRef, isDragging]
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-sortable-item=""
      data-dragging={isDragging ? 'true' : undefined}
      className={`motion-reduce:transition-none! ${
        isDragging ? 'relative z-10 bg-background shadow-overlay opacity-90' : ''
      } ${className ?? ''}`.trim()}
    >
      <SortableHandleContext.Provider value={handle}>{children}</SortableHandleContext.Provider>
    </div>
  )
}

/** Drag handle of the surrounding `SortableItem`. Renders nothing outside one. */
export function SortableHandle({ label }: { label: string }) {
  const binding = useContext(SortableHandleContext)
  if (!binding) return null
  const { attributes, listeners, setActivatorNodeRef, isDragging } = binding

  return (
    <Button
      ref={setActivatorNodeRef}
      type="button"
      variant="ghost"
      size="sm"
      className={`size-8 flex-none p-0 text-muted-foreground hover:text-foreground max-md:size-11 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      // Inline on purpose: the unlayered `button { touch-action: manipulation }` rule in
      // index.css beats the `touch-none` utility, and touch drags would scroll instead.
      style={{ touchAction: 'none' }}
      {...attributes}
      {...listeners}
      aria-label={label}
    >
      <GripVertical className="h-4 w-4" />
    </Button>
  )
}

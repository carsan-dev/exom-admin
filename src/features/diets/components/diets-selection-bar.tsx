import { Button } from '@/components/ui/button'
import { SelectionBar } from '@/components/workspace/selection-bar'

interface DietsSelectionBarProps {
  count: number
  disabled: boolean
  onMove: () => void
  onDelete: () => void
  onClear: () => void
}

export function DietsSelectionBar({ count, disabled, onMove, onDelete, onClear }: DietsSelectionBarProps) {
  return (
    // Below md the actions wrap under the count: with two actions and the clear button they do not
    // fit in one row at 390 px.
    <SelectionBar
      count={count}
      onClear={onClear}
      aria-label="Acciones de selección de dietas"
      className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] left-4 right-4 z-40 mt-0 w-auto max-md:flex-wrap max-md:overflow-x-visible md:bottom-6 md:left-1/2 md:right-auto md:w-auto md:min-w-96 md:-translate-x-1/2"
    >
      <Button disabled={disabled} onClick={onMove} className="max-md:h-11">
        Mover a grupo ({count})
      </Button>
      <Button variant="destructive" disabled={disabled} onClick={onDelete} className="max-md:h-11">
        Eliminar ({count})
      </Button>
    </SelectionBar>
  )
}

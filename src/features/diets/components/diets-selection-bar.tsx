import { Button } from '@/components/ui/button'

interface DietsSelectionBarProps {
  count: number
  disabled: boolean
  onMove: () => void
}

export function DietsSelectionBar({ count, disabled, onMove }: DietsSelectionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border bg-card p-2 shadow-lg">
      <Button disabled={disabled} onClick={onMove}>
        Mover a grupo ({count})
      </Button>
    </div>
  )
}

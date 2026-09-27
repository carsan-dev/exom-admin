import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function TrainingInfo({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancelClose = () => clearTimeout(closeTimer.current)
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 150) }
  useEffect(() => () => clearTimeout(closeTimer.current), [])
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button type="button" aria-label={`Información sobre ${label}`} className="-my-2 -mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        onPointerEnter={(event) => { if (event.pointerType !== 'touch') { cancelClose(); setOpen(true) } }}
        onPointerLeave={scheduleClose} onFocus={() => { cancelClose(); setOpen(true) }} onBlur={scheduleClose}
        onClick={(event) => { event.preventDefault(); cancelClose(); setOpen(true) }}>
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" className="max-w-[calc(100vw-2rem)] text-sm" aria-label={`Información sobre ${label}`}
      onOpenAutoFocus={(event) => event.preventDefault()} onCloseAutoFocus={(event) => event.preventDefault()}
      onPointerEnter={cancelClose} onPointerLeave={scheduleClose}>
      {children}
    </PopoverContent>
  </Popover>
}

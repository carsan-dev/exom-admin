import { useRef, useState } from 'react'
import { Maximize2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProgressPhotosImageProps {
  src: string
  alt: string
  enlarged?: boolean
  onEnlarge?: (trigger: HTMLButtonElement) => void
}

// The caller keys this viewer by photo identity and URL, so late image events
// cannot change the loading/error state of another session or view.
export function ProgressPhotosImage({ src, alt, enlarged, onEnlarge }: ProgressPhotosImageProps) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const container = useRef<HTMLDivElement>(null)
  const image = <img key={attempt} src={src} alt={alt}
    onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
    className={enlarged ? 'max-h-[60svh] w-full object-contain' : 'aspect-[3/4] max-h-[34rem] w-full object-contain'} />

  return <div ref={container} tabIndex={-1} className="relative overflow-hidden rounded-md bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    {failed ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
      <p role="alert" className="text-sm">No se pudo cargar la imagen. La foto sigue registrada en la sesión.</p>
      <Button type="button" variant="outline" className="motion-reduce:transition-none" aria-label={`Reintentar imagen ${alt}`} onClick={() => {
        setFailed(false)
        setLoaded(false)
        setAttempt((current) => current + 1)
        container.current?.focus()
      }}><RefreshCw className="h-4 w-4" />Reintentar imagen</Button>
    </div> : <>
      {!loaded && <span role="status" className="absolute left-3 top-3 rounded bg-background px-2 py-1 text-xs">Cargando imagen…</span>}
      {onEnlarge ? <button type="button" aria-label={`Ampliar ${alt}`} onClick={(event) => onEnlarge(event.currentTarget)}
        className="block w-full text-left transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none">
        {image}
        <span className="flex items-center justify-center gap-2 border-t p-3 text-sm"><Maximize2 className="h-4 w-4" />Ampliar imagen</span>
      </button> : image}
    </>}
  </div>
}

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExerciseThumbnailProps {
  name: string
  url: string | null
  className?: string
}

/**
 * Miniatura de tamaño fijo (48x36) para que la fila no salte al cargar la imagen.
 * Sin URL, o si la imagen falla, muestra un recuadro neutro con icono decorativo.
 */
export function ExerciseThumbnail({ name, url, className }: ExerciseThumbnailProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const frame = 'h-9 w-12 flex-none border border-border bg-card'

  if (!url || failedUrl === url) {
    return (
      <span
        data-testid="exercise-thumbnail-fallback"
        className={cn(frame, 'inline-flex items-center justify-center text-foreground-muted', className)}
      >
        <ImageIcon aria-hidden="true" className="size-4" />
      </span>
    )
  }

  return (
    <img
      src={url}
      alt={`Miniatura de ${name}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      width={48}
      height={36}
      onError={() => setFailedUrl(url)}
      className={cn(frame, 'block object-cover', className)}
    />
  )
}

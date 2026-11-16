import { useState } from 'react'
import { Award } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AchievementIconProps {
  name: string
  url: string | null
  className?: string
}

/**
 * Icono del logro de tamaño fijo (36x36) para que la fila no salte al cargar la imagen.
 * La URL es libre y puede fallar: sin URL, o si la imagen falla, muestra un recuadro
 * neutro con icono decorativo.
 */
export function AchievementIcon({ name, url, className }: AchievementIconProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const frame = 'size-9 flex-none border border-border bg-card'

  if (!url || failedUrl === url) {
    return (
      <span
        data-testid="achievement-icon-fallback"
        className={cn(frame, 'inline-flex items-center justify-center text-foreground-muted', className)}
      >
        <Award aria-hidden="true" className="size-4" />
      </span>
    )
  }

  return (
    <img
      src={url}
      alt={`Icono de ${name}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      width={36}
      height={36}
      onError={() => setFailedUrl(url)}
      className={cn(frame, 'block object-cover', className)}
    />
  )
}

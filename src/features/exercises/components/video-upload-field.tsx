import { useRef, useState } from 'react'
import { Upload, X, Play, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { compressVideo } from '@/lib/video-compressor'
import { getApiErrorMessage, useUploadFile } from '../api'

interface VideoUploadFieldProps {
  value: string
  onChange: (url: string) => void
  onThumbnailChange?: (url: string) => void
  label?: string
  disabled?: boolean
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_SIZE_BYTES = 200 * 1024 * 1024 // 200 MB pre-compression

function getExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? 'mp4'
}

type UploadPhase = 'idle' | 'compressing' | 'uploading'

export function VideoUploadField({
  value,
  onChange,
  onThumbnailChange,
  label = 'Video',
  disabled = false,
}: VideoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const uploadFile = useUploadFile()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!e.target) return
    e.target.value = ''

    if (!file) return

    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setError('Formato no válido. Acepta: mp4, mov, webm')
      return
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('El archivo supera el límite de 200 MB')
      return
    }

    setError(null)
    setPhase('compressing')
    setProgress(0)

    try {
      // Compress video + generate thumbnail
      const { video: compressed, thumbnail } = await compressVideo(file, (ratio) => {
        setProgress(Math.round(ratio * 100))
      })

      // Upload compressed video
      setPhase('uploading')
      setProgress(0)

      const uuid = crypto.randomUUID()
      const videoKey = `exercises/videos/${uuid}.mp4`

      const { file_url } = await uploadFile.mutateAsync({
        file: compressed,
        file_key: videoKey,
        content_type: 'video/mp4',
        onProgress: setProgress,
      })

      onChange(file_url)

      // Upload thumbnail
      if (onThumbnailChange) {
        const thumbKey = `exercises/thumbnails/${uuid}.jpg`
        const { file_url: thumbUrl } = await uploadFile.mutateAsync({
          file: thumbnail,
          file_key: thumbKey,
          content_type: 'image/jpeg',
        })
        onThumbnailChange(thumbUrl)
      }

      setPhase('idle')
      setProgress(0)
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se ha podido subir el video'))
      setPhase('idle')
      setProgress(0)
    }
  }

  const handleClear = () => {
    onChange('')
    onThumbnailChange?.('')
    setError(null)
    setPhase('idle')
    setProgress(0)
  }

  const isUploading = phase !== 'idle'

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium leading-none">{label}</p>

      {value ? (
        <div className="min-w-0 space-y-2">
          <div className="relative min-w-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
            <video
              src={value}
              controls
              className="block aspect-video max-h-56 w-full max-w-full bg-black object-contain"
              preload="metadata"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 break-all text-xs text-muted-foreground sm:truncate sm:break-normal">{value}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={disabled || isUploading}
              className="self-start sm:self-center"
            >
              <X className="h-3 w-3" />
              Quitar
            </Button>
          </div>
        </div>
      ) : isUploading ? (
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {phase === 'compressing' ? (
              <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
            ) : (
              <Play className="h-4 w-4 animate-pulse text-brand-primary" />
            )}
            <span>
              {phase === 'compressing'
                ? `Comprimiendo video... ${progress}%`
                : `Subiendo video... ${progress}%`}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-brand-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploadFile.isPending}
          className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-6 text-center transition-colors hover:border-brand-primary/50 hover:bg-brand-soft/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Seleccionar video</p>
            <p className="text-xs text-muted-foreground">MP4, MOV o WebM · Máx. 200 MB (se comprime automáticamente)</p>
          </div>
        </button>
      )}

      {error && (
        <p className="text-xs text-status-error">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  )
}

import { useRef, useState } from 'react'
import { Upload, X, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage, usePresignedUrl } from '../api'

interface VideoUploadFieldProps {
  value: string
  onChange: (url: string) => void
  label?: string
  disabled?: boolean
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB

function getExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? 'mp4'
}

export function VideoUploadField({
  value,
  onChange,
  label = 'Video',
  disabled = false,
}: VideoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const presignedUrl = usePresignedUrl()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!e.target) return
    // Reset input so same file can be re-selected
    e.target.value = ''

    if (!file) return

    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setError('Formato no válido. Acepta: mp4, mov, webm')
      return
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('El archivo supera el límite de 100 MB')
      return
    }

    setError(null)
    setProgress(0)

    try {
      const ext = getExtension(file.name)
      const uuid = crypto.randomUUID()
      const fileKey = `exercises/videos/${uuid}.${ext}`

      const { upload_url, file_url } = await presignedUrl.mutateAsync({
        file_key: fileKey,
        content_type: file.type,
      })

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        }

        xhr.onerror = () => reject(new Error('Error de red durante la subida'))
        xhr.open('PUT', upload_url)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      onChange(file_url)
      setProgress(null)
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se ha podido subir el video'))
      setProgress(null)
    }
  }

  const handleClear = () => {
    onChange('')
    setError(null)
    setProgress(null)
  }

  const isUploading = progress !== null

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
            <Play className="h-4 w-4 animate-pulse text-brand-primary" />
            <span>Subiendo video... {progress}%</span>
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
          disabled={disabled || presignedUrl.isPending}
          className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-6 text-center transition-colors hover:border-brand-primary/50 hover:bg-brand-soft/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Seleccionar video</p>
            <p className="text-xs text-muted-foreground">MP4, MOV o WebM · Máx. 100 MB</p>
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

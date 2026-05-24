import { useRef, useState } from 'react'
import { Upload, X, Play, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { compressVideo } from '@/lib/video-compressor'
import { getApiErrorMessage, useDirectUploadFile, useUploadFile } from '../api'

interface VideoUploadFieldProps {
  value: string
  onChange: (url: string) => void
  onThumbnailChange?: (url: string) => void
  label?: string
  disabled?: boolean
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_SOURCE_SIZE_BYTES = 1024 * 1024 * 1024 // 1 GB pre-compression
const TARGET_COMPRESSED_SIZE_BYTES = 100 * 1024 * 1024
const MAX_COMPRESSED_SIZE_BYTES = 250 * 1024 * 1024
const MAX_PROXY_UPLOAD_SIZE_BYTES = 95 * 1024 * 1024


type UploadPhase = 'idle' | 'compressing' | 'uploading'

function formatFileSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024)
  if (megabytes < 1024) return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`

  return `${(megabytes / 1024).toFixed(2)} GB`
}

function getCompressionSummary(originalSize: number, compressedSize: number) {
  const savedRatio = Math.max(0, 1 - compressedSize / originalSize)
  const savedPercent = Math.round(savedRatio * 100)

  return `${formatFileSize(originalSize)} -> ${formatFileSize(compressedSize)} (${savedPercent}% menos)`
}

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
  const [uploadSummary, setUploadSummary] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const directUploadFile = useDirectUploadFile()
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

    if (file.size > MAX_SOURCE_SIZE_BYTES) {
      setError('El archivo supera el límite de 1 GB')
      return
    }

    setError(null)
    setUploadSummary(null)
    setPhase('compressing')
    setProgress(0)

    try {
      // Compress video + generate thumbnail
      const { video: compressed, thumbnail } = await compressVideo(file, (ratio) => {
        setProgress(Math.round(ratio * 100))
      })
      const summary = getCompressionSummary(file.size, compressed.size)

      if (compressed.size > MAX_COMPRESSED_SIZE_BYTES) {
        setError(
          `El video comprimido pesa ${formatFileSize(compressed.size)}. Máximo permitido: ${formatFileSize(MAX_COMPRESSED_SIZE_BYTES)}.`
        )
        setPhase('idle')
        setProgress(0)
        return
      }

      setUploadSummary(
        compressed.size > TARGET_COMPRESSED_SIZE_BYTES
          ? `${summary}. Aviso: supera el objetivo de ${formatFileSize(TARGET_COMPRESSED_SIZE_BYTES)}.`
          : summary
      )

      // Upload compressed video
      setPhase('uploading')
      setProgress(0)

      const uuid = crypto.randomUUID()
      const videoKey = `exercises/videos/${uuid}.mp4`

      let uploadedVideo: { file_url: string; signed_read_url?: string | null }

      try {
        uploadedVideo = await directUploadFile.mutateAsync({
          file: compressed,
          file_key: videoKey,
          content_type: 'video/mp4',
          onProgress: setProgress,
        })
      } catch (directUploadError) {
        if (compressed.size > MAX_PROXY_UPLOAD_SIZE_BYTES) {
          throw directUploadError
        }

        setProgress(0)
        uploadedVideo = await uploadFile.mutateAsync({
          file: compressed,
          file_key: videoKey,
          content_type: 'video/mp4',
          onProgress: setProgress,
        })
      }

      setPreviewUrl(uploadedVideo.signed_read_url ?? URL.createObjectURL(compressed))
      onChange(uploadedVideo.file_url)

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
    setUploadSummary(null)
    setPhase('idle')
    setProgress(0)
    setPreviewUrl(null)
  }

  const isUploading = phase !== 'idle'

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium leading-none">{label}</p>

      {value ? (
        <div className="min-w-0 space-y-2">
          <div className="relative min-w-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
            <video
              src={previewUrl ?? value}
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
          {uploadSummary && (
            <p className="text-xs text-muted-foreground">{uploadSummary}</p>
          )}
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
          disabled={disabled || directUploadFile.isPending || uploadFile.isPending}
          className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-6 text-center transition-colors hover:border-brand-primary/50 hover:bg-brand-soft/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Seleccionar video</p>
            <p className="text-xs text-muted-foreground">MP4, MOV o WebM · Máx. 1 GB (se comprime antes de subir)</p>
          </div>
        </button>
      )}

      {uploadSummary && phase === 'idle' && (
        <p className="text-xs text-muted-foreground">{uploadSummary}</p>
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

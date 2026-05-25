import { useRef, useState } from 'react'
import { Upload, X, Play, Loader2, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canBypassVideoCompression, compressVideo } from '@/lib/video-compressor'
import { getApiErrorMessage, useDirectUploadFile, useUploadFile } from '../api'

interface VideoUploadFieldProps {
  value: string
  onChange: (url: string) => void
  onThumbnailChange?: (url: string, previewUrl?: string | null) => void
  label?: string
  disabled?: boolean
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_SOURCE_SIZE_BYTES = 1024 * 1024 * 1024 // 1 GB pre-compression
const TARGET_COMPRESSED_SIZE_BYTES = 100 * 1024 * 1024
const MAX_COMPRESSED_SIZE_BYTES = 250 * 1024 * 1024
const MAX_PROXY_UPLOAD_SIZE_BYTES = 95 * 1024 * 1024
const LOCAL_FFMPEG_COMMAND =
  'ffmpeg -i input.mov -vf "scale=\'if(gt(iw,ih),-2,1080)\':\'if(gt(iw,ih),1080,-2)\':flags=lanczos,format=yuv420p" -c:v libx264 -preset fast -profile:v high -level 4.1 -b:v 3500k -maxrate 4400k -bufsize 8750k -c:a aac -b:a 96k -movflags +faststart output.mp4'

type UploadPhase = 'idle' | 'preparing' | 'compressing' | 'uploading'

function formatFileSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024)
  if (megabytes < 1024) return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`

  return `${(megabytes / 1024).toFixed(2)} GB`
}

function getCompressionSummary(originalSize: number, compressedSize: number) {
  if (originalSize === compressedSize) {
    return `${formatFileSize(originalSize)} subido sin comprimir`
  }

  const savedRatio = Math.max(0, 1 - compressedSize / originalSize)
  const savedPercent = Math.round(savedRatio * 100)

  return `${formatFileSize(originalSize)} -> ${formatFileSize(compressedSize)} (${savedPercent}% menos)`
}

function getExtension(filename: string, contentType: string) {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (ext) return ext
  if (contentType === 'video/quicktime') return 'mov'
  if (contentType === 'video/webm') return 'webm'
  return 'mp4'
}

function isMovFile(file: File) {
  return file.type === 'video/quicktime' || getExtension(file.name, file.type) === 'mov'
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
  const [showLocalCommand, setShowLocalCommand] = useState(false)
  const [copiedCommand, setCopiedCommand] = useState(false)
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
    const isMov = isMovFile(file)
    const shouldCompress = !canBypassVideoCompression(file)
    setPhase(shouldCompress ? 'compressing' : 'preparing')
    setProgress(0)

    try {
      const { video: processedVideo, thumbnail } = await compressVideo(file, (ratio) => {
        setProgress(Math.round(ratio * 100))
      })
      const summary = getCompressionSummary(file.size, processedVideo.size)

      if (processedVideo.size > MAX_COMPRESSED_SIZE_BYTES) {
        setError(
          `El video pesa ${formatFileSize(processedVideo.size)}. Máximo permitido: ${formatFileSize(MAX_COMPRESSED_SIZE_BYTES)}.`
        )
        setPhase('idle')
        setProgress(0)
        return
      }

      setUploadSummary(
        isMov
          ? `${summary}. Color conservado: no se aplica tonemapping ni conversion BT.709 forzada.`
          : processedVideo.size > TARGET_COMPRESSED_SIZE_BYTES
          ? `${summary}. Aviso: supera el objetivo de ${formatFileSize(TARGET_COMPRESSED_SIZE_BYTES)}.`
          : summary
      )

      setPhase('uploading')
      setProgress(0)

      const uuid = crypto.randomUUID()
      const videoExtension = getExtension(processedVideo.name, processedVideo.type)
      const videoKey = `exercises/videos/${uuid}.${videoExtension}`
      const videoContentType = processedVideo.type || 'video/mp4'

      let uploadedVideo: { file_url: string; signed_read_url?: string | null }

      try {
        uploadedVideo = await directUploadFile.mutateAsync({
          file: processedVideo,
          file_key: videoKey,
          content_type: videoContentType,
          onProgress: setProgress,
        })
      } catch (directUploadError) {
        if (processedVideo.size > MAX_PROXY_UPLOAD_SIZE_BYTES) {
          throw directUploadError
        }

        setProgress(0)
        uploadedVideo = await uploadFile.mutateAsync({
          file: processedVideo,
          file_key: videoKey,
          content_type: videoContentType,
          onProgress: setProgress,
        })
      }

      setPreviewUrl(uploadedVideo.signed_read_url ?? URL.createObjectURL(processedVideo))
      onChange(uploadedVideo.file_url)

      // Upload thumbnail
      if (onThumbnailChange) {
        const thumbKey = `exercises/thumbnails/${uuid}.jpg`
        const { file_url: thumbUrl, signed_read_url: signedThumbUrl } = await uploadFile.mutateAsync({
          file: thumbnail,
          file_key: thumbKey,
          content_type: 'image/jpeg',
        })
        onThumbnailChange(thumbUrl, signedThumbUrl ?? URL.createObjectURL(thumbnail))
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

  const handleCopyCommand = async () => {
    await navigator.clipboard?.writeText(LOCAL_FFMPEG_COMMAND)
    setCopiedCommand(true)
    window.setTimeout(() => setCopiedCommand(false), 1800)
  }

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
            {phase !== 'uploading' ? (
              <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
            ) : (
              <Play className="h-4 w-4 animate-pulse text-brand-primary" />
            )}
            <span>
              {phase === 'compressing'
                ? `Comprimiendo video... ${progress}%`
                : phase === 'preparing'
                  ? `Preparando video... ${progress}%`
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
            <p className="text-xs text-muted-foreground">MP4, MOV o WebM · Máx. 1 GB. Directo hasta 100 MB.</p>
          </div>
        </button>
      )}

      {!value && !isUploading && (
        <div className="space-y-2 rounded-lg border border-status-warning/40 bg-status-warning/10 p-3 text-left">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left text-xs text-muted-foreground"
            onClick={() => setShowLocalCommand((current) => !current)}
          >
            <span>Comando local equivalente para comprimir conservando color.</span>
            {showLocalCommand ? (
              <ChevronUp className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
          </button>
          {showLocalCommand && (
            <div className="flex min-w-0 items-start gap-2 rounded-md bg-background/60 p-2">
              <code className="min-w-0 flex-1 break-all text-[11px] leading-5 text-muted-foreground">
                {LOCAL_FFMPEG_COMMAND}
              </code>
              <div className="relative shrink-0">
                {copiedCommand && (
                  <span className="absolute bottom-full right-0 mb-1 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow">
                    Copiado al portapapeles!
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopyCommand}
                  aria-label="Copiar comando ffmpeg"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
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


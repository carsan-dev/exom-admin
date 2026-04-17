import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null
const MAX_SHORT_SIDE = 1080
const MAX_THUMBNAIL_LONG_SIDE = 1280
const TARGET_AUDIO_BITRATE_BPS = 96_000
const MIN_VIDEO_BITRATE_BPS = 3_500_000
const MAX_VIDEO_BITRATE_BPS = 5_500_000
const PASSTHROUGH_TOTAL_BITRATE_BPS = 6_200_000
const PASSTHROUGH_MAX_DURATION_SECONDS = 60
const PASSTHROUGH_MAX_LONG_SIDE = 1920
const MAX_DIRECT_UPLOAD_BYTES = 95 * 1024 * 1024

interface VideoMetadata {
  width: number
  height: number
  duration: number
}

async function getFFmpeg() {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg

  ffmpeg = new FFmpeg()

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  return ffmpeg
}

function toPlainArrayBuffer(data: Uint8Array | string): ArrayBuffer {
  if (typeof data === 'string') {
    throw new Error('FFmpeg devolvió texto en lugar de binario')
  }

  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return copy.buffer
}

async function safeDeleteFile(ff: FFmpeg, fileName: string) {
  try {
    await ff.deleteFile(fileName)
  } catch {
    // ignorar
  }
}

function toEven(value: number) {
  const rounded = Math.max(2, Math.round(value))
  return rounded % 2 === 0 ? rounded : rounded - 1
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toKiloBitrate(value: number) {
  return `${Math.round(value / 1000)}k`
}

function getSourceBitrate(fileSize: number, duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return null
  return Math.round((fileSize * 8) / duration)
}

function isMp4File(file: File) {
  return file.type === 'video/mp4' || getExtension(file.name) === '.mp4'
}

function getTargetDimensions(width: number, height: number) {
  const shortSide = Math.min(width, height)
  if (shortSide <= MAX_SHORT_SIDE) {
    return {
      width: toEven(width),
      height: toEven(height),
    }
  }

  const scale = MAX_SHORT_SIDE / shortSide
  return {
    width: toEven(width * scale),
    height: toEven(height * scale),
  }
}

function getThumbnailDimensions(width: number, height: number) {
  const longSide = Math.max(width, height)
  if (longSide <= MAX_THUMBNAIL_LONG_SIDE) {
    return {
      width: toEven(width),
      height: toEven(height),
    }
  }

  const scale = MAX_THUMBNAIL_LONG_SIDE / longSide
  return {
    width: toEven(width * scale),
    height: toEven(height * scale),
  }
}

function shouldBypassCompression(file: File, metadata: VideoMetadata) {
  const sourceBitrate = getSourceBitrate(file.size, metadata.duration)
  if (sourceBitrate === null) return false

  return (
    file.size <= MAX_DIRECT_UPLOAD_BYTES &&
    isMp4File(file) &&
    metadata.duration <= PASSTHROUGH_MAX_DURATION_SECONDS &&
    Math.max(metadata.width, metadata.height) <= PASSTHROUGH_MAX_LONG_SIDE &&
    sourceBitrate <= PASSTHROUGH_TOTAL_BITRATE_BPS
  )
}

function getEncodingBitrates(file: File, metadata: VideoMetadata) {
  const sourceBitrate =
    getSourceBitrate(file.size, metadata.duration) ?? MAX_VIDEO_BITRATE_BPS + TARGET_AUDIO_BITRATE_BPS

  const sourceVideoBitrate = Math.max(TARGET_AUDIO_BITRATE_BPS, sourceBitrate - TARGET_AUDIO_BITRATE_BPS)
  const targetVideoBitrate = clamp(Math.round(sourceVideoBitrate * 0.85), MIN_VIDEO_BITRATE_BPS, MAX_VIDEO_BITRATE_BPS)

  return {
    video: toKiloBitrate(targetVideoBitrate),
    maxRate: toKiloBitrate(Math.round(targetVideoBitrate * 1.25)),
    buffer: toKiloBitrate(Math.round(targetVideoBitrate * 2.5)),
    audio: toKiloBitrate(TARGET_AUDIO_BITRATE_BPS),
  }
}

async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
      video.load()
    }

    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const width = video.videoWidth
      const height = video.videoHeight
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      cleanup()

      if (!width || !height || !duration) {
        reject(new Error('No se pudieron leer los metadatos del video'))
        return
      }

      resolve({ width, height, duration })
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('No se pudieron leer los metadatos del video'))
    }

    video.src = objectUrl
  })
}

async function generateThumbnail(file: File, metadata: VideoMetadata): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    const canvas = document.createElement('canvas')
    const targetSize = getThumbnailDimensions(metadata.width, metadata.height)
    let settled = false

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
      video.load()
    }

    const fail = (message: string) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(message))
    }

    const captureFrame = () => {
      if (settled) return

      try {
        canvas.width = targetSize.width
        canvas.height = targetSize.height

        const context = canvas.getContext('2d')
        if (!context) {
          fail('No se pudo generar la miniatura del video')
          return
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (settled) return
            if (!blob) {
              fail('No se pudo generar la miniatura del video')
              return
            }

            settled = true
            cleanup()
            const timestamp = Date.now()
            resolve(new File([blob], `thumb_${timestamp}.jpg`, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          0.84,
        )
      } catch {
        fail('No se pudo generar la miniatura del video')
      }
    }

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = () => {
      const targetTime = Math.min(1, Math.max(metadata.duration * 0.25, 0))
      if (targetTime <= 0) {
        captureFrame()
        return
      }

      const handleSeeked = () => {
        video.removeEventListener('seeked', handleSeeked)
        captureFrame()
      }

      video.addEventListener('seeked', handleSeeked, { once: true })
      video.currentTime = targetTime
    }

    video.onerror = () => {
      fail('No se pudo generar la miniatura del video')
    }

    video.src = objectUrl
  })
}

export async function compressVideo(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<{ video: File; thumbnail: File }> {
  const metadata = await getVideoMetadata(file)
  onProgress?.(0.08)

  const thumbnail = await generateThumbnail(file, metadata)
  onProgress?.(0.2)

  const targetSize = getTargetDimensions(metadata.width, metadata.height)
  const targetBitrates = getEncodingBitrates(file, metadata)
  const bypassCompression = shouldBypassCompression(file, metadata)

  if (bypassCompression) {
    onProgress?.(1)
    return { video: file, thumbnail }
  }

  const ff = await getFFmpeg()
  ff.on('progress', ({ progress }: { progress: number }) => onProgress?.(0.2 + progress * 0.78))

  const inputName = 'input' + getExtension(file.name)
  const outputName = 'output.mp4'

  onProgress?.(0.24)
  await ff.writeFile(inputName, await fetchFile(file))
  onProgress?.(0.3)

  try {
    await ff.exec([
      '-i',
      inputName,
      '-vf',
      `scale=${targetSize.width}:${targetSize.height}:flags=lanczos`,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-profile:v',
      'high',
      '-level:v',
      '4.1',
      '-pix_fmt',
      'yuv420p',
      '-b:v',
      targetBitrates.video,
      '-maxrate',
      targetBitrates.maxRate,
      '-bufsize',
      targetBitrates.buffer,
      '-c:a',
      'aac',
      '-b:a',
      targetBitrates.audio,
      '-movflags',
      '+faststart',
      outputName,
    ])

    const videoData = await ff.readFile(outputName)

    const videoBuffer = toPlainArrayBuffer(videoData)

    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' })
    const timestamp = Date.now()
    const video = new File([videoBlob], `compressed_${timestamp}.mp4`, { type: 'video/mp4' })

    onProgress?.(1)
    return { video, thumbnail }
  } finally {
    await safeDeleteFile(ff, inputName)
    await safeDeleteFile(ff, outputName)
  }
}

function getExtension(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? `.${ext}` : '.mp4'
}

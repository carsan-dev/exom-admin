import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null
const MAX_SHORT_SIDE = 720
const TARGET_VIDEO_BITRATE = '2M'
const TARGET_MAX_RATE = '2.3M'
const TARGET_BUFFER_SIZE = '4M'
const TARGET_AUDIO_BITRATE = '96k'

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

async function getVideoMetadata(file: File): Promise<{ width: number; height: number }> {
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
      cleanup()

      if (!width || !height) {
        reject(new Error('No se pudieron leer las dimensiones del video'))
        return
      }

      resolve({ width, height })
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('No se pudieron leer los metadatos del video'))
    }

    video.src = objectUrl
  })
}

export async function compressVideo(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<{ video: File; thumbnail: File }> {
  const ff = await getFFmpeg()
  const metadata = await getVideoMetadata(file)
  const targetSize = getTargetDimensions(metadata.width, metadata.height)

  if (onProgress) {
    ff.on('progress', ({ progress }: { progress: number }) => onProgress(progress))
  }

  const inputName = 'input' + getExtension(file.name)
  const outputName = 'output.mp4'
  const thumbName = 'thumb.jpg'

  await ff.writeFile(inputName, await fetchFile(file))

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
      '-pix_fmt',
      'yuv420p',
      '-b:v',
      TARGET_VIDEO_BITRATE,
      '-maxrate',
      TARGET_MAX_RATE,
      '-bufsize',
      TARGET_BUFFER_SIZE,
      '-c:a',
      'aac',
      '-b:a',
      TARGET_AUDIO_BITRATE,
      '-movflags',
      '+faststart',
      outputName,
    ])

    await ff.exec(['-i', inputName, '-ss', '00:00:01', '-vframes', '1', '-q:v', '5', thumbName])

    const videoData = await ff.readFile(outputName)
    const thumbData = await ff.readFile(thumbName)

    const videoBuffer = toPlainArrayBuffer(videoData)
    const thumbBuffer = toPlainArrayBuffer(thumbData)

    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' })
    const thumbBlob = new Blob([thumbBuffer], { type: 'image/jpeg' })

    const timestamp = Date.now()
    const video = new File([videoBlob], `compressed_${timestamp}.mp4`, { type: 'video/mp4' })
    const thumbnail = new File([thumbBlob], `thumb_${timestamp}.jpg`, { type: 'image/jpeg' })

    return { video, thumbnail }
  } finally {
    await safeDeleteFile(ff, inputName)
    await safeDeleteFile(ff, outputName)
    await safeDeleteFile(ff, thumbName)
  }
}

function getExtension(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? `.${ext}` : '.mp4'
}

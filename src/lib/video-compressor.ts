import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null

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

export async function compressVideo(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<{ video: File; thumbnail: File }> {
  const ff = await getFFmpeg()

  if (onProgress) {
    ff.on('progress', ({ progress }) => onProgress(progress))
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
      'scale=-2:720',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-b:v',
      '2M',
      '-maxrate',
      '2.5M',
      '-bufsize',
      '5M',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
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

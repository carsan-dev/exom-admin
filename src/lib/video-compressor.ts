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

export async function compressVideo(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<{ video: File; thumbnail: File }> {
  const ff = await getFFmpeg()

  if (onProgress) {
    ff.on('progress', ({ progress }) => onProgress(progress))
  }

  const inputName = 'input' + getExtension(file.name)
  const outputName = 'output.mp4'
  const thumbName = 'thumb.jpg'

  await ff.writeFile(inputName, await fetchFile(file))

  // Compress: 720p, H.264, 2Mbps, AAC audio
  await ff.exec([
    '-i', inputName,
    '-vf', 'scale=-2:720',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-b:v', '2M',
    '-maxrate', '2.5M',
    '-bufsize', '5M',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputName,
  ])

  // Generate thumbnail from first frame
  await ff.exec([
    '-i', inputName,
    '-ss', '00:00:01',
    '-vframes', '1',
    '-q:v', '5',
    thumbName,
  ])

  const videoData = await ff.readFile(outputName)
  const thumbData = await ff.readFile(thumbName)

  const videoDataArray = videoData instanceof Uint8Array 
    ? videoData 
    : new Uint8Array((videoData as unknown) as ArrayBuffer)
  const thumbDataArray = thumbData instanceof Uint8Array 
    ? thumbData 
    : new Uint8Array((thumbData as unknown) as ArrayBuffer)

  const videoBlob = new Blob([videoDataArray.buffer], { type: 'video/mp4' })
  const thumbBlob = new Blob([thumbDataArray.buffer], { type: 'image/jpeg' })

  const timestamp = Date.now()
  const video = new File([videoBlob], `compressed_${timestamp}.mp4`, { type: 'video/mp4' })
  const thumbnail = new File([thumbBlob], `thumb_${timestamp}.jpg`, { type: 'image/jpeg' })

  return { video, thumbnail }
}

function getExtension(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? `.${ext}` : '.mp4'
}

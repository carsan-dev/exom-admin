import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import {
  isManagedUploadCompletionError,
  retryManagedUploadCompletion,
  uploadManaged,
} from '@/features/uploads/api'

function envelope<T>(data: T) {
  return { data: { data } } as never
}

class SuccessfulUploadRequest {
  status = 200
  upload = { onprogress: null as ((event: ProgressEvent<EventTarget>) => void) | null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  open = vi.fn()
  setRequestHeader = vi.fn()
  send = vi.fn(() => { this.onload?.() })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('managed progress-photo upload retry', () => {
  it('uses a raw signed PUT transport for remote object URLs', async () => {
    const request = new SuccessfulUploadRequest()
    vi.stubGlobal('XMLHttpRequest', class {
      constructor() { return request }
    })
    const post = vi.spyOn(api, 'post')
      .mockResolvedValueOnce(envelope({
        upload_id: 'upload-1',
        upload_url: 'https://upload.test/upload-1',
        file_url: 'https://files.test/upload-1',
      }))
      .mockRejectedValueOnce(new Error('completion response lost'))
      .mockResolvedValueOnce(envelope({
        upload_id: 'upload-1',
        file_url: 'https://files.test/upload-1',
      }))

    let failure: unknown
    try {
      await uploadManaged({
        file: new File(['photo'], 'photo.webp', { type: 'image/webp' }),
        file_key: 'progress-photos/client-1/session-1/front.webp',
        content_type: 'image/webp',
        purpose: 'PROGRESS_PHOTO',
        client_operation_id: 'progress-photo-upload:stable-action',
      })
    } catch (error) {
      failure = error
    }

    expect(isManagedUploadCompletionError(failure)).toBe(true)
    if (!isManagedUploadCompletionError(failure)) throw new Error('Expected completion checkpoint')

    await expect(retryManagedUploadCompletion(failure.checkpoint)).resolves.toMatchObject({
      upload_id: 'upload-1',
    })
    expect(post).toHaveBeenCalledTimes(3)
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/uploads/sessions',
      expect.objectContaining({ client_operation_id: 'progress-photo-upload:stable-action' }),
    )
    expect(request.open).toHaveBeenCalledWith('PUT', 'https://upload.test/upload-1')
    expect(request.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'image/webp')
    expect(post).toHaveBeenNthCalledWith(2, '/uploads/sessions/upload-1/complete')
    expect(post).toHaveBeenNthCalledWith(3, '/uploads/sessions/upload-1/complete')
  })

  it('uses the authenticated multipart proxy transport for a local managed session URL', async () => {
    const file = new File(['photo'], 'photo.webp', { type: 'image/webp' })
    const post = vi.spyOn(api, 'post')
      .mockResolvedValueOnce(envelope({
        upload_id: 'upload-local',
        upload_url: '/uploads/sessions/upload-local/file',
        file_url: 'https://files.test/upload-local',
      }))
      .mockResolvedValueOnce(envelope({
        upload_id: 'upload-local',
        file_url: 'https://files.test/upload-local',
      }))
      .mockResolvedValueOnce(envelope({
        upload_id: 'upload-local',
        file_url: 'https://files.test/upload-local',
      }))

    await expect(uploadManaged({
      file,
      file_key: 'progress-photos/client-1/session-1/front.webp',
      content_type: 'image/webp',
      purpose: 'PROGRESS_PHOTO',
      client_operation_id: 'progress-photo-upload:stable-action',
    })).resolves.toMatchObject({ upload_id: 'upload-local' })

    expect(post).toHaveBeenNthCalledWith(
      2,
      '/uploads/sessions/upload-local/file',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'multipart/form-data' }),
        onUploadProgress: expect.any(Function),
      }),
    )
    const formData = post.mock.calls[1][1] as FormData
    expect(formData.get('file')).toBe(file)
    expect(post).toHaveBeenNthCalledWith(3, '/uploads/sessions/upload-local/complete')
  })
})

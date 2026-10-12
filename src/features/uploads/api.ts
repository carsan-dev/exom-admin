import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, getApiErrorMessage, unwrapResponse } from '@/lib/api-utils'

interface PresignedUrlResponse {
  upload_id: string
  upload_url?: string
  file_url: string
  signed_read_url?: string
}

interface UploadFileResponse {
  upload_id: string
  file_url: string
  signed_read_url?: string
}

export interface ManagedUploadCheckpoint {
  upload_id: string
  file_url: string
  signed_read_url?: string
}

export class ManagedUploadCompletionError extends Error {
  constructor(
    readonly checkpoint: ManagedUploadCheckpoint,
    readonly originalError: unknown,
  ) {
    super('Managed upload completion could not be confirmed')
    this.name = 'ManagedUploadCompletionError'
  }
}

export function isManagedUploadCompletionError(error: unknown): error is ManagedUploadCompletionError {
  return error instanceof ManagedUploadCompletionError
}

export { getApiErrorMessage }

function putFileToSignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100))
      }
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100)
        resolve()
        return
      }

      reject(new Error(`R2 upload failed with status ${request.status}`))
    }

    request.onerror = () => reject(new Error('R2 upload failed'))
    request.onabort = () => reject(new Error('R2 upload aborted'))
    request.open('PUT', uploadUrl)
    request.setRequestHeader('Content-Type', contentType)
    request.send(file)
  })
}

function isLocalManagedSessionUploadUrl(uploadUrl: string, uploadId: string) {
  return uploadUrl === `/uploads/sessions/${uploadId}/file`
}

async function postFileToManagedSession(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const formData = new FormData()
  formData.append('file', file)
  await api.post(uploadUrl, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 10 * 60 * 1000,
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress?.(Math.round((event.loaded / event.total) * 100))
      }
    },
  })
  onProgress?.(100)
}

export interface ManagedUploadPayload {
  file: File
  file_key: string
  content_type: string
  purpose: 'MEAL_IMAGE' | 'EXERCISE_VIDEO' | 'EXERCISE_THUMBNAIL' | 'PROGRESS_PHOTO'
  client_operation_id?: string
  onProgress?: (percent: number) => void
}

export async function retryManagedUploadCompletion(checkpoint: ManagedUploadCheckpoint) {
  return unwrapResponse(
    await api.post<ApiEnvelope<UploadFileResponse>>(
      `/uploads/sessions/${checkpoint.upload_id}/complete`,
    ),
  )
}

export async function uploadManaged(payload: ManagedUploadPayload) {
  const sessionResponse = await api.post<ApiEnvelope<PresignedUrlResponse>>(
    '/uploads/sessions',
    {
      purpose: payload.purpose,
      content_type: payload.content_type,
      bytes: payload.file.size,
      ...(payload.client_operation_id ? { client_operation_id: payload.client_operation_id } : {}),
    },
  )
  const session = unwrapResponse(sessionResponse)
  const checkpoint: ManagedUploadCheckpoint = {
    upload_id: session.upload_id,
    file_url: session.file_url,
    signed_read_url: session.signed_read_url,
  }

  if (session.upload_url) {
    if (isLocalManagedSessionUploadUrl(session.upload_url, session.upload_id)) {
      try {
        await postFileToManagedSession(session.upload_url, payload.file, payload.onProgress)
      } catch (error) {
        // The local endpoint persists and completes the session in one request.
        // A lost response can therefore be recovered by retrying only /complete.
        throw new ManagedUploadCompletionError(checkpoint, error)
      }
    } else {
      await putFileToSignedUrl(
        session.upload_url,
        payload.file,
        payload.content_type,
        payload.onProgress,
      )
    }
  }

  try {
    return await retryManagedUploadCompletion(checkpoint)
  } catch (error) {
    throw new ManagedUploadCompletionError(checkpoint, error)
  }
}

export function usePresignedUrl() {
  return useMutation({
    mutationFn: async (payload: { file_key: string; content_type: string }) => {
      const response = await api.post<ApiEnvelope<PresignedUrlResponse>>('/uploads/presigned', payload)
      return unwrapResponse(response)
    },
  })
}

export function useDirectUploadFile() {
  return useMutation({
    mutationFn: uploadManaged,
  })
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async (payload: ManagedUploadPayload) => {
      try {
        return await uploadManaged(payload)
      } catch (managedError) {
        const formData = new FormData()
        formData.append('file', payload.file)
        formData.append('file_key', payload.file_key)
        formData.append('content_type', payload.content_type)
        try {
          return unwrapResponse(
            await api.post<ApiEnvelope<UploadFileResponse>>('/uploads/file', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout: 10 * 60 * 1000,
              onUploadProgress: (event) => {
                if (event.total) {
                  payload.onProgress?.(Math.round((event.loaded / event.total) * 100))
                }
              },
            }),
          )
        } catch {
          throw managedError
        }
      }
    },
  })
}

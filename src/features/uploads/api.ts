import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, getApiErrorMessage, unwrapResponse } from '@/lib/api-utils'

interface PresignedUrlResponse {
  upload_url: string
  file_url: string
  signed_read_url?: string
}

interface UploadFileResponse {
  file_url: string
  signed_read_url?: string
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
    mutationFn: async (payload: {
      file: File
      file_key: string
      content_type: string
      onProgress?: (percent: number) => void
    }) => {
      const response = await api.post<ApiEnvelope<PresignedUrlResponse>>('/uploads/presigned', {
        file_key: payload.file_key,
        content_type: payload.content_type,
      })
      const presigned = unwrapResponse(response)

      await putFileToSignedUrl(
        presigned.upload_url,
        payload.file,
        payload.content_type,
        payload.onProgress,
      )

      return {
        file_url: presigned.file_url,
        signed_read_url: presigned.signed_read_url,
      }
    },
  })
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async (payload: {
      file: File
      file_key: string
      content_type: string
      onProgress?: (percent: number) => void
    }) => {
      const formData = new FormData()
      formData.append('file', payload.file)
      formData.append('file_key', payload.file_key)
      formData.append('content_type', payload.content_type)

      const response = await api.post<ApiEnvelope<UploadFileResponse>>(
        '/uploads/file',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event) => {
            if (event.total) {
              payload.onProgress?.(Math.round((event.loaded / event.total) * 100))
            }
          },
        },
      )
      return unwrapResponse(response)
    },
  })
}

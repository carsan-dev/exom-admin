import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, getApiErrorMessage, unwrapResponse } from '@/lib/api-utils'

interface PresignedUrlResponse {
  upload_url: string
  file_url: string
}

interface UploadFileResponse {
  file_url: string
}

export { getApiErrorMessage }

export function usePresignedUrl() {
  return useMutation({
    mutationFn: async (payload: { file_key: string; content_type: string }) => {
      const response = await api.post<ApiEnvelope<PresignedUrlResponse>>('/uploads/presigned', payload)
      return unwrapResponse(response)
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

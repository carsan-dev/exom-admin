import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, getApiErrorMessage, unwrapResponse } from '@/lib/api-utils'

interface PresignedUrlResponse {
  upload_url: string
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

import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ImageUploadField } from './image-upload-field'

const { imageCompression, mutateAsync } = vi.hoisted(() => ({
  imageCompression: vi.fn(),
  mutateAsync: vi.fn(),
}))

vi.mock('browser-image-compression', () => ({ default: imageCompression }))

vi.mock('@/features/uploads/api', () => ({
  getApiErrorMessage: () => 'Upload failed',
  isManagedUploadCompletionError: () => false,
  retryManagedUploadCompletion: vi.fn(),
  useDirectUploadFile: () => ({ mutateAsync, isPending: false }),
  useUploadFile: () => ({ mutateAsync, isPending: false }),
}))

describe('ImageUploadField', () => {
  it('compresses uploads without loading the external worker CDN', async () => {
    const file = new File(['image'], 'progress.jpg', { type: 'image/jpeg' })
    const compressed = new File(['compressed-image'], 'progress.webp', { type: 'image/webp' })
    imageCompression.mockResolvedValue(compressed)
    mutateAsync.mockResolvedValue({
      upload_id: 'upload-1',
      file_url: 'https://image.test/progress.webp',
    })

    const { container } = render(
      <ImageUploadField
        value=""
        onChange={vi.fn()}
        fileKeyPrefix="progress-photos/client-1"
        purpose="PROGRESS_PHOTO"
      />,
    )

    const input = container.querySelector('input[type="file"]')
    expect(input).not.toBeNull()
    await userEvent.setup().upload(input as HTMLInputElement, file)

    await waitFor(() => expect(imageCompression).toHaveBeenCalledWith(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1200,
      useWebWorker: false,
      fileType: 'image/webp',
    }))
  })
})

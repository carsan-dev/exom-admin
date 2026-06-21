import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
import { CreateClientDialog } from './create-client-dialog'

const mutateAsync = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: (selector: (state: { user: { role: string } }) => unknown) =>
    selector({ user: { role: 'ADMIN' } }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  getApiErrorMessage: vi.fn(),
  useCreateClient: () => ({ mutateAsync, isPending: false }),
}))

describe('CreateClientDialog', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({})
    useUnsavedChangesStore.getState().setEditorDirty('create-client-form', false)
  })

  it('clears unsaved changes before notifying that the client was created', async () => {
    let dirtyWhenCreated: boolean | undefined
    const onOpenChange = vi.fn()

    render(
      <CreateClientDialog
        open
        onOpenChange={onOpenChange}
        onCreated={() => {
          dirtyWhenCreated = useUnsavedChangesStore.getState().hasUnsavedChanges
        }}
      />,
    )

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Lucía' } })
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Martínez' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lucia@example.com' } })

    await waitFor(() => expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: 'Crear cliente' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce())
    expect(dirtyWhenCreated).toBe(false)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

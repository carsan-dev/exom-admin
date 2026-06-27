import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRouter, Outlet, RouterProvider, useNavigate } from 'react-router'
import { clearUnsavedChanges, useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
import { UnsavedChangesGuard } from './unsaved-changes-guard'

const EDITOR_ID = 'guard-test-editor'

function GuardedLayout() {
  return (
    <>
      <UnsavedChangesGuard />
      <Outlet />
    </>
  )
}

function EditorPage() {
  const navigate = useNavigate()

  return (
    <>
      <button onClick={() => useUnsavedChangesStore.getState().setEditorDirty(EDITOR_ID, true)}>
        Editar
      </button>
      <button
        onClick={() => {
          clearUnsavedChanges(EDITOR_ID)
          navigate('/next')
        }}
      >
        Guardar y continuar
      </button>
    </>
  )
}

describe('UnsavedChangesGuard', () => {
  beforeEach(() => clearUnsavedChanges(EDITOR_ID))

  it('allows immediate navigation after changes are saved', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter([
      {
        element: <GuardedLayout />,
        children: [
          { path: '/', element: <EditorPage /> },
          { path: '/next', element: <p>Destino</p> },
        ],
      },
    ])

    render(<RouterProvider router={router} />)

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await waitFor(() => expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true))
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }))

    expect(await screen.findByText('Destino')).toBeInTheDocument()
    expect(screen.queryByText('Hay cambios sin guardar')).not.toBeInTheDocument()
  })
})

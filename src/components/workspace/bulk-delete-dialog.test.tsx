import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { BulkDeleteSummary } from '@/lib/bulk-delete'
import { BulkDeleteDialog, type BulkDeleteDialogProps } from './bulk-delete-dialog'

const items = [
  { id: 'd-1', name: 'Definición A' },
  { id: 'd-2', name: 'Volumen B' },
  { id: 'd-3', name: 'Mantenimiento C' },
]

function renderDialog(props: Partial<BulkDeleteDialogProps> = {}) {
  const onOpenChange = vi.fn()
  const onConfirm = vi.fn()
  const view = render(
    <BulkDeleteDialog
      open
      onOpenChange={onOpenChange}
      items={items}
      labels={{ singular: 'dieta', plural: 'dietas', gender: 'feminine' }}
      consequences="Dejarán de estar disponibles para nuevas asignaciones."
      requiresApproval={false}
      running={false}
      progress={null}
      summary={null}
      sessionExpired={false}
      onConfirm={onConfirm}
      {...props}
    />
  )
  return { ...view, onOpenChange, onConfirm }
}

describe('BulkDeleteDialog', () => {
  it('lists every selected name with the count and focuses «Cancelar»', async () => {
    const { onConfirm } = renderDialog()

    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 3 dietas' })
    const list = within(dialog).getByRole('list', { name: 'Dietas seleccionadas' })
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Definición A',
      'Volumen B',
      'Mantenimiento C',
    ])
    expect(within(dialog).getByText('Dejarán de estar disponibles para nuevas asignaciones.')).toBeInTheDocument()
    expect(within(dialog).queryByText(/Tu rol necesita aprobación/)).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar 3 dietas' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('uses the singular for one item and masculine labels', async () => {
    renderDialog({
      items: [items[0]],
      labels: { singular: 'entrenamiento', plural: 'entrenamientos', gender: 'masculine' },
    })

    const dialog = await screen.findByRole('dialog', { name: 'Eliminar 1 entrenamiento' })
    expect(within(dialog).getByRole('button', { name: 'Eliminar 1 entrenamiento' })).toBeInTheDocument()
    expect(within(dialog).getByRole('list', { name: 'Entrenamientos seleccionados' })).toBeInTheDocument()
  })

  it('warns ADMIN users that every item becomes an approval request', async () => {
    renderDialog({ requiresApproval: true })

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText(
        'Tu rol necesita aprobación: se enviará una solicitud por cada elemento y no se eliminarán hasta que se aprueben.'
      )
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Solicitar eliminación' })).toBeInTheDocument()
  })

  it('shows progress and cannot be closed while running', async () => {
    const { onOpenChange } = renderDialog({ running: true, progress: { current: 2, total: 3 } })

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('status')).toHaveTextContent('Eliminando 2 de 3…')
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: /Eliminando/ })).toBeDisabled()

    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar diálogo' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('summarises the result with the server reason next to each failed name', async () => {
    const summary: BulkDeleteSummary = {
      results: [
        { id: 'd-1', name: 'Definición A', outcome: 'deleted' },
        { id: 'd-2', name: 'Volumen B', outcome: 'failed', status: 409, message: 'La dieta está en uso' },
        { id: 'd-3', name: 'Mantenimiento C', outcome: 'pending_approval' },
        { id: 'd-4', name: 'Otra D', outcome: 'not_attempted' },
      ],
      counts: { deleted: 1, not_found: 0, pending_approval: 1, failed: 1, not_attempted: 1 },
      allDeleted: false,
      stopped: true,
    }
    const { onOpenChange } = renderDialog({ summary })

    const dialog = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      '1 eliminada, 1 enviada a aprobación, 1 fallida, 1 no intentada.'
    )
    expect(within(dialog).getByRole('region', { name: 'Eliminada (1)' })).toHaveTextContent('Definición A')
    expect(within(dialog).getByRole('region', { name: 'Enviada a aprobación (1)' })).toHaveTextContent(
      'Mantenimiento C'
    )
    expect(within(dialog).getByRole('region', { name: 'Fallida (1)' })).toHaveTextContent(
      'Volumen B: La dieta está en uso'
    )
    expect(within(dialog).getByRole('region', { name: 'No intentada (1)' })).toHaveTextContent('Otra D')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('lists items that no longer existed apart and says how many were deleted when the session expired', async () => {
    const summary: BulkDeleteSummary = {
      results: [
        { id: 'd-1', name: 'Definición A', outcome: 'deleted' },
        { id: 'd-2', name: 'Volumen B', outcome: 'not_found' },
        { id: 'd-3', name: 'Mantenimiento C', outcome: 'not_found' },
        { id: 'd-4', name: 'Otra D', outcome: 'failed', status: 401, message: 'Sesión caducada' },
        { id: 'd-5', name: 'Otra E', outcome: 'not_attempted' },
      ],
      counts: { deleted: 1, not_found: 2, pending_approval: 0, failed: 1, not_attempted: 1 },
      allDeleted: false,
      stopped: true,
    }
    renderDialog({ summary, sessionExpired: true })

    const dialog = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      '1 eliminada, 2 ya no existían, 1 fallida, 1 no intentada.'
    )
    expect(within(dialog).getByRole('region', { name: 'Ya no existían (2)' })).toHaveTextContent(
      'Volumen BMantenimiento C'
    )
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Tu sesión ha caducado: se han eliminado 1 de 5 dietas y 4 no. Al cerrar tendrás que volver a iniciar sesión.'
    )
  })

  it('shows no session notice while the session is valid', async () => {
    const summary: BulkDeleteSummary = {
      results: [{ id: 'd-1', name: 'Definición A', outcome: 'not_found' }],
      counts: { deleted: 0, not_found: 1, pending_approval: 0, failed: 0, not_attempted: 0 },
      allDeleted: false,
      stopped: false,
    }
    renderDialog({ summary })

    const dialog = await screen.findByRole('dialog', { name: 'Resultado de la eliminación' })
    expect(within(dialog).getByRole('status')).toHaveTextContent('1 ya no existía.')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  })

  describe('focus on close', () => {
    /** Page stand-in: a <main> landmark and a selection bar that unmounts when «deleteAll» runs. */
    function Page() {
      const [open, setOpen] = useState(false)
      const [selected, setSelected] = useState(true)
      return (
        <main tabIndex={-1} aria-label="Contenido">
          {selected && <button onClick={() => setOpen(true)}>Eliminar (3)</button>}
          <BulkDeleteDialog
            open={open}
            onOpenChange={setOpen}
            items={items}
            labels={{ singular: 'dieta', plural: 'dietas', gender: 'feminine' }}
            consequences="Consecuencias"
            requiresApproval={false}
            running={false}
            progress={null}
            summary={null}
            sessionExpired={false}
            onConfirm={() => {
              setSelected(false)
              setOpen(false)
            }}
          />
        </main>
      )
    }

    it('returns focus to the opener after cancelling', async () => {
      const user = userEvent.setup({ delay: null })
      render(<Page />)
      await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
      const dialog = await screen.findByRole('dialog')

      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.getByRole('button', { name: 'Eliminar (3)' })).toHaveFocus()
    })

    it('moves focus to <main> when the opener left the document', async () => {
      const user = userEvent.setup({ delay: null })
      render(<Page />)
      await user.click(screen.getByRole('button', { name: 'Eliminar (3)' }))
      const dialog = await screen.findByRole('dialog')

      await user.click(within(dialog).getByRole('button', { name: 'Eliminar 3 dietas' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.queryByRole('button', { name: 'Eliminar (3)' })).not.toBeInTheDocument()
      expect(screen.getByRole('main', { name: 'Contenido' })).toHaveFocus()
    })
  })
})

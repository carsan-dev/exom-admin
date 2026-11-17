import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Workbench } from './workbench'

// Same effective-lock assertions as src/components/ui/dialog.test.tsx.
function expectPageScrollLocked() {
  expect(document.body).toHaveAttribute('data-scroll-locked')
  expect(getComputedStyle(document.body).overflow).toBe('hidden')
}

function expectPageScrollReleased() {
  expect(document.body).not.toHaveAttribute('data-scroll-locked')
  expect(getComputedStyle(document.body).overflow).not.toBe('hidden')
  expect(document.body.style.overflow).toBe('')
  expect(document.body.style.pointerEvents).toBe('')
}

function ControlledWorkbench({
  onCloseRequest,
  onOpenChangeSpy,
}: {
  onCloseRequest?: () => void
  onOpenChangeSpy?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir editor
      </button>
      <Workbench
        open={open}
        onOpenChange={(next) => {
          onOpenChangeSpy?.(next)
          setOpen(next)
        }}
        onCloseRequest={onCloseRequest}
        title="Nuevo entrenamiento"
        description="Constructor de entrenamientos"
        headerActions={<button type="button">Guardar cambios</button>}
        footer={<span>6 ejercicios</span>}
      >
        <label htmlFor="wb-name">Nombre</label>
        <input id="wb-name" />
        <p>Contenido del constructor</p>
      </Workbench>
    </>
  )
}

describe('Workbench (RDS-F2-05)', () => {
  it('is a modal dialog named by its title with body, header actions and footer', async () => {
    const user = userEvent.setup()
    render(<ControlledWorkbench />)

    await user.click(screen.getByRole('button', { name: 'Abrir editor' }))

    const dialog = screen.getByRole('dialog', { name: 'Nuevo entrenamiento' })
    expect(dialog).toHaveAccessibleDescription('Constructor de entrenamientos')
    expect(within(dialog).getByText('Contenido del constructor')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    expect(within(dialog).getByText('6 ejercicios')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
    expect(dialog.contains(document.activeElement)).toBe(true)
    expectPageScrollLocked()
  })

  it('keeps focus trapped inside while tabbing', async () => {
    const user = userEvent.setup()
    render(<ControlledWorkbench />)
    await user.click(screen.getByRole('button', { name: 'Abrir editor' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo entrenamiento' })

    for (let i = 0; i < 5; i += 1) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('without onCloseRequest, «Cerrar» closes and releases the scroll lock', async () => {
    const user = userEvent.setup()
    const onOpenChangeSpy = vi.fn()
    render(<ControlledWorkbench onOpenChangeSpy={onOpenChangeSpy} />)
    await user.click(screen.getByRole('button', { name: 'Abrir editor' }))

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onOpenChangeSpy).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expectPageScrollReleased()
  })

  it('without onCloseRequest, Escape closes', async () => {
    const user = userEvent.setup()
    const onOpenChangeSpy = vi.fn()
    render(<ControlledWorkbench onOpenChangeSpy={onOpenChangeSpy} />)
    await user.click(screen.getByRole('button', { name: 'Abrir editor' }))

    await user.keyboard('{Escape}')

    expect(onOpenChangeSpy).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expectPageScrollReleased()
  })

  it('with onCloseRequest, «Cerrar» and Escape ask instead of closing', async () => {
    const user = userEvent.setup()
    const onCloseRequest = vi.fn()
    const onOpenChangeSpy = vi.fn()
    render(<ControlledWorkbench onCloseRequest={onCloseRequest} onOpenChangeSpy={onOpenChangeSpy} />)
    await user.click(screen.getByRole('button', { name: 'Abrir editor' }))

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onCloseRequest).toHaveBeenCalledTimes(1)

    await user.keyboard('{Escape}')
    expect(onCloseRequest).toHaveBeenCalledTimes(2)

    expect(onOpenChangeSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Nuevo entrenamiento' })).toHaveAttribute('data-state', 'open')
    expectPageScrollLocked()
  })

  it('a consumer confirmation can then close it for real', async () => {
    const user = userEvent.setup()

    function DirtyBuilder() {
      const [open, setOpen] = useState(true)
      const [asking, setAsking] = useState(false)
      return (
        <Workbench
          open={open}
          onOpenChange={setOpen}
          onCloseRequest={() => setAsking(true)}
          title="Editar dieta"
        >
          {asking ? (
            <button type="button" onClick={() => setOpen(false)}>
              Salir sin guardar
            </button>
          ) : null}
        </Workbench>
      )
    }

    render(<DirtyBuilder />)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Editar dieta' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Salir sin guardar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expectPageScrollReleased()
  })
})

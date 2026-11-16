import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SidePanel, type SidePanelProps } from './side-panel'

function ControlledPanel(props: Pick<SidePanelProps, 'side' | 'size' | 'footer' | 'description'>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir panel
      </button>
      <SidePanel open={open} onOpenChange={setOpen} title="Detalle del logro" {...props}>
        <p>Contenido del panel</p>
      </SidePanel>
    </>
  )
}

describe('SidePanel (RDS-F2-05)', () => {
  it('is a dialog named by its title, with right / md defaults', async () => {
    const user = userEvent.setup()
    render(<ControlledPanel description="Criterios y clientes" />)

    await user.click(screen.getByRole('button', { name: 'Abrir panel' }))

    const panel = screen.getByRole('dialog', { name: 'Detalle del logro' })
    expect(panel).toHaveAccessibleDescription('Criterios y clientes')
    expect(within(panel).getByText('Contenido del panel')).toBeInTheDocument()
    expect(panel).toHaveAttribute('data-side', 'right')
    expect(panel).toHaveAttribute('data-size', 'md')
    expect(panel).toHaveClass('right-0', 'w-full', 'sm:max-w-[640px]')
    expect(panel.contains(document.activeElement)).toBe(true)
  })

  it('Escape closes', async () => {
    const user = userEvent.setup()
    render(<ControlledPanel />)
    await user.click(screen.getByRole('button', { name: 'Abrir panel' }))
    expect(screen.getByRole('dialog', { name: 'Detalle del logro' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body).not.toHaveAttribute('data-scroll-locked')
  })

  it.each([
    ['sm', 'sm:max-w-[480px]'],
    ['md', 'sm:max-w-[640px]'],
    ['lg', 'sm:max-w-[960px]'],
  ] as const)('size %s maps to %s', async (size, widthClass) => {
    const user = userEvent.setup()
    render(<ControlledPanel size={size} />)
    await user.click(screen.getByRole('button', { name: 'Abrir panel' }))

    const panel = screen.getByRole('dialog', { name: 'Detalle del logro' })
    expect(panel).toHaveAttribute('data-size', size)
    expect(panel).toHaveClass(widthClass)
    expect(panel).not.toHaveClass('sm:max-w-sm')
  })

  it('opens from the left when asked', async () => {
    const user = userEvent.setup()
    render(<ControlledPanel side="left" />)
    await user.click(screen.getByRole('button', { name: 'Abrir panel' }))

    const panel = screen.getByRole('dialog', { name: 'Detalle del logro' })
    expect(panel).toHaveAttribute('data-side', 'left')
    expect(panel).toHaveClass('left-0')
  })

  it('renders the pinned footer', async () => {
    const user = userEvent.setup()
    render(<ControlledPanel footer={<button type="button">Guardar</button>} />)
    await user.click(screen.getByRole('button', { name: 'Abrir panel' }))

    const panel = screen.getByRole('dialog', { name: 'Detalle del logro' })
    expect(within(panel).getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })
})

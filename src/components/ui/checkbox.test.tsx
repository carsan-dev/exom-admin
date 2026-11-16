import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from './checkbox'

describe('Checkbox', () => {
  it('has role checkbox named by a label association', async () => {
    render(
      <>
        <Checkbox id="terms" />
        <label htmlFor="terms">Acepto</label>
      </>
    )
    expect(screen.getByRole('checkbox', { name: 'Acepto' })).not.toBeChecked()
    await userEvent.click(screen.getByText('Acepto'))
    expect(screen.getByRole('checkbox', { name: 'Acepto' })).toBeChecked()
  })

  it('is named by aria-label', () => {
    render(<Checkbox aria-label="Seleccionar fila" />)
    expect(
      screen.getByRole('checkbox', { name: 'Seleccionar fila' })
    ).toBeInTheDocument()
  })

  it('toggles with the Space key and reports via onCheckedChange and onChange', async () => {
    const onCheckedChange = vi.fn()
    const onChange = vi.fn()
    render(
      <Checkbox
        aria-label="x"
        onCheckedChange={onCheckedChange}
        onChange={onChange}
      />
    )
    await userEvent.tab()
    expect(screen.getByRole('checkbox')).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    await userEvent.keyboard(' ')
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
  })

  it('supports defaultChecked (uncontrolled)', () => {
    render(<Checkbox aria-label="x" defaultChecked />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('supports controlled checked', async () => {
    function Controlled() {
      const [checked, setChecked] = useState(false)
      return (
        <Checkbox
          aria-label="x"
          checked={checked}
          onCheckedChange={setChecked}
        />
      )
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('stays unchanged when controlled and the parent ignores the change', async () => {
    render(<Checkbox aria-label="x" checked={false} onCheckedChange={() => {}} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('exposes aria-checked mixed when indeterminate and toggles to checked', async () => {
    const onCheckedChange = vi.fn()
    render(
      <Checkbox
        aria-label="Todos"
        checked="indeterminate"
        onCheckedChange={onCheckedChange}
      />
    )
    const box = screen.getByRole('checkbox')
    expect(box).toHaveAttribute('aria-checked', 'mixed')
    expect(box).toBePartiallyChecked()
    await userEvent.click(box)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('stays indeterminate after a click or Space when the parent keeps the prop', async () => {
    const onCheckedChange = vi.fn()
    render(
      <Checkbox
        aria-label="Todos"
        checked="indeterminate"
        onCheckedChange={onCheckedChange}
      />
    )
    const box = screen.getByRole<HTMLInputElement>('checkbox')
    expect(box.indeterminate).toBe(true)
    await userEvent.click(box)
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
    expect(box.indeterminate).toBe(true)
    expect(box).not.toBeChecked()
    expect(box).toHaveAttribute('aria-checked', 'mixed')
    expect(box).toBePartiallyChecked()
    await userEvent.keyboard(' ')
    expect(onCheckedChange).toHaveBeenCalledTimes(2)
    expect(box.indeterminate).toBe(true)
    expect(box).toHaveAttribute('aria-checked', 'mixed')
  })

  it('leaves the indeterminate state when the parent changes the prop after a click', async () => {
    function Controlled() {
      const [checked, setChecked] = useState<boolean | 'indeterminate'>('indeterminate')
      return <Checkbox aria-label="Todos" checked={checked} onCheckedChange={setChecked} />
    }
    render(<Controlled />)
    const box = screen.getByRole<HTMLInputElement>('checkbox')
    await userEvent.click(box)
    expect(box.indeterminate).toBe(false)
    expect(box).toBeChecked()
    expect(box).not.toHaveAttribute('aria-checked')
  })

  it('does not set aria-checked mixed when not indeterminate', () => {
    render(<Checkbox aria-label="x" checked />)
    expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-checked')
  })

  it('does not fire callbacks when disabled', async () => {
    const onCheckedChange = vi.fn()
    render(<Checkbox aria-label="x" disabled onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.tab()
    await userEvent.keyboard(' ')
    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('passes aria-invalid through', () => {
    render(<Checkbox aria-label="x" aria-invalid="true" />)
    expect(screen.getByRole('checkbox')).toBeInvalid()
  })

  it('merges className and forwards ref', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Checkbox aria-label="x" className="custom-x" ref={ref} />)
    const box = screen.getByRole('checkbox')
    expect(box).toHaveClass('custom-x', 'size-4')
    expect(ref.current).toBe(box)
  })

  it('renders a visible, non-colour-only mark (svg icons)', () => {
    const { container } = render(<Checkbox aria-label="x" defaultChecked />)
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })
})

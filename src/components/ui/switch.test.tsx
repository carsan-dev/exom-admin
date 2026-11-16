import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Switch } from './switch'

describe('Switch', () => {
  it('has role switch with aria-checked and a name via aria-label', () => {
    render(<Switch aria-label="Activo" />)
    const sw = screen.getByRole('switch', { name: 'Activo' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
  })

  it('is named by a label association', () => {
    render(
      <>
        <label htmlFor="notif">Notificaciones</label>
        <Switch id="notif" />
      </>
    )
    expect(
      screen.getByRole('switch', { name: 'Notificaciones' })
    ).toBeInTheDocument()
  })

  it('toggles with Space and Enter', async () => {
    const onCheckedChange = vi.fn()
    render(<Switch aria-label="x" onCheckedChange={onCheckedChange} />)
    await userEvent.tab()
    expect(screen.getByRole('switch')).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    expect(onCheckedChange.mock.calls).toEqual([[true], [false]])
  })

  it('supports defaultChecked (uncontrolled)', () => {
    render(<Switch aria-label="x" defaultChecked />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('supports controlled checked', async () => {
    function Controlled() {
      const [on, setOn] = useState(false)
      return <Switch aria-label="x" checked={on} onCheckedChange={setOn} />
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole('switch'))
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('does not change on its own when controlled', async () => {
    const onCheckedChange = vi.fn()
    render(
      <Switch aria-label="x" checked={false} onCheckedChange={onCheckedChange} />
    )
    await userEvent.click(screen.getByRole('switch'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('does not fire callbacks when disabled', async () => {
    const onCheckedChange = vi.fn()
    render(<Switch aria-label="x" disabled onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(screen.getByRole('switch')).toBeDisabled()
  })

  it('moves the thumb when on (state not colour-only)', () => {
    const { rerender } = render(<Switch aria-label="x" checked={false} />)
    const thumb = () => screen.getByRole('switch').firstElementChild
    expect(thumb()).toHaveClass('translate-x-0.5')
    rerender(<Switch aria-label="x" checked />)
    expect(thumb()).toHaveClass('translate-x-[18px]')
  })

  it('submits a value in a form only while on, when name is given', () => {
    const { container, rerender } = render(
      <form>
        <Switch aria-label="x" name="active" checked />
      </form>
    )
    expect(new FormData(container.querySelector('form')!).get('active')).toBe(
      'on'
    )
    rerender(
      <form>
        <Switch aria-label="x" name="active" checked={false} />
      </form>
    )
    expect(
      new FormData(container.querySelector('form')!).has('active')
    ).toBe(false)
  })

  it('does not submit the form when clicked (type button)', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Switch aria-label="x" />
      </form>
    )
    await userEvent.click(screen.getByRole('switch'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('merges className and forwards ref', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Switch aria-label="x" className="custom-x" ref={ref} />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveClass('custom-x', 'rounded-full')
    expect(ref.current).toBe(sw)
  })
})

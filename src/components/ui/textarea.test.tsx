import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Textarea } from './textarea'

describe('Textarea', () => {
  it('exposes role textbox with its label as accessible name', () => {
    render(
      <>
        <label htmlFor="notes">Notas</label>
        <Textarea id="notes" />
      </>
    )
    expect(screen.getByRole('textbox', { name: 'Notas' })).toBeInTheDocument()
  })

  it('renders only the textarea without showCount', () => {
    const { container } = render(<Textarea aria-label="Notas" />)
    expect(container.firstElementChild?.tagName).toBe('TEXTAREA')
    expect(container.children).toHaveLength(1)
  })

  it('merges className and forwards ref', () => {
    const ref = createRef<HTMLTextAreaElement>()
    render(<Textarea aria-label="Notas" className="custom-x" ref={ref} />)
    const field = screen.getByRole('textbox')
    expect(field).toHaveClass('custom-x', 'border-input')
    expect(ref.current).toBe(field)
  })

  it('forwards ref with showCount', () => {
    const ref = createRef<HTMLTextAreaElement>()
    render(<Textarea aria-label="Notas" showCount ref={ref} />)
    expect(ref.current).toBe(screen.getByRole('textbox'))
  })

  it('supports typing in uncontrolled mode and calls onChange', async () => {
    const onChange = vi.fn()
    render(<Textarea aria-label="Notas" onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'hola')
    expect(screen.getByRole('textbox')).toHaveValue('hola')
    expect(onChange).toHaveBeenCalledTimes(4)
  })

  it('does not type or fire callbacks when disabled', async () => {
    const onChange = vi.fn()
    render(<Textarea aria-label="Notas" disabled onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'hola')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('keeps aria-invalid', () => {
    render(<Textarea aria-label="Notas" aria-invalid="true" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  describe('counter', () => {
    it('shows current/max for uncontrolled usage with defaultValue', async () => {
      render(
        <Textarea
          aria-label="Notas"
          showCount
          maxLength={10}
          defaultValue="abc"
        />
      )
      expect(screen.getByText('3/10')).toBeInTheDocument()
      await userEvent.type(screen.getByRole('textbox'), 'de')
      expect(screen.getByText('5/10')).toBeInTheDocument()
    })

    it('shows current/max for controlled usage', async () => {
      function Controlled() {
        const [value, setValue] = useState('ab')
        return (
          <Textarea
            aria-label="Notas"
            showCount
            maxLength={8}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )
      }
      render(<Controlled />)
      expect(screen.getByText('2/8')).toBeInTheDocument()
      await userEvent.type(screen.getByRole('textbox'), 'xyz')
      expect(screen.getByText('5/8')).toBeInTheDocument()
    })

    it('shows only the current count without maxLength', async () => {
      render(<Textarea aria-label="Notas" showCount />)
      await userEvent.type(screen.getByRole('textbox'), 'hola')
      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('links the counter with aria-describedby', () => {
      render(<Textarea aria-label="Notas" showCount maxLength={10} />)
      expect(screen.getByRole('textbox')).toHaveAccessibleDescription('0/10')
    })

    it('merges a caller aria-describedby instead of replacing it', () => {
      render(
        <>
          <p id="help">Ayuda</p>
          <Textarea
            aria-label="Notas"
            showCount
            maxLength={10}
            aria-describedby="help"
          />
        </>
      )
      const field = screen.getByRole('textbox')
      expect(field.getAttribute('aria-describedby')?.split(' ')).toContain(
        'help'
      )
      expect(field).toHaveAccessibleDescription('Ayuda 0/10')
    })

    it('uses a polite live region only at the limit and does not block typing itself', async () => {
      render(<Textarea aria-label="Notas" showCount maxLength={3} />)
      const counter = screen.getByText('0/3')
      expect(counter).toHaveAttribute('aria-live', 'off')
      await userEvent.type(screen.getByRole('textbox'), 'abcd')
      expect(screen.getByRole('textbox')).toHaveValue('abc')
      expect(screen.getByText('3/3')).toHaveAttribute('aria-live', 'polite')
    })
  })
})

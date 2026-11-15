import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Tag } from './tag'

describe('Tag', () => {
  it('renders its text and is square', () => {
    render(<Tag>Fuerza</Tag>)
    const el = screen.getByText('Fuerza')
    expect(el).toBeInTheDocument()
    expect(el).toHaveClass('rounded-none')
  })

  it('renders no dot without color', () => {
    const { container } = render(<Tag>A</Tag>)
    expect(container.querySelector('[data-slot="tag-dot"]')).toBeNull()
  })

  it('renders an aria-hidden dot with the given colour', () => {
    const { container } = render(<Tag color="#ff0000">A</Tag>)
    const dot = container.querySelector('[data-slot="tag-dot"]') as HTMLElement
    expect(dot).toHaveAttribute('aria-hidden', 'true')
    expect(dot.style.backgroundColor).toBe('rgb(255, 0, 0)')
  })

  it('merges className', () => {
    render(<Tag className="custom-x">A</Tag>)
    expect(screen.getByText('A')).toHaveClass('custom-x', 'border')
  })

  it('forwards ref', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<Tag ref={ref}>A</Tag>)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
  })

  it('passes extra props through', () => {
    render(<Tag aria-label="etiqueta" data-testid="tag">A</Tag>)
    expect(screen.getByTestId('tag')).toHaveAttribute('aria-label', 'etiqueta')
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageHeader } from './page-header'

describe('PageHeader', () => {
  it('renders exactly one h1 with the title', () => {
    render(<PageHeader title="Clientes" eyebrow="Panel" description="Gestiona tus clientes" />)
    expect(screen.getAllByRole('heading')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Clientes' })).toBeInTheDocument()
  })

  it('renders eyebrow and description as plain text, not headings', () => {
    render(<PageHeader title="Clientes" eyebrow="Panel" description="Gestiona tus clientes" />)
    expect(screen.getByText('Panel').tagName).toBe('P')
    expect(screen.getByText('Gestiona tus clientes').tagName).toBe('P')
  })

  it('renders actions', () => {
    render(<PageHeader title="Clientes" actions={<button type="button">Nuevo cliente</button>} />)
    expect(screen.getByRole('button', { name: 'Nuevo cliente' })).toBeInTheDocument()
  })

  it('omits optional parts when not given', () => {
    const { container } = render(<PageHeader title="Clientes" className="extra" />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.firstElementChild).toHaveClass('extra')
  })
})

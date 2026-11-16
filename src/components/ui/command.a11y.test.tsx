import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Command, CommandInput } from './command'

/** RDS-F5-A11Y-25: el icono de búsqueda de CommandInput es decorativo. */
describe('CommandInput', () => {
  it('oculta el icono de búsqueda a la tecnología de apoyo', () => {
    const { container } = render(
      <Command>
        <CommandInput aria-label="Buscar" />
      </Command>,
    )

    const icon = container.querySelector('[cmdk-input-wrapper] svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})

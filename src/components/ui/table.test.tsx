import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Table, TableBody, TableCell, TableRow } from './table'

/** RDS-F5-A11Y-23: el foco por teclado no debe quedar recortado por el contenedor con desplazamiento. */
describe('Table', () => {
  it('el contenedor con desplazamiento horizontal reserva scroll-padding-inline', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper).toHaveClass('overflow-x-auto', 'scroll-px-6')
    expect(wrapper.querySelector('table')).not.toBeNull()
  })
})

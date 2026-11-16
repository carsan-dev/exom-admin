import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './dialog'
import { Input } from './input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from './sheet'

// RDS-F5-01 / RDS-F4-F-TOUCH-01/02: below md every control offers a 44px touch target.
// jsdom has no layout, so the contract is the responsive utility class on each primitive.
describe('touch targets below md (RDS-F5-01)', () => {
  it('Input is 44px tall below md and keeps 40px from md', () => {
    render(<Input aria-label="Buscar" />)
    expect(screen.getByRole('textbox', { name: 'Buscar' })).toHaveClass('h-10', 'max-md:h-11')
  })

  it('SelectTrigger is 44px tall below md and keeps 40px from md', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Estado">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    )
    expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveClass('h-10', 'max-md:h-11')
  })

  it('the Dialog close button is named in Spanish and its hit area grows to 44px below md', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>Abrir</DialogTrigger>
        <DialogContent>
          <DialogTitle>Diálogo</DialogTitle>
          <DialogDescription>d</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const close = within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar diálogo' })
    // 36px visual box + 4px on every side through ::after = 44px.
    expect(close).toHaveClass('size-9', 'max-md:after:absolute', 'max-md:after:-inset-1')
  })

  it('the Sheet close button is named in Spanish and its hit area grows to 44px below md', async () => {
    const user = userEvent.setup()
    render(
      <Sheet>
        <SheetTrigger>Abrir</SheetTrigger>
        <SheetContent>
          <SheetTitle>Panel</SheetTitle>
          <SheetDescription>d</SheetDescription>
        </SheetContent>
      </Sheet>,
    )
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const close = within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar panel' })
    expect(close).toHaveClass('size-9', 'max-md:after:absolute', 'max-md:after:-inset-1')
  })
})

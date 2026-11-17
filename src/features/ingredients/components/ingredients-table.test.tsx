import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Ingredient } from '../types'
import { IngredientsTable } from './ingredients-table'

const ingredient = (id: string, name: string): Ingredient => ({
  id,
  name,
  icon: null,
  calories_per_100g: 100,
  protein_per_100g: 10,
  carbs_per_100g: 10,
  fat_per_100g: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-03T00:00:00Z',
})

const PAGE_ONE = [ingredient('i-1', 'Arroz integral'), ingredient('i-2', 'Pollo')]
const PAGE_TWO = [ingredient('i-3', 'Lentejas')]

function Harness({ ingredients, initial = [] }: { ingredients: Ingredient[]; initial?: string[] }) {
  const [selectedIds, setSelectedIds] = useState(new Set(initial))
  return (
    <TooltipProvider>
      <IngredientsTable
        ingredients={ingredients}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
      <output data-testid="selected">{[...selectedIds].join(',')}</output>
    </TooltipProvider>
  )
}

const header = () => screen.getByRole<HTMLInputElement>('checkbox', { name: 'Seleccionar página' })
const row = (name: string) => screen.getByRole<HTMLInputElement>('checkbox', { name: `Seleccionar ${name}` })

describe('IngredientsTable selection', () => {
  it('names a checkbox per row and one for the page', () => {
    render(<Harness ingredients={PAGE_ONE} />)

    expect(row('Arroz integral')).not.toBeChecked()
    expect(row('Pollo')).not.toBeChecked()
    expect(header()).not.toBeChecked()
    expect(header().indeterminate).toBe(false)
  })

  it('reserves a 44 px touch target around every checkbox in mobile (the table is the only mobile view)', () => {
    render(<Harness ingredients={PAGE_ONE} />)

    for (const checkbox of [header(), row('Arroz integral'), row('Pollo')]) {
      expect(checkbox.closest('div')).toHaveClass('max-md:size-11', 'max-md:justify-center')
    }
  })

  it('marks selected rows with data-state', () => {
    render(<Harness ingredients={PAGE_ONE} initial={['i-2']} />)

    expect(row('Pollo').closest('tr')).toHaveAttribute('data-state', 'selected')
    expect(row('Arroz integral').closest('tr')).not.toHaveAttribute('data-state')
  })

  it('shows the header as mixed with a partial selection and checked when the page is full', async () => {
    render(<Harness ingredients={PAGE_ONE} />)

    await userEvent.click(row('Arroz integral'))
    expect(header().indeterminate).toBe(true)
    expect(header()).not.toBeChecked()

    await userEvent.click(row('Pollo'))
    expect(header().indeterminate).toBe(false)
    expect(header()).toBeChecked()
  })

  it('selects the page from a mixed header and deselects it when it is full', async () => {
    render(<Harness ingredients={PAGE_ONE} />)
    await userEvent.click(row('Arroz integral'))

    await userEvent.click(header())
    expect(screen.getByTestId('selected')).toHaveTextContent('i-1,i-2')

    await userEvent.click(header())
    expect(screen.getByTestId('selected')).toHaveTextContent('')
    expect(row('Arroz integral')).not.toBeChecked()
  })

  it('keeps ids selected on other pages when toggling the visible page', async () => {
    render(<Harness ingredients={PAGE_TWO} initial={['i-1']} />)
    expect(header().indeterminate).toBe(false)
    expect(header()).not.toBeChecked()

    await userEvent.click(header())
    expect(screen.getByTestId('selected')).toHaveTextContent('i-1,i-3')

    await userEvent.click(header())
    expect(screen.getByTestId('selected')).toHaveTextContent('i-1')
  })
})

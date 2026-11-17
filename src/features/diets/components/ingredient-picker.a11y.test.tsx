import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IngredientPicker } from './ingredient-picker'

vi.mock('../api', () => ({
  useIngredientsList: () => ({ data: { data: [] }, isLoading: false }),
}))

// RDS-F5-A11Y-06: el error de validación del grupo de ingredientes se asocia al grupo,
// con el mismo patrón que el selector de ejercicios.
describe('IngredientPicker accesibilidad', () => {
  it('asocia el mensaje de error al grupo de ingredientes', () => {
    render(<IngredientPicker value={[]} onChange={vi.fn()} error="Agrega al menos un ingrediente" />)

    expect(screen.getByRole('group', { name: 'Ingredientes' })).toHaveAccessibleDescription(
      'Agrega al menos un ingrediente',
    )
  })

  it('sin error el grupo no tiene descripción colgante', () => {
    render(<IngredientPicker value={[]} onChange={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Ingredientes' })).not.toHaveAttribute('aria-describedby')
  })
})

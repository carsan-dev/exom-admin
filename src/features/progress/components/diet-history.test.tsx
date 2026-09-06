import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DietHistoryEntry } from '../types'
import { DietHistory } from './diet-history'

const entry: DietHistoryEntry = {
  diet_id: 'diet', version: 1, captured_at: '2026-09-06T00:00:00Z', provenance: 'legacy_available',
  diet: {
    id: 'diet', name: 'Dieta conservada', tags: [], is_active: true,
    total_calories: 700, total_protein_g: 50, total_carbs_g: 80, total_fat_g: 20,
    created_by: null, created_at: '', updated_at: '', group_id: null, group: null,
    meals: [{
      id: 'meal', name: 'Desayuno eliminado', type: 'BREAKFAST', image_url: null,
      calories: 350, protein_g: 20, carbs_g: 40, fat_g: 10, nutritional_badges: [], order: 0, variants: [],
      ingredients: [{ id: 'link', quantity: 2, unit: 'cup', grams_equivalent: 80,
        ingredient: { id: 'oats', name: 'Avena original', icon: null, calories_per_100g: 380, protein_per_100g: 13, carbs_per_100g: 60, fat_per_100g: 7, is_active: true, created_at: '', updated_at: '' },
      }],
    }],
  },
}

describe('DietHistory', () => {
  for (const theme of ['light', 'dark']) {
    it(`shows preserved nutrients/ingredients and legacy caveat, read-only in ${theme}`, () => {
      render(<div className={theme}><DietHistory entries={[entry]} /></div>)
      fireEvent.click(screen.getByText('Dieta conservada'))
      expect(screen.getByText('Desayuno eliminado')).toBeVisible()
      expect(screen.getByText(/Avena original: 2 taza \(80 g\)/)).toBeVisible()
      expect(screen.getByText('350 kcal · P 20 g · C 40 g · G 10 g')).toBeVisible()
      expect(screen.getByText(/puede no reflejar ediciones anteriores/)).toBeVisible()
      expect(screen.getByRole('heading', { name: /Solo lectura/ })).toBeVisible()
      expect(screen.queryByRole('button')).toBeNull()
    })
  }
})

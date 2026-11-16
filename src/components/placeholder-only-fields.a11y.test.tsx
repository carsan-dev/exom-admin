import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Tabs } from '@/components/ui/tabs'
import { CatalogTabsToolbar } from '@/features/badges/components/catalog-tabs-toolbar'
import { BadgesField } from '@/features/diets/components/diet-badges-field'
import { DietTagsField } from '@/features/diets/components/diet-tags-field'
import { AccentColorField } from '@/features/trainings/components/training-accent-color-field'
import { TagsField } from '@/features/trainings/components/training-tags-field'
import { TrainingTypesField } from '@/features/trainings/components/training-types-field'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))

beforeEach(() => {
  api.get.mockReset()
  api.get.mockResolvedValue({ data: { data: [] } })
})

function withQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

/** RDS-F5-A11Y-12: campos que solo tenían placeholder reciben un nombre accesible estable. */
describe('campos solo con placeholder', () => {
  it('buscador del catálogo de badges', () => {
    render(
      <Tabs value="muscle-groups">
        <CatalogTabsToolbar search="" onSearchChange={vi.fn()} catalogTitle="Grupos musculares" />
      </Tabs>,
    )
    expect(screen.getByRole('textbox', { name: 'Buscar en grupos musculares' })).toHaveAttribute(
      'placeholder',
      'Buscar en grupos musculares...',
    )
  })

  it('color visual en hexadecimal del entrenamiento', () => {
    render(<AccentColorField value={null} onChange={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: 'Color visual en hexadecimal' })).toHaveAttribute(
      'placeholder',
      '#C5E384',
    )
  })

  it('nuevo tipo y nueva etiqueta de entrenamiento', () => {
    withQuery(
      <>
        <TrainingTypesField value={[]} onChange={vi.fn()} />
        <TagsField value={[]} onChange={vi.fn()} />
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'Nuevo tipo de entrenamiento' })).toHaveAttribute(
      'placeholder',
      'Nuevo tipo (Enter)',
    )
    expect(screen.getByRole('textbox', { name: 'Nueva etiqueta' })).toHaveAttribute(
      'placeholder',
      'Nueva etiqueta (Enter)',
    )
  })

  it('nueva etiqueta interna y otro badge de la dieta', () => {
    withQuery(
      <>
        <DietTagsField value={[]} onChange={vi.fn()} />
        <BadgesField value={[]} onChange={vi.fn()} />
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'Nueva etiqueta interna' })).toHaveAttribute(
      'placeholder',
      'Nueva etiqueta interna (Enter)',
    )
    expect(screen.getByRole('textbox', { name: 'Otro badge nutricional' })).toHaveAttribute(
      'placeholder',
      'Otro badge (Enter para añadir)',
    )
  })
})

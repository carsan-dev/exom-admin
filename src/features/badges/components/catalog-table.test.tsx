import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CatalogTable } from './catalog-table'
import type { CatalogView } from './catalog'

function buildCatalog(overrides: Partial<CatalogView> = {}): CatalogView {
  return {
    id: 'training-types',
    title: 'Tipos de entrenamientos',
    description: 'Valores reutilizables.',
    badgeLabel: 'Entrenamientos',
    canDelete: true,
    supportsColor: true,
    values: [
      { value: 'Fuerza', color: '#FF0000' },
      { value: 'Cardio', color: '' },
      { value: 'Movilidad', color: 'rojo' },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  }
}

function renderTable(selected: string[] = [], catalog = buildCatalog()) {
  return render(
    <CatalogTable
      catalog={catalog}
      search=""
      page={1}
      onPageChange={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      selectedValues={new Set(selected)}
      onSelectionChange={vi.fn()}
      onDeleteSelected={vi.fn()}
    />,
  )
}

function tagOf(value: string) {
  const tag = screen.getByText(value).closest('[data-catalog-tag]')
  if (!tag) throw new Error(`No tag for ${value}`)
  return tag
}

describe('CatalogTable', () => {
  it('shows the stored color as a dot only when it is a valid hex', () => {
    renderTable()

    const dot = tagOf('Fuerza').querySelector('[data-slot="tag-dot"]')
    expect(dot).toHaveStyle({ backgroundColor: '#FF0000' })
    expect(tagOf('Fuerza')).not.toHaveAttribute('style')
    expect(tagOf('Cardio').querySelector('[data-slot="tag-dot"]')).toBeNull()
    expect(tagOf('Movilidad').querySelector('[data-slot="tag-dot"]')).toBeNull()
  })

  it('does not draw dots for catalogs without color', () => {
    renderTable([], buildCatalog({ supportsColor: false }))
    expect(tagOf('Fuerza').querySelector('[data-slot="tag-dot"]')).toBeNull()
  })

  it('shows the selection bar only when there is a selection', () => {
    const { unmount } = renderTable()
    expect(screen.queryByRole('region', { name: 'Acciones de selección' })).not.toBeInTheDocument()
    unmount()

    renderTable(['Fuerza'])
    const bar = screen.getByRole('region', { name: 'Acciones de selección' })
    expect(bar).toHaveTextContent('1 seleccionados')
    expect(screen.getByRole('button', { name: 'Eliminar seleccionados (1)' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Limpiar selección' })).toBeInTheDocument()
  })
})

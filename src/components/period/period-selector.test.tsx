import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PeriodSelector } from './period-selector'

const base = {
  options: ['7d', '30d', 'all', 'custom'] as const,
  onChange: vi.fn(),
  custom: { from: undefined, to: undefined },
  onCustomChange: vi.fn(),
  error: null,
}

describe('PeriodSelector', () => {
  it('labels the select and shows the resolved and previous range', () => {
    render(<PeriodSelector {...base} options={[...base.options]} value="30d"
      range={{ from: '2026-09-13', to: '2026-10-12' }} previousRange={{ from: '2026-08-14', to: '2026-09-12' }} />)
    expect(screen.getByRole('combobox', { name: 'Periodo' })).toHaveTextContent('Últimos 30 días')
    expect(screen.getByText('13/09/2026 – 12/10/2026 · Comparado con 14/08/2026 – 12/09/2026')).toBeInTheDocument()
    expect(screen.queryByLabelText('Desde')).not.toBeInTheDocument()
  })

  it('describes the all-history range', () => {
    render(<PeriodSelector {...base} options={[...base.options]} value="all"
      range={{ from: undefined, to: '2026-10-12' }} previousRange={null} />)
    expect(screen.getByText('Todo el historial · sin comparación')).toBeInTheDocument()
  })

  it('shows date inputs for custom and reports changes', () => {
    const onCustomChange = vi.fn()
    render(<PeriodSelector {...base} options={[...base.options]} value="custom" onCustomChange={onCustomChange}
      custom={{ from: '2026-09-01', to: '2026-09-10' }}
      range={{ from: '2026-09-01', to: '2026-09-10' }} previousRange={{ from: '2026-08-22', to: '2026-08-31' }} />)
    const from = screen.getByLabelText('Desde')
    expect(from).toHaveValue('2026-09-01')
    expect(screen.getByLabelText('Hasta')).toHaveAttribute('max')
    fireEvent.change(from, { target: { value: '2026-09-02' } })
    expect(onCustomChange).toHaveBeenCalledWith({ from: '2026-09-02', to: '2026-09-10' })
  })

  it('announces errors and marks inputs invalid', () => {
    render(<PeriodSelector {...base} options={[...base.options]} value="custom" error="La fecha de fin no puede ser posterior a hoy."
      custom={{ from: '2026-09-01', to: '2099-01-01' }}
      range={{ from: '2026-09-13', to: '2026-10-12' }} previousRange={null} />)
    expect(screen.getByRole('alert')).toHaveTextContent('posterior a hoy')
    expect(screen.getByRole('alert')).toHaveClass('text-status-error')
    expect(screen.getByLabelText('Desde')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Hasta')).toHaveAttribute('aria-invalid', 'true')
  })
})

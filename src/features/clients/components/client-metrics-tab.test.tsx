import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BodyMetric } from '../types'
import { ClientMetricsTab } from './client-metrics-tab'

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })

vi.mock('./client-metric-dialog', () => ({ ClientMetricDialog: ({ open, metric }: { open: boolean, metric: BodyMetric | null }) => open ? <div role="dialog">{metric ? `Editar ${metric.id}` : 'Crear medición'}</div> : null }))
const empty: BodyMetric = {
  id: 'm1', date: '2020-01-01', created_at: '2020-01-01', weight_kg: null, muscle_mass_kg: null, height_cm: null, sleep_hours: null,
  neck_cm: null, shoulders_cm: null, chest_cm: null, arm_left_cm: null, arm_right_cm: null, forearm_left_cm: null,
  forearm_right_cm: null, waist_cm: null, hips_cm: null, thigh_left_cm: null, thigh_right_cm: null, calf_left_cm: null, calf_right_cm: null,
}
describe('Mediciones en detalle de cliente', () => {
  it('comparte interpretación, selecciona unidades y mantiene edición y creación', () => {
    render(<ClientMetricsTab clientId="a" metrics={[{ ...empty, weight_kg: 70, sleep_hours: 0 }, { ...empty, id: 'm2', date: '2020-01-03', weight_kg: 72, sleep_hours: 8 }]} />)
    expect(screen.getByRole('heading', { name: 'Peso · kg' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Medición' }), { target: { value: 'sleep_hours' } })
    expect(screen.getByRole('heading', { name: 'Sueño · h' })).toBeInTheDocument()
    expect(screen.getByLabelText('Cambio observado')).toHaveTextContent('+8 h')
    fireEvent.click(screen.getByRole('button', { name: 'Editar métricas del 01/01/2020' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Editar m1')
    fireEvent.click(screen.getByRole('button', { name: 'Añadir métricas' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Crear medición')
  })
  it('no convierte ausencias en cero ni une puntos a través de ellas', () => {
    render(<ClientMetricsTab clientId="a" metrics={[{ ...empty, weight_kg: 70 }, { ...empty, id: 'm2', date: '2020-01-02' }]} />)
    expect(screen.getByText('1 observación completa · 1 incompleta')).toBeInTheDocument()
    expect(screen.getByText('Una observación no permite establecer una tendencia.')).toBeInTheDocument()
    expect(screen.getByLabelText('Cambio observado')).toHaveTextContent('No comparable')
    expect(screen.getByText(/No estimamos valores entre fechas/)).toBeInTheDocument()
  })
  it('el cambio de cliente aísla la selección y el diálogo anterior', () => {
    const { rerender } = render(<ClientMetricsTab clientId="a" metrics={[{ ...empty, weight_kg: 70 }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar métricas del 01/01/2020' }))
    rerender(<ClientMetricsTab clientId="b" metrics={[{ ...empty, id: 'b1', weight_kg: 75 }]} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

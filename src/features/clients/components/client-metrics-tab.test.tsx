import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BodyMetric } from '../types'
import { MemoryRouter } from 'react-router'
import { ClientMetricsTab } from './client-metrics-tab'

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })

vi.mock('./client-metric-dialog', () => ({ ClientMetricDialog: ({ open, metric }: { open: boolean, metric: BodyMetric | null }) => open ? <div role="dialog">{metric ? `Editar ${metric.id}` : 'Crear medición'}</div> : null }))
const empty: BodyMetric = {
  id: 'm1', date: '2020-01-01', created_at: '2020-01-01', weight_kg: null, muscle_mass_kg: null, height_cm: null, sleep_hours: null,
  neck_cm: null, shoulders_cm: null, chest_cm: null, arm_left_cm: null, arm_right_cm: null, forearm_left_cm: null,
  forearm_right_cm: null, waist_cm: null, hips_cm: null, thigh_left_cm: null, thigh_right_cm: null, calf_left_cm: null, calf_right_cm: null,
}
function renderTab(clientId: string, metrics: BodyMetric[]) {
  return render(<MemoryRouter><ClientMetricsTab clientId={clientId} metrics={metrics} /></MemoryRouter>)
}
describe('Mediciones en detalle de cliente', () => {
  it('resume último valor, fecha y cambio sin gráfico y mantiene edición y creación', () => {
    renderTab('a', [{ ...empty, weight_kg: 70.2, sleep_hours: 0 }, { ...empty, id: 'm2', date: '2020-01-03', weight_kg: 70.6, sleep_hours: 8 }])
    const weight = screen.getAllByText('Peso')[0].closest('div') as HTMLElement
    expect(weight).toHaveTextContent('70,6 kg')
    expect(weight).toHaveTextContent('03/01/2020')
    expect(weight).toHaveTextContent('Cambio desde la medición anterior: +0,4 kg')
    expect(screen.getAllByText('Sueño')[0].closest('div')).toHaveTextContent('+8 h')
    expect(screen.queryByRole('combobox', { name: 'Medición' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Cambio observado')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver evolución completa' })).toHaveAttribute('href', '/progress?clientId=a&section=metricas')
    fireEvent.click(screen.getByRole('button', { name: 'Editar métricas del 01/01/2020' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Editar m1')
    fireEvent.click(screen.getByRole('button', { name: 'Añadir métricas' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Crear medición')
  })
  it('usa signo menos real, no convierte ausencias en cero y avisa de que no hay medición anterior', () => {
    renderTab('a', [{ ...empty, weight_kg: 72, waist_cm: 80 }, { ...empty, id: 'm2', date: '2020-01-02', weight_kg: 71.5 }])
    expect(screen.getAllByText('Peso')[0].closest('div')).toHaveTextContent('Cambio desde la medición anterior: −0,5 kg')
    expect(screen.getAllByText('Cintura')[0].closest('div')).toHaveTextContent('Sin medición anterior')
    expect(document.querySelector('dl')).not.toHaveTextContent('Cuello')
  })
  it('el cambio de cliente aísla la selección y el diálogo anterior', () => {
    const { rerender } = renderTab('a', [{ ...empty, weight_kg: 70 }])
    fireEvent.click(screen.getByRole('button', { name: 'Editar métricas del 01/01/2020' }))
    rerender(<MemoryRouter><ClientMetricsTab clientId="b" metrics={[{ ...empty, id: 'b1', weight_kg: 75 }]} /></MemoryRouter>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

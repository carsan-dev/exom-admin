import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MetricsTable } from './metrics-table'

const query = vi.hoisted(() => ({ data: { data: [], page: 1, total: 0, totalPages: 1 }, isLoading: false, isError: false, refetch: vi.fn() }))
vi.mock('../api', () => ({ useClientMetrics: () => query }))
vi.mock('../../clients/components/client-metric-dialog', () => ({ ClientMetricDialog: ({ open }: { open: boolean }) => open ? <div role="dialog">Crear medición</div> : null }))
beforeEach(() => { query.isLoading = false; query.isError = false; query.refetch.mockClear() })
describe('Historial corporal: estados y acciones', () => {
  it('un fallo no se presenta como historial vacío y permite reintentar', () => {
    query.isError = true
    render(<MetricsTable clientId="a" page={1} onPageChange={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el historial')
    expect(screen.queryByText('Sin métricas registradas')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar historial' }))
    expect(query.refetch).toHaveBeenCalledOnce()
  })
  it('distingue carga y vacío, conserva creación y aísla diálogos por cliente', () => {
    query.isLoading = true
    const { rerender } = render(<MetricsTable clientId="a" page={1} onPageChange={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Cargando historial de métricas')
    query.isLoading = false
    rerender(<MetricsTable clientId="a" page={1} onPageChange={vi.fn()} />)
    expect(screen.getByText('Sin métricas registradas')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Añadir métricas' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    rerender(<MetricsTable clientId="b" page={1} onPageChange={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

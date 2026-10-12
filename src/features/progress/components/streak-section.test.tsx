import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ClientStreakCard } from '../../clients/components/client-streak-card'
import { StreakSection } from './streak-section'

const reset = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('../api', () => ({ useResetStreak: () => ({ mutateAsync: reset, isPending: false }) }))
describe('Presentación canónica de racha', () => {
  it('mantiene el reinicio como acción confirmada solo en Progreso', async () => {
    render(<StreakSection clientId="client-a" streak={{ current_days: 0, longest_days: 8, last_active_date: '2020-01-03' }} />)
    expect(screen.getByText('0 días')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar racha' }))
    expect(reset).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toHaveTextContent('No se puede deshacer')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(reset).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar racha' }))
    fireEvent.click(screen.getByRole('button', { name: /^Reiniciar$/ }))
    await waitFor(() => expect(reset).toHaveBeenCalledOnce())
  })
  it('diferencia carga, consulta ausente y racha no registrada', () => {
    const { rerender } = render(<ClientStreakCard streak={undefined} isLoading />)
    expect(screen.queryByText(/Racha no disponible/)).not.toBeInTheDocument()
    rerender(<ClientStreakCard streak={undefined} />)
    expect(screen.getByText(/Racha no disponible/)).toHaveTextContent('No equivale a una racha de cero días')
    rerender(<ClientStreakCard streak={null} />)
    expect(screen.getByText(/todavía no tiene una racha registrada/)).toBeInTheDocument()
  })
  it('no inventa cronología ni causas a partir de los contadores', () => {
    render(<ClientStreakCard streak={{ current_days: 3, longest_days: 8, last_active_date: null }} />)
    expect(screen.getByText('Fecha no disponible')).toBeInTheDocument()
    expect(screen.getByText(/No se dispone del historial de rachas ni de los motivos de interrupción/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reiniciar racha' })).not.toBeInTheDocument()
  })
})

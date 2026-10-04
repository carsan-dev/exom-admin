import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProgressOverviewCards } from './progress-overview-cards'

describe('Resumen semanal', () => {
  it('distingue desconocido de cero y muestra unidades y semana, con acceso a la racha', () => {
    const open = vi.fn()
    render(<ProgressOverviewCards streak={null} weekSummary={{ week_start: '2020-01-06', trainings_assigned: 0, trainings_completed: 0, total_meals: 4, meals_completed: 0 }} onStreakSelect={open} />)
    expect(screen.getByText('Semana del 2020-01-06 al 2020-01-12 · UTC')).toBeInTheDocument()
    expect(screen.getByText('Sin entrenamientos asignados')).toBeInTheDocument()
    expect(screen.getByText('0 de 4 comidas · 0 %')).toBeInTheDocument()
    expect(screen.getByText('Sin racha registrada')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver racha' }))
    expect(open).toHaveBeenCalledOnce()
  })
  it('no muestra ausencias de consulta como ausencia de asignaciones', () => {
    render(<ProgressOverviewCards streak={undefined} weekSummary={undefined} />)
    expect(screen.getByText('Resumen semanal no disponible')).toBeInTheDocument()
    expect(screen.queryByText('Sin entrenamientos asignados')).not.toBeInTheDocument()
  })
})

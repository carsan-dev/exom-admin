import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/lib/api'
import { formatCompletedSet } from '../format-completed-set'
import { DayProgressDetail } from './day-progress-detail'

function renderDetail(progress: React.ComponentProps<typeof DayProgressDetail>['progress']) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DayProgressDetail clientId="client-1" date="2026-06-29" progress={progress} />
    </QueryClientProvider>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('formatCompletedSet', () => {
  it('renders partial and historical set values', () => {
    expect(formatCompletedSet({ set_number: 1, reps: 12 })).toBe('Serie 1 · 12 reps')
    expect(formatCompletedSet({ set_number: 2, weight_kg: 20 })).toBe('Serie 2 · 20 kg')
    expect(formatCompletedSet({ set_number: 2, seconds: 40 })).toBe('Serie 2 · 40s')
    expect(formatCompletedSet({ set_number: 3, reps: 10, weight_kg: 22.5 })).toBe(
      'Serie 3 · 10 reps · 22.5 kg'
    )
  })
})

describe('DayProgressDetail', () => {
  it('shows readable exercise and meal names instead of identifiers', () => {
    renderDetail({
      id: 'progress-1',
      client_id: 'client-1',
      date: '2026-06-29',
      training_completed: true,
      exercises_completed: [
        {
          exercise_id: '503aa784-922f-488e-a01a-c20f625677a0',
          exercise_name: 'Sentadilla goblet',
          completed_at: '2026-06-29T10:00:00.000Z',
          sets: [{ set_number: 1, reps: 12, weight_kg: 20 }],
        },
        {
          exercise_id: 'missing-exercise',
          exercise_name: null,
          completed_at: '2026-06-29T10:05:00.000Z',
        },
      ],
      meals_completed: ['meal-1', 'missing-meal'],
      meals_completed_details: [
        { meal_id: 'meal-1', meal_name: 'Desayuno' },
        { meal_id: 'missing-meal', meal_name: null },
      ],
      notes: null,
      admin_reply_text: null,
      admin_reply_sent_at: null,
    })

    expect(screen.getByText('Sentadilla goblet')).toBeInTheDocument()
    expect(screen.getByText('Desayuno')).toBeInTheDocument()
    expect(screen.getByText('Ejercicio eliminado')).toBeInTheDocument()
    expect(screen.getByText('Comida eliminada')).toBeInTheDocument()
    expect(screen.getByText('Serie 1 · 12 reps · 20 kg')).toBeInTheDocument()
    expect(screen.queryByText('503aa784-922f-488e-a01a-c20f625677a0')).not.toBeInTheDocument()
    expect(screen.queryByText('meal-1')).not.toBeInTheDocument()
  })

  it('shows and updates the reply to the client note', async () => {
    const progress = {
      id: 'progress-1',
      client_id: 'client-1',
      date: '2026-06-29',
      training_completed: true,
      exercises_completed: [],
      meals_completed: [],
      meals_completed_details: [],
      notes: 'Me molestó la rodilla',
      admin_reply_text: 'Reduce el peso',
      admin_reply_sent_at: '2026-06-29T12:00:00.000Z',
    }
    vi.spyOn(api, 'put').mockResolvedValue({ data: { data: progress } })
    renderDetail(progress)

    expect(screen.getByText('Nota del cliente')).toBeInTheDocument()
    expect(screen.getByText('Me molestó la rodilla')).toBeInTheDocument()

    const reply = screen.getByLabelText('Respuesta para el cliente')
    await userEvent.clear(reply)
    await userEvent.type(reply, 'Haz movilidad suave')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/admin/clients/client-1/progress/reply', {
        date: '2026-06-29',
        reply: 'Haz movilidad suave',
      })
    })
  })
})

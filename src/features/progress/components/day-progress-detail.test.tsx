import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/lib/api'
import { formatCompletedSet } from '../format-completed-set'
import { DayProgressDetail } from './day-progress-detail'

function renderDetail(progress: React.ComponentProps<typeof DayProgressDetail>['progress'], date = '2026-06-29') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DayProgressDetail clientId="client-1" date={date} progress={progress} />
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
  it('shows completed activity and notes for the API UTC-midnight date', () => {
    renderDetail({
      id: 'progress-iso',
      client_id: 'client-1',
      date: '2026-06-29T00:00:00.000Z',
      training_completed: true,
      exercises_completed: [{
        exercise_id: 'exercise-1',
        exercise_name: 'Sentadilla goblet',
        completed_at: '2026-06-29T10:00:00.000Z',
        sets: [{ set_number: 1, reps: 12, weight_kg: 20 }],
      }],
      meals_completed: ['meal-1'],
      meals_completed_details: [{ meal_id: 'meal-1', meal_name: 'Desayuno' }],
      notes: 'Me molestó la rodilla',
      admin_reply_text: 'Reduce el peso',
      admin_reply_sent_at: null,
    })

    expect(screen.getByText('Completado')).toBeInTheDocument()
    expect(screen.getByText('Sentadilla goblet')).toBeInTheDocument()
    expect(screen.getByText('Serie 1 · 12 reps · 20 kg')).toBeInTheDocument()
    expect(screen.getByText('Desayuno')).toBeInTheDocument()
    expect(screen.getByText('Me molestó la rodilla')).toBeInTheDocument()
    expect(screen.getByLabelText('Respuesta para el cliente')).toHaveValue('Reduce el peso')
    expect(screen.queryByText('Sin registro de progreso para este día.')).not.toBeInTheDocument()
  })

  it.each([
    ['client-1', '2026-06-28'],
    ['client-1', '2026-06-28T00:00:00.000Z'],
    ['client-other', '2026-06-29'],
    ['client-other', '2026-06-29T00:00:00.000Z'],
    ['client-1', '2026-06-29garbage'],
    ['client-1', '2026-06-29T00:00:00.000Zgarbage'],
    ['client-1', '2026-06-29T00:00:00.000'],
    ['client-1', '2026-06-29T00:00:00.000+02:00'],
    ['client-1', '2026-06-28T23:00:00.000-01:00'],
    ['client-1', '2026-06-29T12:00:00.000Z'],
    ['client-1', '2026-6-29'],
    ['client-1', 'not-a-date'],
    ['client-1', ''],
  ])('rejects mismatched or malformed progress (%s, %s)', (clientId, date) => {
    renderDetail({
      id: 'rejected-progress', client_id: clientId, date, training_completed: true,
      exercises_completed: [], meals_completed: [], meals_completed_details: [],
      notes: 'Nota ajena', admin_reply_text: 'Respuesta ajena', admin_reply_sent_at: null,
    })

    expect(screen.getByText('Sin registro de progreso para este día.')).toBeInTheDocument()
    expect(screen.getByText(/No permite concluir que no hubo actividad/)).toBeInTheDocument()
    expect(screen.queryByText('Completado')).not.toBeInTheDocument()
    expect(screen.queryByText('Nota ajena')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Respuesta para el cliente')).not.toBeInTheDocument()
  })

  it.each(['2026-02-30', '2026-02-30T00:00:00.000Z', '2026-13-01'])('rejects impossible calendar dates (%s)', (date) => {
    renderDetail({
      id: 'invalid-progress', client_id: 'client-1', date, training_completed: true,
      exercises_completed: [], meals_completed: [], meals_completed_details: [],
      notes: 'Nota inválida', admin_reply_text: null, admin_reply_sent_at: null,
    }, '2026-02-30')

    expect(screen.getByText('Sin registro de progreso para este día.')).toBeInTheDocument()
    expect(screen.queryByText('Nota inválida')).not.toBeInTheDocument()
  })

  it('drops an old ISO response when the selected day changes', () => {
    const progress = {
      id: 'progress-old', client_id: 'client-1', date: '2026-06-29T00:00:00.000Z',
      training_completed: true, exercises_completed: [], meals_completed: [], meals_completed_details: [],
      notes: 'Nota anterior', admin_reply_text: 'Respuesta anterior', admin_reply_sent_at: null,
    }
    const queryClient = new QueryClient()
    const view = render(
      <QueryClientProvider client={queryClient}>
        <DayProgressDetail clientId="client-1" date="2026-06-29" progress={progress} />
      </QueryClientProvider>
    )
    expect(screen.getByLabelText('Respuesta para el cliente')).toHaveValue('Respuesta anterior')

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <DayProgressDetail clientId="client-1" date="2026-06-30" progress={progress} />
      </QueryClientProvider>
    )
    expect(screen.getByText('Sin registro de progreso para este día.')).toBeInTheDocument()
    expect(screen.queryByText('Nota anterior')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Respuesta para el cliente')).not.toBeInTheDocument()
  })

  it('no presenta registros de otro cliente o día como el detalle seleccionado', () => {
    renderDetail({ id: 'old', client_id: 'client-other', date: '2026-06-28', training_completed: true,
      exercises_completed: [], meals_completed: [], meals_completed_details: [], notes: 'Nota anterior',
      admin_reply_text: null, admin_reply_sent_at: null })
    expect(screen.queryByText('Nota anterior')).not.toBeInTheDocument()
    expect(screen.getByText('Sin registro de progreso para este día.')).toBeInTheDocument()
  })

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

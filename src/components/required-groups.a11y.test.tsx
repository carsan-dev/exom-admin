import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyWeekDialog } from '@/features/assignments/components/copy-week-dialog'
import { IngredientPicker } from '@/features/diets/components/ingredient-picker'
import { ExerciseRow } from '@/features/trainings/components/exercise-row'
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

/** H-2 / RDS-F5-A11Y-21: obligatorios en grupos compuestos, filas de ejercicio y copia de semana. */
describe('campos obligatorios compuestos', () => {
  it('Tipos de entrenamiento: grupo con descripción «Campo obligatorio» y error conservado', () => {
    withQuery(
      <>
        <span id="tipos-label">Tipos</span>
        <TrainingTypesField
          value={[]}
          onChange={vi.fn()}
          labelId="tipos-label"
          required
          error="Selecciona o crea al menos un tipo"
        />
      </>,
    )

    const group = screen.getByRole('group', { name: 'Tipos' })
    expect(group).toHaveAccessibleDescription(/Selecciona o crea al menos un tipo/)
    expect(group).toHaveAccessibleDescription(/Campo obligatorio/)
  })

  it('Ingredientes: grupo obligatorio con descripción y asterisco junto al título', () => {
    withQuery(<IngredientPicker value={[]} onChange={vi.fn()} required />)

    const group = screen.getByRole('group', { name: 'Ingredientes' })
    expect(group).toHaveAccessibleDescription('Campo obligatorio')
    expect(screen.getByText('Ingredientes').querySelector('[data-required-mark]')).not.toBeNull()
  })

  it('Fila de ejercicio: series y repeticiones obligatorias; RIR opcional sin marca', () => {
    render(
      <ExerciseRow
        item={{
          kind: 'EXERCISE',
          exercise_id: 'exercise-1',
          order: 0,
          sets: 3,
          reps_or_duration: '10',
          measure_type: 'REPS',
          target_value: 10,
          target_value_min: null,
          target_value_max: null,
          target_rir: null,
          timed_config: null,
          rir_override: null,
          request_set_tracking: false,
          rest_seconds: 60,
        }}
        index={0}
        count={1}
        exercise={undefined}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onRemove={vi.fn()}
        onUpdateField={vi.fn()}
        onPrescriptionChange={vi.fn()}
        onTimedChange={vi.fn()}
      />,
    )

    const sets = screen.getByRole('spinbutton', { name: 'Series' })
    expect(sets).toBeRequired()
    expect(screen.getByText('Series').querySelector('[data-required-mark]')).not.toBeNull()

    const reps = screen.getByRole('textbox', { name: 'Repeticiones objetivo' })
    expect(reps).toBeRequired()
    expect(screen.getByText('Repeticiones objetivo').querySelector('[data-required-mark]')).not.toBeNull()

    expect(screen.getByText('RIR objetivo (opcional)').querySelector('[data-required-mark]')).toBeNull()
  })

  it('Copiar semana: ambas fechas obligatorias', () => {
    render(
      <CopyWeekDialog open sourceWeekStart="2026-11-16" onOpenChange={vi.fn()} onSubmit={vi.fn()} />,
    )

    expect(screen.getByLabelText('Semana origen')).toBeRequired()
    expect(screen.getByLabelText('Semana destino')).toBeRequired()
    expect(screen.getByText('Semana destino').querySelector('[data-required-mark]')).not.toBeNull()
  })
})

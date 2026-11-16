import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExerciseFormDialog } from './exercise-form-dialog'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))

vi.mock('../api', () => ({
  getApiErrorMessage: vi.fn(),
  useCreateExercise: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateExercise: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useExerciseMuscleGroups: () => ({ data: [] }),
  useExerciseEquipment: () => ({ data: [] }),
  useDirectUploadFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

/** RDS-F5-A11Y-21: «Grupos musculares» es obligatorio; «Equipamiento» no. */
describe('ExerciseFormDialog grupos obligatorios', () => {
  it('marca «Grupos musculares» con asterisco y descripción oculta sin cambiar su nombre', () => {
    api.get.mockResolvedValue({ data: { data: [] } })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <ExerciseFormDialog open onOpenChange={vi.fn()} exercise={null} />
      </QueryClientProvider>,
    )

    const muscles = screen.getByRole('group', { name: 'Grupos musculares' })
    expect(muscles).toHaveAccessibleDescription('Campo obligatorio')
    expect(screen.getByText('Grupos musculares').querySelector('[data-required-mark]')).not.toBeNull()

    const equipment = screen.getByRole('group', { name: 'Equipamiento' })
    expect(equipment).not.toHaveAttribute('aria-describedby')
    expect(screen.getByText('Equipamiento').querySelector('[data-required-mark]')).toBeNull()
  })
})

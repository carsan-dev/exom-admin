import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AssignmentEditorValues, AutoAssignmentRule, CatalogAvailability, CatalogLoadState } from '../types'
import { AssignmentEditorDialog } from './assignment-editor-dialog'

function loadedCatalog(key: CatalogLoadState['key'], label: string): CatalogLoadState {
  return { key, label, is_loading: false, is_error: false, is_empty: false, has_data: true, error_message: null }
}

const catalogAvailability: CatalogAvailability = {
  trainings: loadedCatalog('trainings', 'Entrenamientos'),
  diets: loadedCatalog('diets', 'Dietas'),
  is_loading: false,
  has_error: false,
  has_empty_catalogs: false,
  can_use_training_catalog: true,
  can_use_diet_catalog: true,
  can_use_any_plan_catalog: true,
  is_rest_only: false,
}

// A legacy rule whose source week starts on a Wednesday: weekday 1 is laid out on a
// Wednesday, so saving the pattern drops weekday 1 and the editor must ask first.
const legacyRule: AutoAssignmentRule = {
  id: 'rule-1',
  client_id: 'client-1',
  admin_id: null,
  source_week_start: '2026-10-07',
  starts_on: '2026-10-14',
  ends_on: null,
  is_active: true,
  deactivated_at: null,
  days: [
    { id: 'day-1', weekday: 1, training_id: null, training_ids: [], diet_id: null, is_rest_day: true, training: null, trainings: [], diet: null },
  ],
}

const QUESTION = 'El nuevo patrón elimina los días 1. ¿Confirmas la actualización?'

const expectedSubmit: AssignmentEditorValues = {
  client_id: 'client-1',
  days: [
    {
      assignment_id: null,
      original_date: '2026-10-07',
      date: '2026-10-07',
      training_id: null,
      training_ids: [],
      training_policies: {},
      training_completion_mode: undefined,
      diet_id: null,
      is_rest_day: true,
    },
  ],
  auto_assignment: {
    enabled: true,
    rule_id: 'rule-1',
    source_week_start: '2026-10-07',
    starts_on: '2026-10-14',
    ends_on: null,
    training_completion_mode: undefined,
  },
}

function mount() {
  const onSubmit = vi.fn<(values: AssignmentEditorValues) => Promise<void>>().mockResolvedValue(undefined)
  const onOpenChange = vi.fn()
  render(
    <AssignmentEditorDialog
      open
      mode="auto-rule"
      clientId="client-1"
      selectedDays={[]}
      availableTrainings={[]}
      availableDiets={[]}
      catalogAvailability={catalogAvailability}
      onOpenChange={onOpenChange}
      onRetryTrainings={vi.fn()}
      onRetryDiets={vi.fn()}
      onSubmit={onSubmit}
      activeAutoRule={legacyRule}
    />,
  )
  return { onSubmit, onOpenChange }
}

describe('AssignmentEditorDialog removed weekdays confirmation', () => {
  it('asks with the exact text and submits the same payload after acceptance', async () => {
    const user = userEvent.setup()
    const { onSubmit, onOpenChange } = mount()

    await user.click(await screen.findByRole('button', { name: 'Guardar patrón' }))
    expect(await screen.findByRole('alertdialog', { name: QUESTION })).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Aceptar' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(expectedSubmit)
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('cancelling submits nothing and keeps the editor open', async () => {
    const user = userEvent.setup()
    const { onSubmit, onOpenChange } = mount()

    await user.click(await screen.findByRole('button', { name: 'Guardar patrón' }))
    await screen.findByRole('alertdialog', { name: QUESTION })
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Editar autoasignación' })).toBeInTheDocument()
  })

  it('a second submit while the question is open does not submit twice', async () => {
    const user = userEvent.setup()
    const { onSubmit } = mount()

    const save = await screen.findByRole('button', { name: 'Guardar patrón' })
    await user.click(save)
    await screen.findByRole('alertdialog', { name: QUESTION })
    save.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Aceptar' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('AssignmentEditorDialog ancho en móvil (RDS-F5-A11Y-22)', () => {
  it('la pista del grid del diálogo puede encogerse por debajo del contenido mínimo', async () => {
    mount()

    const dialog = await screen.findByRole('dialog', { name: 'Editar autoasignación' })
    // Sin minmax(0,1fr) la pista automática crece hasta el min-content de las filas de
    // entrenamiento (nombre sin saltos + selector de 128 px) y el diálogo se desborda a 390 px.
    expect(dialog).toHaveClass('grid-cols-[minmax(0,1fr)]')
  })
})

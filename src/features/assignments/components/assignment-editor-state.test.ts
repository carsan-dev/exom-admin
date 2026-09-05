import { describe, expect, it } from 'vitest'
import type { AssignmentDay, AutoAssignmentRule } from '../types'
import { buildAssignmentEditorDefaults, resolveSelectedTrainings } from './assignment-editor-state'

const selectedDay: AssignmentDay = {
  id: 'assignment-1',
  client_id: 'client-1',
  date: '2026-07-08',
  is_rest_day: false,
  training: {
    id: 'selected-training',
    name: 'Selected training',
    type: 'FUERZA',
    level: 'PRINCIPIANTE',
    estimated_duration_min: 45,
    estimated_calories: 300,
  },
  trainings: [
    {
      id: 'selected-training',
      name: 'Selected training',
      type: 'FUERZA',
      level: 'PRINCIPIANTE',
      estimated_duration_min: 45,
      estimated_calories: 300,
    },
  ],
  diet: null,
}

const activeAutoRule: AutoAssignmentRule = {
  id: 'rule-1',
  client_id: 'client-1',
  admin_id: 'admin-1',
  source_week_start: '2026-07-06',
  starts_on: '2026-07-13',
  ends_on: null,
  is_active: true,
  deactivated_at: null,
  days: [
    {
      id: 'rule-day-1',
      weekday: 1,
      training_id: 'monday-training',
      training_ids: ['monday-training'],
      diet_id: null,
      is_rest_day: false,
      training: null,
      trainings: [],
      diet: null,
    },
    {
      id: 'rule-day-2',
      weekday: 5,
      training_id: null,
      training_ids: [],
      diet_id: null,
      is_rest_day: true,
      training: null,
      trainings: [],
      diet: null,
    },
  ],
}

describe('buildAssignmentEditorDefaults', () => {
  it('keeps only selected dates in selection mode when an auto rule is active', () => {
    const result = buildAssignmentEditorDefaults('selection', [selectedDay], activeAutoRule)

    expect(result.days).toEqual([{
      assignment_id: 'assignment-1',
      original_date: '2026-07-08',
      date: '2026-07-08',
      training_id: 'selected-training',
      training_ids: ['selected-training'],
      training_policies: { 'selected-training': 'AUTO' },
      diet_id: null,
      is_rest_day: false,
    }])
    expect(result.auto_assignment_enabled).toBe(false)
  })

  it('loads every rule weekday only in auto-rule mode', () => {
    const result = buildAssignmentEditorDefaults('auto-rule', [selectedDay], activeAutoRule)

    expect(result.days.map((day) => day.date)).toEqual(['2026-07-06', '2026-07-10'])
    expect(result.days.map((day) => day.assignment_id)).toEqual([null, null])
    expect(result.auto_assignment_enabled).toBe(true)
    expect(result.auto_assignment_end_mode).toBe('indefinite')
  })
})

describe('resolveSelectedTrainings', () => {
  it('keeps a retired assigned training visible so it can be replaced', () => {
    const result = resolveSelectedTrainings(
      ['retired-training', 'active-training'],
      [{
        id: 'active-training',
        name: 'Active training',
        type: 'FUERZA',
        types: ['FUERZA'],
        accentColor: null,
        level: 'PRINCIPIANTE',
        estimated_duration_min: 45,
        estimated_calories: 300,
        exercises_count: 4,
        is_active: true,
      }],
      [{
        id: 'retired-training',
        name: 'Retired training',
        type: 'FUERZA',
        level: 'PRINCIPIANTE',
        estimated_duration_min: 30,
        estimated_calories: 200,
        is_active: false,
      }],
    )

    expect(result.map((training) => [training.id, training.is_active])).toEqual([
      ['retired-training', false],
      ['active-training', true],
    ])
  })
})

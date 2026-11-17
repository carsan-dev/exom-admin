import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { defaultScheduleDraft } from '../template-helpers'
import type { NotificationTemplate } from '../types'
import { ScheduleEditor } from './schedule-editor'

const template: NotificationTemplate = {
  key: 'daily_reminder',
  name: 'Recordatorio diario',
  description: '',
  category: 'reminders',
  title: 'Hola',
  body: 'Cuerpo',
  route: null,
  enabled: true,
  variables: [],
  variable_help: {},
  delivery_info: {
    type: 'schedule',
    label: 'Programada',
    description: '',
    timezone: 'Europe/Madrid',
    times: ['09:00'],
    schedule_enabled: true,
    schedule_kind: 'daily',
  },
  customized: false,
  is_system: true,
  updated_at: null,
}

/** RDS-F5-A11Y-10: por debajo de md la etiqueta cubre la fila (≥ 44 px), como las otras tres casillas. */
describe('ScheduleEditor casilla «Programación activa»', () => {
  it('la etiqueta amplía el área pulsable sobre una fila relativa de 44 px', () => {
    render(
      <ScheduleEditor template={template} draft={defaultScheduleDraft} setDraft={vi.fn()} disabled={false} />,
    )

    const checkbox = screen.getByRole('checkbox', { name: 'Programación activa' })
    const label = screen.getByText('Programación activa')
    expect(label).toHaveClass('max-md:after:absolute', 'max-md:after:inset-0', "max-md:after:content-['']")

    const row = checkbox.parentElement
    expect(row).toHaveClass('relative', 'max-md:min-h-11')
    expect(row).toContainElement(label)
  })
})

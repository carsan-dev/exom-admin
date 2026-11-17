import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ClientMetricDialog } from './client-metric-dialog'
import { CreateAdminDialog } from './create-admin-dialog'
import { EditClientProfileDialog } from './edit-client-profile-dialog'
import { EditUserDialog } from './edit-user-dialog'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  getApiErrorMessage: vi.fn(),
  useCreateAdmin: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateClientProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateClientMetric: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateClientMetric: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

function expectMarked(element: HTMLElement, labelText: string | RegExp) {
  expect(element).toBeRequired()
  expect(screen.getByText(labelText).querySelector('[data-required-mark]')).not.toBeNull()
}

function expectNotMarked(element: HTMLElement, labelText: string | RegExp) {
  expect(element).not.toBeRequired()
  expect(screen.getByText(labelText).querySelector('[data-required-mark]')).toBeNull()
}

/** H-2 / RDS-F5-A11Y-21: los campos que exige el esquema llevan asterisco y aria-required. */
describe('campos obligatorios en diálogos de clientes', () => {
  it('Nuevo admin marca nombre, apellido, email y método de contraseña', () => {
    render(<CreateAdminDialog open onOpenChange={vi.fn()} />)

    expectMarked(screen.getByRole('textbox', { name: 'Nombre' }), 'Nombre')
    expectMarked(screen.getByRole('textbox', { name: 'Apellido' }), 'Apellido')
    expectMarked(screen.getByRole('textbox', { name: 'Email' }), 'Email')
    expectMarked(screen.getByRole('combobox', { name: 'Método de contraseña' }), 'Método de contraseña')
  })

  it('Editar usuario marca nombre, apellido y email', () => {
    render(
      <EditUserDialog
        open
        onOpenChange={vi.fn()}
        user={{
          id: 'user-1',
          email: 'ana@exom.app',
          role: 'CLIENT',
          profile: { first_name: 'Ana', last_name: 'Ruiz' },
        }}
      />,
    )

    expectMarked(screen.getByRole('textbox', { name: 'Nombre' }), 'Nombre')
    expectMarked(screen.getByRole('textbox', { name: 'Apellido' }), 'Apellido')
    expectMarked(screen.getByRole('textbox', { name: 'Email' }), 'Email')
  })

  it('Editar datos del cliente marca nombre, apellido y nivel, pero no el objetivo opcional', () => {
    render(
      <EditClientProfileDialog open onOpenChange={vi.fn()} clientId="client-1" profile={null} />,
    )

    expectMarked(screen.getByRole('textbox', { name: 'Nombre' }), 'Nombre')
    expectMarked(screen.getByRole('textbox', { name: 'Apellido' }), 'Apellido')
    expectMarked(screen.getByRole('combobox', { name: 'Nivel' }), 'Nivel')
    expectNotMarked(screen.getByRole('textbox', { name: 'Objetivo principal' }), 'Objetivo principal')
  })

  it('Métricas marca la fecha y no las medidas opcionales', () => {
    render(<ClientMetricDialog clientId="client-1" metric={null} open onOpenChange={vi.fn()} />)

    expectMarked(screen.getByLabelText(/^Fecha/), /^Fecha/)
    expectNotMarked(screen.getByLabelText('Peso (kg)'), 'Peso (kg)')
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
import { OnboardingPage } from './onboarding-page'

const put = vi.fn()
vi.mock('@/lib/api', () => ({ api: { put: (...args: unknown[]) => put(...args) } }))

const replace = vi.fn()
const originalLocation = window.location

beforeEach(() => {
  put.mockReset()
  replace.mockReset()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, replace },
  })
  useAuth.setState({ user: { id: 'u1', email: 'nerea@example.test', role: 'ADMIN' } } as never)
})

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
})

describe('OnboardingPage (characterization)', () => {
  it('renders heading, email, fields and submit', () => {
    render(<OnboardingPage />)
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(screen.getByText('nerea@example.test')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Apellidos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
  })

  it('shows the validation error when submitting empty', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Nombre y apellidos son obligatorios')).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it('marks the empty fields with aria-invalid linked to the error (RDS-F5-01)', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)
    await user.type(screen.getByLabelText('Nombre'), 'Nerea')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    const lastName = screen.getByLabelText('Apellidos')
    expect(lastName).toHaveAttribute('aria-invalid', 'true')
    expect(lastName).toHaveAccessibleDescription('Nombre y apellidos son obligatorios')
    expect(screen.getByLabelText('Nombre')).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('sets the document title (RDS-F5-01)', () => {
    document.title = 'EXOM Admin'
    render(<OnboardingPage />)
    expect(document.title).toBe('Completar perfil · EXOM Admin')
  })

  it('shows the validation error when a field is only whitespace', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)
    await user.type(screen.getByLabelText('Nombre'), 'Nerea')
    await user.type(screen.getByLabelText('Apellidos'), '   ')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Nombre y apellidos son obligatorios')).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it('submits trimmed values to PUT /profile/me and redirects to /dashboard', async () => {
    put.mockResolvedValue({ data: {} })
    const user = userEvent.setup()
    render(<OnboardingPage />)
    await user.type(screen.getByLabelText('Nombre'), '  Nerea ')
    await user.type(screen.getByLabelText('Apellidos'), ' Blanco Gil ')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'))
    expect(put).toHaveBeenCalledTimes(1)
    expect(put).toHaveBeenCalledWith('/profile/me', { first_name: 'Nerea', last_name: 'Blanco Gil' })
  })

  it('disables the submit button while saving', async () => {
    let resolve: (v: unknown) => void = () => {}
    put.mockReturnValue(new Promise((r) => { resolve = r }))
    const user = userEvent.setup()
    render(<OnboardingPage />)
    await user.type(screen.getByLabelText('Nombre'), 'Nerea')
    await user.type(screen.getByLabelText('Apellidos'), 'Blanco')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('button', { name: 'Guardando...' })).toBeDisabled()
    resolve({ data: {} })
    await waitFor(() => expect(replace).toHaveBeenCalled())
  })

  it('shows the API error, re-enables the button and does not redirect', async () => {
    put.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<OnboardingPage />)
    await user.type(screen.getByLabelText('Nombre'), 'Nerea')
    await user.type(screen.getByLabelText('Apellidos'), 'Blanco')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Error al guardar el perfil. Inténtalo de nuevo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
    expect(replace).not.toHaveBeenCalled()
  })

  it('marks the form as unsaved once typed', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false)
    await user.type(screen.getByLabelText('Nombre'), 'N')
    expect(useUnsavedChangesStore.getState().dirtyEditors['onboarding-form']).toBe(true)
  })
})

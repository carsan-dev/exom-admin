import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
import { OnboardingPage } from './onboarding-page'

const put = vi.fn()
vi.mock('@/lib/api', () => ({ api: { put: (...args: unknown[]) => put(...args) } }))

const logout = vi.fn()

beforeEach(() => {
  put.mockReset()
  logout.mockReset()
  logout.mockResolvedValue(undefined)
  useAuth.setState({
    user: { id: 'u1', email: 'nerea@example.test', role: 'ADMIN' },
    logout,
  } as never)
})

describe('OnboardingPage logout (P16)', () => {
  it('renders a "Cerrar sesión" button', () => {
    render(<OnboardingPage />)
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled()
  })

  it('calls the existing logout once and does not save the profile', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(put).not.toHaveBeenCalled()
  })

  it('works with typed data and keeps the unsaved-changes flag tied to the page lifecycle', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<OnboardingPage />)
    await user.type(screen.getByLabelText('Nombre'), 'Nerea')
    expect(useUnsavedChangesStore.getState().dirtyEditors['onboarding-form']).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(put).not.toHaveBeenCalled()
    unmount()
    expect(useUnsavedChangesStore.getState().dirtyEditors['onboarding-form']).toBeUndefined()
  })
})

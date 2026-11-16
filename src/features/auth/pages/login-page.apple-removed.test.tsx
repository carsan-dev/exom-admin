import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { LoginPage } from './login-page'

const ctx = vi.hoisted(() => ({
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  clearError: vi.fn(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    error: null,
    isLoading: false,
    isAuthenticated: false,
    login: ctx.login,
    loginWithGoogle: ctx.loginWithGoogle,
    clearError: ctx.clearError,
  }),
}))

vi.mock('@/lib/firebase', () => ({ auth: { name: 'test-auth' } }))
vi.mock('firebase/auth', () => ({ sendPasswordResetEmail: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage sin botón de Apple (P16, RDS-F4-17)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no muestra ningún botón ni enlace de Apple', () => {
    renderPage()

    expect(screen.queryByRole('button', { name: /apple/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /apple/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/apple/i)).not.toBeInTheDocument()
  })

  it('mantiene el envío con email y contraseña', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'admin@exom.app')
    await user.type(screen.getByLabelText('Contraseña'), 'secreto1')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => expect(ctx.login).toHaveBeenCalledWith('admin@exom.app', 'secreto1'))
  })

  it('mantiene el botón de Google y su llamada', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Google' }))

    expect(ctx.loginWithGoogle).toHaveBeenCalledTimes(1)
    expect(screen.getByText('O continúa con')).toBeInTheDocument()
  })
})

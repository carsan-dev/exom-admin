import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { LoginPage } from './login-page'

const ctx = vi.hoisted(() => ({
  state: {
    error: null as string | null,
    isLoading: false,
    isAuthenticated: false,
  },
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  clearError: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    ...ctx.state,
    login: ctx.login,
    loginWithGoogle: ctx.loginWithGoogle,
    clearError: ctx.clearError,
  }),
}))

vi.mock('@/lib/firebase', () => ({ auth: { name: 'test-auth' } }))

vi.mock('firebase/auth', () => ({
  sendPasswordResetEmail: (...args: unknown[]) => ctx.sendPasswordResetEmail(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => ctx.toastSuccess(...args),
    error: (...args: unknown[]) => ctx.toastError(...args),
  },
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Pantalla dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage (caracterización)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ctx.state = { error: null, isLoading: false, isAuthenticated: false }
    ctx.sendPasswordResetEmail.mockResolvedValue(undefined)
  })

  it('muestra el encabezado, los campos, el envío, Google y el restablecimiento', () => {
    renderPage()

    expect(screen.getByText('Panel de administración EXOM')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    const email = screen.getByLabelText('Email')
    expect(email).toHaveAttribute('type', 'email')
    expect(email).toHaveAttribute('autocomplete', 'email')
    const password = screen.getByLabelText('Contraseña')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Google' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '¿Has olvidado tu contraseña?' })).toBeInTheDocument()
    expect(screen.getByText('O continúa con')).toBeInTheDocument()
  })

  it('envía email y contraseña escritos al inicio de sesión existente', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'admin@exom.app')
    await user.type(screen.getByLabelText('Contraseña'), 'secreto1')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => expect(ctx.login).toHaveBeenCalledTimes(1))
    expect(ctx.login).toHaveBeenCalledWith('admin@exom.app', 'secreto1')
    expect(ctx.loginWithGoogle).not.toHaveBeenCalled()
  })

  it('valida email y contraseña antes de llamar al inicio de sesión', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'a@b')
    await user.type(screen.getByLabelText('Contraseña'), '123')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText('Email inválido')).toBeInTheDocument()
    expect(screen.getByText('Mínimo 6 caracteres')).toBeInTheDocument()
    expect(ctx.login).not.toHaveBeenCalled()
  })

  it('el botón de Google llama al inicio de sesión con Google', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Google' }))

    expect(ctx.loginWithGoogle).toHaveBeenCalledTimes(1)
    expect(ctx.login).not.toHaveBeenCalled()
  })

  it('el interruptor muestra y oculta la contraseña', async () => {
    const user = userEvent.setup()
    renderPage()
    const password = screen.getByLabelText('Contraseña')

    // El interruptor no tiene nombre accesible hoy: se localiza junto al campo.
    const toggle = password.parentElement?.querySelector('button[type="button"]') ?? null
    expect(toggle).not.toBeNull()
    await user.click(toggle as HTMLElement)
    expect(password).toHaveAttribute('type', 'text')
    await user.click(toggle as HTMLElement)
    expect(password).toHaveAttribute('type', 'password')
  })

  it('restablecer contraseña con email inválido no envía nada', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'roto')
    await user.click(screen.getByRole('button', { name: '¿Has olvidado tu contraseña?' }))

    expect(await screen.findByText('Email inválido')).toBeInTheDocument()
    expect(ctx.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('restablecer contraseña normaliza el email y avisa con el texto genérico', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'Admin@Exom.app')
    await user.click(screen.getByRole('button', { name: '¿Has olvidado tu contraseña?' }))

    await waitFor(() => expect(ctx.sendPasswordResetEmail).toHaveBeenCalledTimes(1))
    expect(ctx.sendPasswordResetEmail).toHaveBeenCalledWith({ name: 'test-auth' }, 'admin@exom.app')
    await waitFor(() =>
      expect(ctx.toastSuccess).toHaveBeenCalledWith(
        'Si el email existe, recibirá un enlace para restablecer la contraseña.',
      ),
    )
    expect(ctx.login).not.toHaveBeenCalled()
  })

  it('restablecer contraseña informa de demasiados intentos y de fallo de red', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Email'), 'admin@exom.app')
    const forgot = screen.getByRole('button', { name: '¿Has olvidado tu contraseña?' })

    ctx.sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/too-many-requests' })
    await user.click(forgot)
    await waitFor(() => expect(ctx.toastError).toHaveBeenCalledWith('Demasiados intentos. Inténtalo más tarde.'))

    ctx.sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/network-request-failed' })
    await user.click(forgot)
    await waitFor(() =>
      expect(ctx.toastError).toHaveBeenCalledWith(
        'No se ha podido solicitar el restablecimiento. Revisa tu conexión e inténtalo de nuevo.',
      ),
    )
  })

  it('restablecer contraseña no revela si el email existe ante otros errores', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Email'), 'admin@exom.app')
    ctx.sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' })

    await user.click(screen.getByRole('button', { name: '¿Has olvidado tu contraseña?' }))

    await waitFor(() =>
      expect(ctx.toastSuccess).toHaveBeenCalledWith(
        'Si el email existe, recibirá un enlace para restablecer la contraseña.',
      ),
    )
    expect(ctx.toastError).not.toHaveBeenCalled()
  })

  it('cuenta bloqueada (423) muestra el estado bloqueado sin formulario', async () => {
    ctx.state.error = 'ACCOUNT_BLOCKED'
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByText('Cuenta bloqueada')).toBeInTheDocument()
    expect(
      screen.getByText('Tu cuenta ha sido desactivada. Contacta con el administrador del sistema.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contactar entrenador' })).toHaveAttribute(
      'href',
      'mailto:soporte@exom.app',
    )
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Google' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(ctx.clearError).toHaveBeenCalledTimes(1)
  })

  it('demasiados intentos (429) muestra el mensaje del servicio junto al formulario', () => {
    ctx.state.error = 'Demasiados intentos. Inténtalo más tarde.'
    renderPage()

    expect(screen.getByText('Demasiados intentos. Inténtalo más tarde.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('credenciales inválidas muestra el error y conserva el formulario', () => {
    ctx.state.error = 'Credenciales inválidas'
    renderPage()

    expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('error UNAUTHORIZED muestra el texto de acceso no autorizado', () => {
    ctx.state.error = 'UNAUTHORIZED'
    renderPage()

    expect(screen.getByText('Acceso no autorizado. Solo administradores pueden entrar.')).toBeInTheDocument()
  })

  it('durante la carga deshabilita Google y muestra el texto de progreso', () => {
    ctx.state.isLoading = true
    renderPage()

    expect(screen.getByRole('button', { name: 'Iniciando sesión...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Google' })).toBeDisabled()
  })

  it('con sesión iniciada redirige a /dashboard', async () => {
    ctx.state.isAuthenticated = true
    renderPage()

    expect(await screen.findByText('Pantalla dashboard')).toBeInTheDocument()
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { LoginPage } from './login-page'

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    error: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    clearError: vi.fn(),
  }),
}))
vi.mock('@/lib/firebase', () => ({ auth: { name: 'test-auth' } }))
vi.mock('firebase/auth', () => ({ sendPasswordResetEmail: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('LoginPage: entrada animada', () => {
  it('renderiza los controles habilitados y editables desde el primer fotograma', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    )

    const email = screen.getByLabelText(/email/i)
    const password = screen.getByLabelText(/^contraseña/i)
    const submit = screen.getByRole('button', { name: 'Iniciar sesión' })
    const forgot = screen.getByRole('button', { name: /has olvidado tu contraseña/i })
    const google = screen.getByRole('button', { name: 'Google' })

    ;[email, password, submit, forgot, google].forEach((el) => expect(el).toBeEnabled())

    // Síncrono a propósito: sin esperas ni timers entre el montaje y la escritura.
    fireEvent.change(email, { target: { value: 'admin@exom.app' } })
    fireEvent.change(password, { target: { value: 'secreto1' } })
    expect(email).toHaveValue('admin@exom.app')
    expect(password).toHaveValue('secreto1')
  })
})

describe('index.css: movimiento reducido', () => {
  // jsdom no evalúa media queries: se comprueba el texto del CSS.
  const css = readFileSync(resolve(__dirname, '../../../index.css'), 'utf-8')
  const animated = Array.from(css.matchAll(/^\.(auth-[a-z-]+)\s*\{[^}]*animation:/gm)).map((m) => m[1])

  it('detecta las clases auth-* animadas', () => {
    expect(animated.length).toBeGreaterThanOrEqual(6)
  })

  it('desactiva cada clase auth-* animada con animation: none', () => {
    const blocks = Array.from(
      css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{\s*((?:\.auth-[^{]*)\{[^}]*\})\s*\}/g),
    )
    expect(blocks.length).toBeGreaterThan(0)
    const block = blocks.map((b) => b[1]).join('\n')
    expect(block).toMatch(/animation:\s*none/)
    animated.forEach((name) => expect(block).toContain(`.${name}`))
  })
})

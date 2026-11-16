import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Header } from './header'

const ctx = vi.hoisted(() => ({
  theme: 'dark' as 'dark' | 'light',
  toggleTheme: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({ theme: ctx.theme, toggle: ctx.toggleTheme }),
}))

vi.mock('@/hooks/use-auth', () => {
  const user = {
    role: 'ADMIN',
    email: 'lucia@example.com',
    profile: { first_name: 'Lucía', last_name: 'Marín', avatar_url: null },
  }
  return {
    useAuth: (selector?: (state: { user: typeof user }) => unknown) =>
      selector ? selector({ user }) : { user, logout: ctx.logout },
  }
})

vi.mock('@/features/clients/api', () => ({
  useClientProfile: () => ({ data: undefined }),
}))

function renderHeader(route = '/clients/abc', onMenuToggle = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <Header onMenuToggle={onMenuToggle} />
    </MemoryRouter>,
  )
  return onMenuToggle
}

describe('Header', () => {
  beforeEach(() => {
    ctx.theme = 'dark'
    ctx.toggleTheme.mockClear()
    ctx.logout.mockClear()
  })

  it('la hamburguesa tiene nombre accesible y llama a onMenuToggle', async () => {
    const onMenuToggle = renderHeader()

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar u ocultar el menú' }))

    expect(onMenuToggle).toHaveBeenCalledTimes(1)
  })

  it('el boton de tema ofrece tema claro cuando el activo es oscuro', async () => {
    renderHeader()

    const button = screen.getByRole('button', { name: 'Cambiar a tema claro' })
    expect(button).toHaveAttribute('title', 'Cambiar tema')
    await userEvent.click(button)
    expect(ctx.toggleTheme).toHaveBeenCalledTimes(1)
  })

  it('el boton de tema ofrece tema oscuro cuando el activo es claro', () => {
    ctx.theme = 'light'
    renderHeader()

    expect(screen.getByRole('button', { name: 'Cambiar a tema oscuro' })).toBeInTheDocument()
  })

  it('el menu de usuario incluye el nombre y Cerrar sesion llama a logout', async () => {
    renderHeader()

    await userEvent.click(screen.getByRole('button', { name: 'Menú de usuario: Lucía Marín' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }))

    expect(ctx.logout).toHaveBeenCalledTimes(1)
  })

  it('las migas son una nav nombrada con enlaces y la ultima con aria-current', () => {
    renderHeader('/clients/abc')

    const nav = screen.getByRole('navigation', { name: 'Migas de pan' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/clients')
    const current = screen.getByText('Detalle')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current.closest('a')).toBeNull()
  })
})

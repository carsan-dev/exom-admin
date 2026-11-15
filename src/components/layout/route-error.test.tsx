import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { RouteError } from './route-error'

const RAW = 'fallo-interno-secreto-123'

function renderFailing(element: React.ReactElement, failure: 'lazy' | 'loader' = 'lazy') {
  const route =
    failure === 'lazy'
      ? { path: '/', lazy: async () => { throw new Error(RAW) }, errorElement: element }
      : { path: '/', loader: () => { throw new Error(RAW) }, element: <div />, errorElement: element }
  const router = createMemoryRouter([route], { initialEntries: ['/'] })
  render(<RouterProvider router={router} />)
}

describe('RouteError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('pinta alerta, Reintentar y enlace al Dashboard cuando falla un lazy', async () => {
    renderFailing(<RouteError />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'No se pudo cargar la página' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al Dashboard' })).toHaveAttribute('href', '/dashboard')
  })

  it('también cubre un loader que lanza', async () => {
    renderFailing(<RouteError />, 'loader')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('variante de login: el enlace secundario va a /login', async () => {
    renderFailing(<RouteError homeHref="/login" homeLabel="Ir al inicio de sesión" />)

    expect(await screen.findByRole('link', { name: 'Ir al inicio de sesión' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('link', { name: 'Ir al Dashboard' })).not.toBeInTheDocument()
  })

  it('Reintentar recarga la página', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    renderFailing(<RouteError />)

    ;(await screen.findByRole('button', { name: 'Reintentar' })).click()

    expect(reload).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it('no muestra el mensaje crudo fuera de DEV', async () => {
    vi.stubEnv('DEV', false)
    renderFailing(<RouteError />)

    await screen.findByRole('alert')
    expect(screen.queryByText(RAW)).not.toBeInTheDocument()
  })

  it('muestra el mensaje crudo solo en DEV', async () => {
    vi.stubEnv('DEV', true)
    renderFailing(<RouteError />)

    expect(await screen.findByText(RAW)).toBeInTheDocument()
  })

  it('una respuesta 404 de ruta muestra el contenido de la 404', async () => {
    const router = createMemoryRouter(
      [{ path: '/', element: <div />, errorElement: <RouteError />, children: [] }],
      { initialEntries: ['/nada'] },
    )
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al Dashboard' })).toHaveAttribute('href', '/dashboard')
  })
})

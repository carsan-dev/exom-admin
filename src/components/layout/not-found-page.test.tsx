import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { NotFoundPage } from './not-found-page'

function TestLayout() {
  return (
    <div>
      <nav aria-label="Barra de prueba">layout visible</nav>
      <Outlet />
    </div>
  )
}

function renderAt(path: string, initial: string[] = [path]) {
  const router = createMemoryRouter(
    [
      {
        element: <TestLayout />,
        children: [
          { path: 'dashboard', element: <h1>Dashboard de prueba</h1> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
    { initialEntries: initial, initialIndex: initial.length - 1 },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('NotFoundPage', () => {
  it('muestra la 404 dentro del layout para una URL desconocida', () => {
    renderAt('/no-existe')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeInTheDocument()
    expect(screen.getByLabelText('Barra de prueba')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al Dashboard' })).toHaveAttribute('href', '/dashboard')
  })

  it('«Volver» retrocede en el historial', async () => {
    const router = renderAt('/no-existe', ['/dashboard', '/no-existe'])

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))

    expect(router.state.location.pathname).toBe('/dashboard')
  })

  it('«Volver» sin historial previo navega al inicio', async () => {
    const router = renderAt('/no-existe')

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))

    expect(router.state.location.pathname).toBe('/dashboard')
  })
})

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MobileTabbar } from './mobile-tabbar'
import { Sidebar } from './sidebar'
import type { PendingCounts } from './use-pending-counts'

vi.mock('@/hooks/use-auth', () => ({
  useAuth: (selector: (s: { user: { role: string } }) => unknown) =>
    selector({ user: { role: 'ADMIN' } }),
}))

vi.mock('@/features/approval-requests/api', () => ({
  useApprovalStats: () => ({ data: undefined }),
}))

const COUNTS: PendingCounts = { feedback: 5, recaps: 2 }
const EMPTY: PendingCounts = { feedback: null, recaps: null }

function renderSidebar(counts: PendingCounts | undefined, isOpen = true) {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <Sidebar isOpen={isOpen} pendingCounts={counts} />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

function renderTabbar(counts: PendingCounts | undefined) {
  return render(
    <MemoryRouter>
      <MobileTabbar pendingCounts={counts} />
    </MemoryRouter>,
  )
}

function badge(link: HTMLElement, text: string) {
  return within(link).getByLabelText(text)
}

describe('contadores de Feedback y Recaps', () => {
  it('sidebar muestra los chips con nombre accesible, también para ADMIN', () => {
    renderSidebar(COUNTS)

    expect(badge(screen.getByRole('link', { name: /Feedback/ }), '5 pendientes')).toBeInTheDocument()
    expect(badge(screen.getByRole('link', { name: /Recaps/ }), '2 pendientes')).toBeInTheDocument()
    expect(
      within(screen.getByRole('link', { name: 'Dashboard' })).queryByText(/\d/),
    ).not.toBeInTheDocument()
  })

  it('sidebar en carril conserva el contador y lo añade al tooltip', async () => {
    renderSidebar(COUNTS, false)

    const link = screen.getByRole('link', { name: /Feedback/ })
    const dot = badge(link, '5 pendientes')
    expect(dot).toHaveClass('size-1.5', 'rounded-full')
    expect(dot).toBeEmptyDOMElement()
    await userEvent.hover(link)
    expect((await screen.findAllByText('Feedback (5)')).length).toBeGreaterThan(0)
  })

  it('sidebar oculta el contador con null o sin prop', () => {
    const { unmount } = renderSidebar(EMPTY)
    expect(screen.queryByLabelText(/pendientes/)).not.toBeInTheDocument()
    unmount()
    renderSidebar(undefined)
    expect(screen.queryByLabelText(/pendientes/)).not.toBeInTheDocument()
  })

  it('la barra inferior muestra el distintivo en Feedback y Recaps', () => {
    renderTabbar(COUNTS)

    const nav = screen.getByRole('navigation', { name: 'Navegación inferior' })
    expect(badge(within(nav).getByRole('link', { name: /Feedback/ }), '5 pendientes')).toBeInTheDocument()
    expect(badge(within(nav).getByRole('link', { name: /Recaps/ }), '2 pendientes')).toBeInTheDocument()
    expect(
      within(within(nav).getByRole('link', { name: 'Dashboard' })).queryByText(/\d/),
    ).not.toBeInTheDocument()
  })

  it('el panel Más muestra los chips en las filas de Feedback y Recaps', async () => {
    renderTabbar(COUNTS)
    await userEvent.click(screen.getByRole('button', { name: 'Más' }))

    const dialog = await screen.findByRole('dialog', { name: 'Menú' })
    expect(badge(within(dialog).getByRole('link', { name: /Feedback/ }), '5 pendientes')).toBeInTheDocument()
    expect(badge(within(dialog).getByRole('link', { name: /Recaps/ }), '2 pendientes')).toBeInTheDocument()
  })

  it('la barra y el panel ocultan el contador con null o sin prop', async () => {
    const { unmount } = renderTabbar(EMPTY)
    await userEvent.click(screen.getByRole('button', { name: 'Más' }))
    await screen.findByRole('dialog', { name: 'Menú' })
    expect(screen.queryByLabelText(/pendientes/)).not.toBeInTheDocument()
    unmount()
    renderTabbar(undefined)
    expect(screen.queryByLabelText(/pendientes/)).not.toBeInTheDocument()
  })
})

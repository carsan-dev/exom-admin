import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from '@/components/layout/app-layout'
import { Tabs } from '@/components/ui/tabs'
import { LoginPage } from '@/features/auth/pages/login-page'
import { CatalogTabsToolbar } from '@/features/badges/components/catalog-tabs-toolbar'
import { CreateClientDialog } from '@/features/clients/components/create-client-dialog'
import { CreateTemplateDialog } from '@/features/notification-templates/components/create-template-dialog'
import { TrainingTypesField } from '@/features/trainings/components/training-types-field'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/lib/firebase', () => ({ auth: { name: 'test-auth' } }))
vi.mock('firebase/auth', () => ({ sendPasswordResetEmail: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const authState = {
  user: { id: 'admin', role: 'ADMIN' },
  error: null,
  isLoading: false,
  isAuthenticated: false,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  clearError: vi.fn(),
}

vi.mock('@/hooks/use-auth', () => ({
  useAuth: (selector?: (state: typeof authState) => unknown) => (selector ? selector(authState) : authState),
}))

vi.mock('@/features/approval-requests/api', () => ({
  useApprovalStats: () => ({ data: undefined }),
}))

vi.mock('@/components/layout/use-pending-counts', () => ({
  usePendingCounts: () => ({ feedback: null, recaps: null }),
}))

beforeEach(() => {
  api.get.mockReset()
  api.get.mockResolvedValue({ data: { data: [] } })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      media: query,
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  })
})

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
})

function mount(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Un svg queda expuesto si no está oculto ni tiene nombre propio como imagen (RDS-F5-A11Y-13). */
function exposedIcons(): string[] {
  return Array.from(document.body.querySelectorAll('svg'))
    .filter((svg) => {
      if (svg.closest('[aria-hidden="true"]')) return false
      const named = svg.getAttribute('role') === 'img' && Boolean(svg.getAttribute('aria-label'))
      return !named
    })
    .map((svg) => svg.getAttribute('class') ?? svg.outerHTML.slice(0, 80))
}

describe('guardia de iconos decorativos (RDS-F5-A11Y-13)', () => {
  it('lucide-react no oculta sus iconos por defecto: la guardia detecta uno sin aria-hidden', () => {
    render(<Plus className="size-4" />)
    expect(exposedIcons()).toEqual(['lucide lucide-plus size-4'])
  })

  it('un icono con role="img" y aria-label cuenta como nombrado', () => {
    render(<Plus role="img" aria-label="Añadir" />)
    expect(exposedIcons()).toEqual([])
  })

  it.each<[string, () => ReactNode]>([
    ['layout con navegación', () => <AppLayout />],
    ['inicio de sesión', () => <LoginPage />],
    ['diálogo de nuevo cliente', () => <CreateClientDialog open onOpenChange={vi.fn()} />],
    ['diálogo de nueva plantilla', () => <CreateTemplateDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />],
    [
      'catálogo y tipos de entrenamiento',
      () => (
        <Tabs value="muscle-groups">
          <CatalogTabsToolbar search="" onSearchChange={vi.fn()} catalogTitle="Grupos musculares" />
          <TrainingTypesField value={['Fuerza']} onChange={vi.fn()} />
        </Tabs>
      ),
    ],
  ])('%s: ningún svg queda expuesto sin aria-hidden ni nombre', (_name, ui) => {
    mount(ui())
    expect(document.body.querySelectorAll('svg').length).toBeGreaterThan(0)
    expect(exposedIcons()).toEqual([])
  })
})

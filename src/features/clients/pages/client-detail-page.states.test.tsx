import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { ClientDetailPage } from './client-detail-page'

const state = vi.hoisted(() => ({
  profile: { data: undefined as unknown, isLoading: false, isError: false, error: undefined as unknown, refetch: vi.fn() },
}))

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(() => new Promise(() => undefined)), put: vi.fn(), post: vi.fn() } }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'staff', role: 'ADMIN' }, isAuthenticated: true, isLoading: false })) }
})
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  useClientProfile: () => state.profile,
  getApiErrorStatus: (error: unknown) => (error as { status?: number } | undefined)?.status,
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}))
vi.mock('../components/client-adherence-tab', () => ({ ClientAdherenceTab: () => <p>Adherencia montada</p> }))
vi.mock('../components/client-streak-card', () => ({ ClientStreakCard: () => <p>Racha montada</p> }))
vi.mock('../components/client-assigned-admins-card', () => ({ ClientAssignedAdminsCard: () => null }))

const metric = {
  id: 'm1', date: '2026-10-01', created_at: '2026-10-01', weight_kg: 70, muscle_mass_kg: null, height_cm: null, sleep_hours: null,
  neck_cm: null, shoulders_cm: null, chest_cm: null, arm_left_cm: null, arm_right_cm: null, forearm_left_cm: null,
  forearm_right_cm: null, waist_cm: null, hips_cm: null, thigh_left_cm: null, thigh_right_cm: null, calf_left_cm: null, calf_right_cm: null,
}
const client = {
  id: 'c1', email: 'ana@example.invalid', role: 'CLIENT', is_active: true, is_locked: false, created_at: '2026-02-02T10:00:00Z',
  profile: {
    id: 'p1', user_id: 'c1', first_name: 'Ana', last_name: 'Pérez', avatar_url: null, level: 'INTERMEDIO', main_goal: 'Ganar fuerza',
    muscle_mass_goal: null, target_calories: null, current_weight: 70, height: 170, birth_date: null,
    created_at: '2026-02-02T10:00:00Z', updated_at: '2026-02-02T10:00:00Z',
  },
  bodyMetrics: [metric], streak: null,
}

function view(entry: string) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[entry]}><Routes>
      <Route path="/clients/:id" element={<ClientDetailPage />} />
    </Routes></MemoryRouter>
  </QueryClientProvider>)
}

function selectedTab() {
  return screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true')?.textContent
}

beforeEach(() => {
  useAuth.setState({ user: { id: 'staff', role: 'ADMIN' } } as never)
  state.profile = { data: client, isLoading: false, isError: false, error: undefined, refetch: vi.fn() }
})

describe('detalle de cliente: ?tab= y diálogos', () => {
  it('renderiza cabecera, perfil y cuatro pestañas', () => {
    view('/clients/c1')
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Pérez' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    expect(selectedTab()).toBe('Info general')
    expect(screen.getByRole('heading', { name: 'Objetivo principal' })).toBeInTheDocument()
  })

  it.each([
    ['info', 'Info general'], ['metrics', 'Métricas'], ['streak', 'Racha'], ['adherence', 'Adherencia'],
  ])('?tab=%s selecciona %s', (value, label) => {
    view(`/clients/c1?tab=${value}`)
    expect(selectedTab()).toBe(label)
  })

  it('un valor desconocido cae en Info general', () => {
    view('/clients/c1?tab=nope')
    expect(selectedTab()).toBe('Info general')
  })

  it('abre el diálogo de métricas', () => {
    view('/clients/c1?tab=metrics')
    fireEvent.click(screen.getAllByRole('button', { name: 'Añadir métricas' })[0])
    expect(screen.getByRole('dialog', { name: 'Añadir métricas' })).toBeInTheDocument()
    expect(screen.getByText('Registra medidas del cliente. Campos sin valor quedarán vacíos.')).toBeInTheDocument()
  })

  it('abre el diálogo de perfil', () => {
    view('/clients/c1')
    fireEvent.click(screen.getByRole('button', { name: 'Editar datos' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('perfil ausente muestra el vacío con la acción de añadir datos', () => {
    state.profile = { ...state.profile, data: { ...client, profile: null } }
    view('/clients/c1')
    expect(screen.getByText('Este cliente todavía no tiene datos de perfil ampliados.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Añadir datos' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('detalle de cliente: estados de error', () => {
  function fail(status: number) {
    state.profile = { data: undefined, isLoading: false, isError: true, error: { status }, refetch: vi.fn() }
  }

  it('403 de ADMIN: texto exacto y solo volver', () => {
    fail(403)
    view('/clients/c1')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Cliente no asignado')).toBeInTheDocument()
    expect(screen.getByText('Solo puedes abrir perfiles de clientes asignados a tu cuenta. Vuelve al listado para revisar tu cartera actual.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a clientes' })).toHaveAttribute('href', '/clients')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('403 de SUPER_ADMIN: texto distinto y volver a usuarios', () => {
    useAuth.setState({ user: { id: 'staff', role: 'SUPER_ADMIN' } } as never)
    fail(403)
    view('/clients/c1')
    expect(screen.getByText('No tienes permisos para abrir este perfil desde tu sesión actual.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a usuarios' })).toBeInTheDocument()
  })

  it('404: texto exacto y solo volver', () => {
    fail(404)
    view('/clients/c1')
    expect(screen.getByText('Cliente no encontrado')).toBeInTheDocument()
    expect(screen.getByText('No hemos encontrado el cliente solicitado o este enlace ya no corresponde a un perfil de cliente.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a clientes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('500: texto exacto, volver y reintentar', () => {
    fail(500)
    view('/clients/c1')
    expect(screen.getByText('Error del servidor')).toBeInTheDocument()
    expect(screen.getByText('El servidor no ha podido cargar el perfil del cliente. Inténtalo de nuevo en unos segundos.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a clientes' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(state.profile.refetch).toHaveBeenCalledTimes(1)
  })
})

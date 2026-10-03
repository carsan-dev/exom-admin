import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ClientDetailPage } from './client-detail-page'

const shared = vi.hoisted(() => ({ get: vi.fn(() => new Promise(() => undefined)), put: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: shared }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'staff', role: 'ADMIN' }, isAuthenticated: true, isLoading: false })) }
})
vi.mock('../api', () => ({
  useClientProfile: (id: string) => ({ data: { id, is_locked: false, is_active: true, profile: {}, bodyMetrics: [], streak: {} }, isLoading: false }),
  getApiErrorStatus: () => undefined, getApiErrorMessage: () => '',
}))
vi.mock('../components/client-header', () => ({ ClientHeader: () => <h1>Cliente sintético</h1> }))
vi.mock('../components/client-info-tab', () => ({ ClientInfoTab: () => <p>Información preservada</p> }))
vi.mock('../components/client-metrics-tab', () => ({ ClientMetricsTab: () => <p>Métricas preservadas</p> }))
vi.mock('../components/client-streak-card', () => ({ ClientStreakCard: () => <p>Racha preservada</p> }))
vi.mock('../components/client-assigned-admins-card', () => ({ ClientAssignedAdminsCard: () => null }))
vi.mock('../components/change-role-dialog', () => ({ ChangeRoleDialog: () => null }))
vi.mock('../components/manage-client-assignments-dialog', () => ({ ManageClientAssignmentsDialog: () => null }))
vi.mock('../components/toggle-user-status-dialog', () => ({ ToggleUserStatusDialog: () => null }))
vi.mock('../components/unlock-dialog', () => ({ UnlockDialog: () => null }))
describe('ruta real de detalle de cliente', () => {
  it('restaura el periodo UTC del enlace sin usar un rango de otro cliente', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/clients/client-linked?adherence_start=2020-01-01&adherence_end=2020-01-31']}><Routes>
        <Route path="/clients/:id" element={<ClientDetailPage />} />
      </Routes></MemoryRouter>
    </QueryClientProvider>)
    const tab = screen.getByRole('tab', { name: 'Adherencia' })
    fireEvent.mouseDown(tab, { button: 0, ctrlKey: false })
    fireEvent.click(tab)
    await waitFor(() => expect(shared.get).toHaveBeenCalledWith('/admin/clients/client-linked/adherence', expect.objectContaining({ params: { start: '2020-01-01', end: '2020-01-31' } })))
  })
  it('monta Adherencia junto a las pestañas existentes y usa el cliente de la ruta', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/clients/client-route']}><Routes>
        <Route path="/clients/:id" element={<ClientDetailPage />} />
      </Routes></MemoryRouter>
    </QueryClientProvider>)
    expect(screen.getByRole('tab', { name: 'Info general' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Métricas' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Racha' })).toBeInTheDocument()
    const tab = screen.getByRole('tab', { name: 'Adherencia' })
    fireEvent.mouseDown(tab, { button: 0, ctrlKey: false })
    fireEvent.click(tab)
    await waitFor(() => expect(shared.get).toHaveBeenCalledWith('/admin/clients/client-route/adherence', expect.objectContaining({ params: expect.objectContaining({ start: expect.any(String), end: expect.any(String) }) })))
    expect(screen.getByLabelText('Desde (UTC)')).toBeInTheDocument()
  })
})

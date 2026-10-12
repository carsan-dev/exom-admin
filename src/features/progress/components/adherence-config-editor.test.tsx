import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
import type { AdherenceConfig } from '../types'
import { AdherenceConfigEditor } from './adherence-config-editor'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn() } }))
const response = (data: unknown) => ({ data: { success: true, data, timestamp: '' } })
const policy: AdherenceConfig = {
  known: true, source: 'revision', effective_date: '2027-01-02', version: 7,
  steps_goal: null, calorie_lower_percent: 10, calorie_upper_percent: 15,
  protein_min_percent: 90, steps_min_percent: 80, low_global_percent: 75,
}
const forbidden = (status: number) => Object.assign(new Error('request failed'), { isAxiosError: true, response: { status } })
function mount(clientId = 'client-a') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const ui = (id: string) => <QueryClientProvider client={queryClient}><AdherenceConfigEditor clientId={id} /></QueryClientProvider>
  const view = render(ui(clientId))
  return { ...view, rerenderClient: (id: string) => view.rerender(ui(id)) }
}

beforeEach(() => {
  vi.mocked(api.get).mockReset()
  vi.mocked(api.put).mockReset()
  vi.setSystemTime(new Date('2027-01-01T23:59:00Z'))
  useAuth.setState({ user: { id: 'admin-a', email: 'admin@example.test', role: 'ADMIN', profile: null }, isAuthenticated: true, isLoading: false })
  useUnsavedChangesStore.setState({ dirtyEditors: {}, hasUnsavedChanges: false })
})
afterEach(() => { vi.useRealTimers() })

describe('AdherenceConfigEditor', () => {
  it('loads the selected UTC tomorrow and sends exact GET version and nullable opt-out', async () => {
    vi.mocked(api.get).mockResolvedValue(response(policy))
    vi.mocked(api.put).mockResolvedValue(response({ ...policy, version: 8 }))
    mount()
    expect(await screen.findByLabelText('Fecha de vigencia (UTC)')).toHaveValue('2027-01-02')
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence/config', expect.objectContaining({ params: { date: '2027-01-02' } })))
    const user = userEvent.setup()
    await user.clear(await screen.findByLabelText('Calorías: límite inferior (%)'))
    await user.type(screen.getByLabelText('Calorías: límite inferior (%)'), '12')
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/clients/client-a/adherence/config', {
      effective_date: '2027-01-02', expected_version: 7, steps_goal: null,
      calorie_lower_percent: 12, calorie_upper_percent: 15, protein_min_percent: 90,
      steps_min_percent: 80, low_global_percent: 75,
    }))
    expect(await screen.findByText('Configuración guardada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeEnabled()
  })

  it('never fabricates fields or enables save for an uncaptured baseline', async () => {
    vi.mocked(api.get).mockResolvedValue(response({ known: false, source: 'uncaptured', effective_date: null, version: 0 }))
    mount()
    expect(await screen.findByText('configuración histórica no capturada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeDisabled()
    expect(screen.queryByLabelText('Meta de pasos')).not.toBeInTheDocument()
  })

  it('validates integer bounds and the nullable steps goal before sending', async () => {
    vi.mocked(api.get).mockResolvedValue(response(policy))
    mount()
    const user = userEvent.setup()
    const steps = await screen.findByLabelText('Meta de pasos')
    await user.type(steps, '0')
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeDisabled()
    await user.clear(steps)
    await user.type(steps, '5000')
    const protein = screen.getByLabelText('Proteínas: mínimo (%)')
    await user.clear(protein)
    await user.type(protein, '201')
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeDisabled()
    await user.clear(protein)
    await user.type(protein, '90')
    await user.clear(screen.getByLabelText('Calorías: límite superior (%)'))
    await user.type(screen.getByLabelText('Calorías: límite superior (%)'), '1.5')
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeDisabled()
    expect(api.put).not.toHaveBeenCalled()
  })

  it('retains the draft on authoritative 409 without retrying, and offers reload', async () => {
    vi.mocked(api.get).mockResolvedValue(response(policy))
    vi.mocked(api.put).mockRejectedValue(forbidden(409))
    mount()
    const user = userEvent.setup()
    const lower = await screen.findByLabelText('Calorías: límite inferior (%)')
    await user.clear(lower); await user.type(lower, '12')
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }))
    expect(await screen.findByText(/conflicto/i)).toBeInTheDocument()
    expect(lower).toHaveValue(12)
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Recargar configuración' }))
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
  })

  it.each([403, 404, 500])('shows a retryable %i read error without a write', async (status) => {
    let fail = true
    vi.mocked(api.get).mockImplementation(() => fail ? Promise.reject(forbidden(status)) : Promise.resolve(response(policy)))
    mount()
    expect(await screen.findByRole('alert', {}, { timeout: 6000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeDisabled()
    expect(api.put).not.toHaveBeenCalled()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByLabelText('Meta de pasos')).toBeInTheDocument()
  })

  it('hides the old client during a pending new fetch and never applies the old response', async () => {
    let resolveB: ((value: ReturnType<typeof response>) => void) | undefined
    vi.mocked(api.get).mockResolvedValueOnce(response(policy)).mockImplementationOnce(() => new Promise((resolve) => { resolveB = resolve }))
    const view = mount()
    expect(await screen.findByLabelText('Meta de pasos')).toBeInTheDocument()
    view.rerenderClient('client-b')
    expect(screen.queryByLabelText('Meta de pasos')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeDisabled()
    await act(async () => { resolveB?.(response({ ...policy, version: 9 })); await Promise.resolve() })
    expect(await screen.findByLabelText('Meta de pasos')).toBeInTheDocument()
  })

  it('rejects a now-closed UTC date after midnight rather than submitting it', async () => {
    vi.mocked(api.get).mockResolvedValue(response(policy))
    mount()
    expect(await screen.findByLabelText('Meta de pasos')).toBeInTheDocument()
    act(() => vi.setSystemTime(new Date('2027-01-02T00:01:00Z')))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }))
    expect(api.put).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent(/fecha futura/i)
  })

  it('requires explicit discard before changing date and keeps the draft when cancelled', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(response(policy)).mockResolvedValueOnce(response({ ...policy, version: 11 }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mount()
    const user = userEvent.setup()
    const lower = await screen.findByLabelText('Calorías: límite inferior (%)')
    await user.clear(lower); await user.type(lower, '12')
    const date = screen.getByLabelText('Fecha de vigencia (UTC)')
    fireEvent.change(date, { target: { value: '2027-01-03' } })
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/descartar|perder/i))
    expect(date).toHaveValue('2027-01-02')
    expect(lower).toHaveValue(12)
    expect(api.get).toHaveBeenCalledTimes(1)
    confirm.mockReturnValue(true)
    fireEvent.change(date, { target: { value: '2027-01-03' } })
    expect(date).toHaveValue('2027-01-03')
    expect(await screen.findByLabelText('Calorías: límite inferior (%)')).toHaveValue(10)
    confirm.mockRestore()
  })

  it('isolates draft and version when changing effective date', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(response(policy)).mockResolvedValueOnce(response({ ...policy, version: 11 }))
    vi.mocked(api.put).mockResolvedValue(response({ ...policy, version: 12 }))
    mount()
    const user = userEvent.setup()
    const lower = await screen.findByLabelText('Calorías: límite inferior (%)')
    await user.clear(lower); await user.type(lower, '12')
    const date = screen.getByLabelText('Fecha de vigencia (UTC)')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.change(date, { target: { value: '2027-01-03' } })
    expect(await screen.findByLabelText('Calorías: límite inferior (%)')).toHaveValue(10)
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/clients/client-a/adherence/config', expect.objectContaining({
      effective_date: '2027-01-03', expected_version: 11, calorie_lower_percent: 10,
    })))
  })

  it('registers only real edits with the navigation guard and clears on save and unmount', async () => {
    vi.mocked(api.get).mockResolvedValue(response(policy))
    vi.mocked(api.put).mockResolvedValue(response({ ...policy, calorie_lower_percent: 12, version: 8 }))
    const view = mount()
    const user = userEvent.setup()
    const lower = await screen.findByLabelText('Calorías: límite inferior (%)')
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false)
    await user.clear(lower); await user.type(lower, '12')
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }))
    await screen.findByText('Configuración guardada')
    await waitFor(() => expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false))
    await user.clear(lower); await user.type(lower, '13')
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)
    view.unmount()
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false)
  })

  it('does not save with an unvalidated session', async () => {
    vi.mocked(api.get).mockResolvedValue(response(policy))
    mount()
    expect(await screen.findByLabelText('Meta de pasos')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Meta de pasos'), '5000')
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)
    act(() => useAuth.setState({ user: null, isAuthenticated: false, isLoading: true }))
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false)
    expect(screen.queryByLabelText('Meta de pasos')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar configuración' })).toBeDisabled()
  })
})

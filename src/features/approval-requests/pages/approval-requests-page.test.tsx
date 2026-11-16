import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import type { ApprovalRequest, ApprovalRequestDetail, SuperAdminApprovalRequestDetail } from '../types'
import { ApprovalRequestsPage } from './approval-requests-page'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'super' } })) }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const CREATED_AT = new Date(2026, 10, 15, 18, 42).toISOString()

const listItem: ApprovalRequest = {
  id: 'req-1',
  requester_id: 'admin-1',
  reviewer_id: null,
  action_type: 'training.update',
  resource_type: 'training',
  resource_id: 'training-1',
  request_reason: 'Ajuste de volumen',
  status: 'PENDING',
  rejection_reason: null,
  failure_reason: null,
  resolved_at: null,
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
  requester: { id: 'admin-1', email: 'admin@example.invalid', profile: { first_name: 'Ada', last_name: 'Admin' } },
  reviewer: null,
  resource_name: 'Entreno sintético',
  resource_deleted: false,
  payload: {},
  current_resource: null,
}

const detail: SuperAdminApprovalRequestDetail = {
  ...listItem,
  resource_name: 'Entreno sintético',
  resource_deleted: false,
  payload: {
    name: 'Nuevo nombre',
    is_global: true,
    deadline: null,
    tags: ['pecho', 'espalda'],
    exercises: [{ exercise_id: 'e1', sets: 4 }],
    starts_at: new Date(2026, 10, 20, 9, 5).toISOString(),
    clave_sin_traduccion: 'valor tal cual',
  },
  current_resource: {
    name: 'Nombre actual',
    is_global: false,
    deadline: '',
    tags: ['pecho'],
    exercises: [],
  },
}

const envelope = (data: unknown) => ({ data: { data } })
const page = (items: ApprovalRequest[]) => envelope({ data: items, total: items.length, page: 1, limit: 20, totalPages: 1 })

let listItems: ApprovalRequest[] = []
let listError = false

function mockApi() {
  api.get.mockImplementation(async (url: string) => {
    if (url === '/approval-requests' || url === '/approval-requests/my') {
      if (listError) throw Object.assign(new AxiosError('boom'), { response: { status: 400 } })
      return page(listItems)
    }
    if (url === '/approval-requests/req-1') return envelope(detail as ApprovalRequestDetail)
    return envelope({})
  })
  api.put.mockResolvedValue(envelope({ ...detail, status: 'REJECTED' }))
}

function mount(entry = '/approval-requests') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <ApprovalRequestsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  api.get.mockReset()
  api.put.mockReset()
  listItems = [listItem]
  listError = false
  useAuth.setState({ user: { id: 'super', email: 'super@example.invalid', role: 'SUPER_ADMIN', profile: null } })
  mockApi()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ApprovalRequestsPage', () => {
  it('muestra cabecera, filtros y la lista con estado y tipo', async () => {
    mount()

    expect(screen.getByRole('heading', { level: 1, name: 'Solicitudes' })).toBeInTheDocument()
    expect(screen.getByText('Control')).toBeInTheDocument()
    expect(await screen.findByText('Modificar entrenamiento')).toBeInTheDocument()
    expect(screen.getByText('Entreno sintético')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver detalle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pendientes' })).toHaveAttribute('aria-pressed', 'true')
    for (const label of ['Aprobadas', 'Rechazadas', 'Fallidas', 'Todas']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('muestra el estado vacío', async () => {
    listItems = []
    mount()

    expect(await screen.findByText('No hay solicitudes que coincidan con los filtros actuales.')).toBeInTheDocument()
  })

  it('muestra el error de carga con reintento', async () => {
    listError = true
    mount()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('respeta status y resourceType de la URL al pedir los datos', async () => {
    mount('/approval-requests?status=REJECTED&resourceType=diet')

    await screen.findByText('Modificar entrenamiento')
    expect(screen.getByRole('button', { name: 'Rechazadas' })).toHaveAttribute('aria-pressed', 'true')
    expect(api.get).toHaveBeenCalledWith('/approval-requests', {
      params: { page: 1, limit: 20, status: 'REJECTED', resource_type: 'diet' },
    })
  })

  it('muestra el banner de pendientes solo a un ADMIN', async () => {
    useAuth.setState({ user: { id: 'admin-1', email: 'admin@example.invalid', role: 'ADMIN', profile: null } })
    mount()

    expect(await screen.findByText('Tienes 1 solicitud pendiente de aprobación')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver solicitudes' })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/approval-requests/my', expect.anything())
    expect(api.get).not.toHaveBeenCalledWith('/approval-requests', expect.anything())
  })

  it('no muestra el banner a un SUPER_ADMIN', async () => {
    mount()

    await screen.findByText('Modificar entrenamiento')
    expect(screen.queryByText(/pendiente de aprobación/)).not.toBeInTheDocument()
  })

  it('P3: muestra la fecha absoluta en un time junto a la relativa', async () => {
    mount()

    await screen.findByText('Modificar entrenamiento')
    const time = document.querySelector('time')
    expect(time).not.toBeNull()
    expect(time).toHaveTextContent('15/11/2026 18:42')
    expect(time).toHaveAttribute('dateTime', CREATED_AT)
    expect(time?.parentElement?.textContent).toMatch(/(hace|dentro de)/)
  })
})

describe('ApprovalDetailDialog en la página', () => {
  async function openDetail() {
    const user = userEvent.setup()
    mount()
    await user.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    const dialog = await screen.findByRole('dialog', { name: 'Detalle de solicitud' })
    await within(dialog).findByText('Campo')
    return { user, dialog }
  }

  it('P2: traduce los campos conocidos y deja las claves desconocidas tal cual', async () => {
    const { dialog } = await openDetail()

    expect(within(dialog).getByText('Nombre')).toBeInTheDocument()
    expect(within(dialog).getByText('Global')).toBeInTheDocument()
    expect(within(dialog).getByText('Etiquetas')).toBeInTheDocument()
    expect(within(dialog).getByText('clave_sin_traduccion')).toBeInTheDocument()
    expect(within(dialog).getByText('valor tal cual')).toBeInTheDocument()
  })

  it('P2: formatea booleanos, nulos, fechas, listas y objetos', async () => {
    const { dialog } = await openDetail()

    expect(within(dialog).getByText('Sí')).toBeInTheDocument()
    expect(within(dialog).getByText('No')).toBeInTheDocument()
    expect(within(dialog).getAllByText('—').length).toBeGreaterThanOrEqual(2)
    expect(within(dialog).getByText('20/11/2026 09:05')).toBeInTheDocument()
    expect(within(dialog).getByText('pecho, espalda')).toBeInTheDocument()
    expect(within(dialog).getByText('1 elemento')).toBeInTheDocument()
    expect(within(dialog).queryByText(/"exercise_id"/)).not.toBeVisible()
  })

  it('P2: Datos técnicos arranca cerrado y contiene el JSON completo al abrirse', async () => {
    const { user, dialog } = await openDetail()

    const details = dialog.querySelector('details')
    expect(details).not.toBeNull()
    expect(details).not.toHaveAttribute('open')

    await user.click(within(dialog).getByText('Datos técnicos'))
    expect(details).toHaveAttribute('open')
    const blocks = [...dialog.querySelectorAll('details pre')].map((pre) => pre.textContent)
    expect(JSON.parse(blocks[1] ?? '')).toEqual(detail.payload)
    expect(JSON.parse(blocks[0] ?? '')).toEqual(detail.current_resource)
  })

  it('P3: el detalle muestra la fecha absoluta junto a la relativa', async () => {
    const { dialog } = await openDetail()

    const times = dialog.querySelectorAll('time')
    expect(times.length).toBeGreaterThanOrEqual(1)
    expect(times[0]).toHaveTextContent('15/11/2026 18:42')
    expect(times[0]).toHaveAttribute('dateTime', CREATED_AT)
  })

  it('rechazo: un motivo de 9 caracteres no se envía y uno de 10 sí', async () => {
    const { user, dialog } = await openDetail()

    await user.click(within(dialog).getByRole('button', { name: 'Rechazar' }))
    const reason = within(dialog).getByLabelText('Motivo de rechazo')

    await user.type(reason, '123456789')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar rechazo' }))
    expect(api.put).not.toHaveBeenCalled()

    await user.type(reason, '0')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar rechazo' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
    expect(api.put).toHaveBeenCalledWith('/approval-requests/req-1/resolve', {
      action: 'reject',
      rejection_reason: '1234567890',
    })
  })
})

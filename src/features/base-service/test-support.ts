import { AxiosError, AxiosHeaders } from 'axios'
import type { Mock } from 'vitest'
import type { BaseDelivery, BaseRoute, BaseSubscriber } from './types'

export type ApiMock = Record<'get' | 'post' | 'put' | 'patch', Mock>

export const BASE_URL = '/admin/base-service'

export const routes: BaseRoute[] = [
  {
    objetivo: 'perder-grasa',
    dias: [3, 4],
    months: [1],
    monthsByDias: [
      { dias: 3, months: [1, 2] },
      { dias: 4, months: [1] },
    ],
  },
  {
    objetivo: 'ganar-fuerza',
    dias: [5],
    months: [1, 2],
    monthsByDias: [{ dias: 5, months: [1, 2] }],
  },
]

export function makeSubscriber(overrides: Partial<BaseSubscriber> = {}): BaseSubscriber {
  return {
    id: 's1',
    order_code: 'EXB-000001',
    name: 'Ana Pérez',
    email: 'ana@example.com',
    goal: 'perder-grasa',
    days_per_week: 3,
    notes: null,
    is_archived: false,
    archived_at: null,
    created_by_id: null,
    created_at: '2026-11-01T10:00:00.000Z',
    updated_at: '2026-11-01T10:00:00.000Z',
    last_sent_month: null,
    next_month: 1,
    latest_delivery: null,
    ...overrides,
  }
}

export function makeDelivery(overrides: Partial<BaseDelivery> = {}): BaseDelivery {
  return {
    id: 'd1',
    subscriber_id: 's1',
    month: 1,
    status: 'SENT',
    send_seq: 1,
    snapshot_name: 'Ana Pérez',
    snapshot_email: 'ana@example.com',
    snapshot_goal: 'perder-grasa',
    snapshot_days_per_week: 3,
    snapshot_order_code: 'EXB-000001',
    files: [{ filename: 'EXOM_Entrenamiento_Bloque-01.pdf', source_key: 'k', source_sha256: 'a', sha256: 'b', size: 10 }],
    requested_by_id: null,
    requested_at: '2026-11-02T10:00:00.000Z',
    sent_at: '2026-11-02T10:01:00.000Z',
    provider_message_id: null,
    last_error: null,
    created_at: '2026-11-02T10:00:00.000Z',
    updated_at: '2026-11-02T10:01:00.000Z',
    sends: [
      { send_seq: 1, status: 'SENT', requested_by_id: null, requested_at: '2026-11-02T10:00:00.000Z', sent_at: '2026-11-02T10:01:00.000Z', provider_message_id: null, error: null, attempts: 1, snapshot_name: 'Ana Pérez', snapshot_email: 'ana@example.com', possibly_delivered: false },
    ],
    possibly_delivered: false,
    ...overrides,
  }
}

export function envelope<T>(data: T) {
  return { data: { success: true, data, timestamp: '2026-11-14T10:00:00.000Z' } }
}

export function axiosError(status: number, body: { message: string | string[]; code?: string }) {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { statusCode: status, ...body },
  })
}

export interface FakeBackend {
  subscribers: BaseSubscriber[]
  deliveries: Record<string, BaseDelivery[]>
  routes: BaseRoute[]
}

/** Wires GET handlers onto the mocked axios instance, reading the (mutable) backend state on every call. */
export function installBackend(api: ApiMock, backend: FakeBackend) {
  api.get.mockImplementation(async (url: string, options?: { params?: { archive?: string; q?: string } }) => {
    if (url === `${BASE_URL}/routes`) return envelope(backend.routes)
    if (url === `${BASE_URL}/subscribers`) {
      const archive = options?.params?.archive ?? 'visible'
      const data = backend.subscribers.filter((item) =>
        archive === 'all' ? true : archive === 'archived' ? item.is_archived : !item.is_archived,
      )
      return envelope({ data, total: data.length, page: 1, limit: 20, totalPages: 1 })
    }
    const deliveriesMatch = /^\/admin\/base-service\/subscribers\/([^/]+)\/deliveries$/.exec(url)
    if (deliveriesMatch) return envelope(backend.deliveries[deliveriesMatch[1]] ?? [])
    const detailMatch = /^\/admin\/base-service\/subscribers\/([^/]+)$/.exec(url)
    if (detailMatch) {
      const found = backend.subscribers.find((item) => item.id === detailMatch[1])
      if (found) return envelope(found)
    }
    throw axiosError(404, { message: 'No encontrado', code: 'SUBSCRIBER_NOT_FOUND' })
  })
}

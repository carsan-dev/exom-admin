import axios, { AxiosError } from 'axios'
import { NOW_ISO, type FixtureCtx, type Handler, type Json } from './fx-util'
import { dashboardData, handlePeople } from './fx-people'
import { handleCatalog } from './fx-catalog'
import { handleAssignments } from './fx-assignments'
import { handleProgress } from './fx-progress'
import { handleFeedbackRecaps } from './fx-feedback-recaps'
import { handleEngagement } from './fx-engagement'

// Transporte sintético: sin red, sin Firebase. Las lecturas se responden desde los fixtures,
// las mutaciones devuelven éxito genérico sin cambiar estado y las rutas desconocidas dan 404 (con aviso en consola).
export const fixtureCalls: FixtureCtx[] = []

const handlers: Handler[] = [
  ({ path, method }) => (method === 'get' && path === '/dashboard' ? dashboardData() : undefined),
  handlePeople,
  handleCatalog,
  handleAssignments,
  handleProgress,
  handleFeedbackRecaps,
  handleEngagement,
]

function envelope(config: unknown, data: unknown, status = 200) {
  return { data: { success: true, data, timestamp: NOW_ISO }, status, statusText: 'Synthetic', headers: {}, config }
}

export const api = axios.create({ adapter: async (config) => {
  const path = config.url ?? ''
  const method = (config.method ?? 'get').toLowerCase()
  const params = (config.params ?? {}) as Record<string, unknown>
  const body: Json = typeof config.data === 'string' && config.data ? JSON.parse(config.data) as Json : {}
  const ctx: FixtureCtx = { method, path, params, body }
  fixtureCalls.push(ctx)
  if (method !== 'get') return envelope(config, { message: 'ok (fixture)', success: true }) as never
  for (const handler of handlers) {
    const result = handler(ctx)
    if (result !== undefined) return envelope(config, result) as never
  }
  console.warn(`[fixture-api] 404 ${method.toUpperCase()} ${path} ${JSON.stringify(params)}`)
  throw new AxiosError(`Unsupported synthetic route: ${method} ${path}`, 'FIXTURE', config, undefined,
    { ...(envelope(config, null) as object), status: 404, data: { message: `Unsupported synthetic route: ${method} ${path}`, statusCode: 404 } } as never)
} })

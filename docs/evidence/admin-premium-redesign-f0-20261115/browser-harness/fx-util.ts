// Utilidades compartidas por los fixtures. Todos los datos son inventados (@example.com).
export const TODAY = '2026-11-15'
export const NOW_ISO = '2026-11-15T10:00:00.000Z'
export type Json = Record<string, unknown>

export interface FixtureCtx {
  method: string
  path: string
  params: Record<string, unknown>
  body: Json
}

/** Un handler devuelve los datos (sin sobre) o undefined si la ruta no es suya. */
export type Handler = (ctx: FixtureCtx) => unknown

export const uuid = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`

/** Fecha ISO (YYYY-MM-DD) relativa a hoy; negativo = pasado. */
export function daysFromToday(delta: number) {
  return new Date(Date.parse(`${TODAY}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10)
}
export const addDays = (date: string, delta: number) => new Date(Date.parse(`${date}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10)
export const isoAt = (delta: number, time = '09:30:00') => `${daysFromToday(delta)}T${time}.000Z`

export function paginate<T>(items: T[], params: Record<string, unknown>, defaultLimit = 10) {
  const limit = Math.max(1, Number(params.limit ?? defaultLimit))
  const page = Math.max(1, Number(params.page ?? 1))
  const total = items.length
  return { data: items.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) }
}

export const list = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : value === undefined || value === null || value === '' ? [] : [String(value)])
export const has = (haystack: string | null | undefined, needle: unknown) => !needle || (haystack ?? '').toLowerCase().includes(String(needle).toLowerCase())

/** Imagen SVG en línea (data URI): nunca se pide nada remoto. */
export function svgImage(label: string, hue: number, width = 640, height = 400) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,38%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},50%,22%)"/></linearGradient></defs>`
    + `<rect width="100%" height="100%" fill="url(#g)"/><circle cx="${width * 0.5}" cy="${height * 0.42}" r="${Math.min(width, height) * 0.16}" fill="rgba(255,255,255,0.18)"/>`
    + `<text x="50%" y="${height * 0.82}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(height / 12)}" fill="rgba(255,255,255,0.8)">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
export const avatar = (initials: string, hue: number) => svgImage(initials, hue, 160, 160)

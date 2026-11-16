// Primer módulo que se evalúa: reloj sintético y banderas del arnés (rol, tema, sesión).
// Las banderas llegan por query (?__role=ADMIN|SUPER_ADMIN, ?__theme=dark|light, ?__auth=none|noprofile)
// y se conservan en sessionStorage porque la SPA reescribe la query al navegar.

// "Hoy" sintético: domingo 2026-11-15 (UTC), el tiempo sigue avanzando.
const RealDate = Date
const offset = RealDate.parse('2026-11-15T10:00:00Z') - RealDate.now()
class SyntheticDate extends RealDate {
  constructor(...args: [] | [number | string | Date] | ConstructorParameters<typeof Date>) {
    if (args.length === 0) super(RealDate.now() + offset)
    else super(...(args as ConstructorParameters<typeof Date>))
  }
  static now() { return RealDate.now() + offset }
}
window.Date = SyntheticDate as DateConstructor

export type HarnessRole = 'ADMIN' | 'SUPER_ADMIN'
export type HarnessAuth = 'session' | 'none' | 'noprofile'

const STORE_KEY = 'exom-harness-flags'
const query = new URLSearchParams(window.location.search)
const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? '{}') as Record<string, string>
for (const key of ['__role', '__theme', '__auth']) {
  const value = query.get(key)
  if (value) saved[key] = value
}
sessionStorage.setItem(STORE_KEY, JSON.stringify(saved))

export const harnessRole: HarnessRole = saved.__role === 'ADMIN' ? 'ADMIN' : 'SUPER_ADMIN'
export const harnessAuth: HarnessAuth = saved.__auth === 'none' || saved.__auth === 'noprofile' ? saved.__auth : 'session'
if (saved.__theme === 'light' || saved.__theme === 'dark') localStorage.setItem('exom-admin-theme', saved.__theme)

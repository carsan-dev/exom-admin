'use strict'
// Capturas del estado actual de exom-admin con Chrome headless, un proceso cada vez (nunca en paralelo).
// Requiere el servidor del arnés en 127.0.0.1:5192 (ver README.md).
// Uso: node capture.cjs [--only <regex>] [--list] [--log <fichero>] [--chrome <ruta>] [--out <carpeta>]
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const args = process.argv.slice(2)
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback }
const CHROME = opt('--chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe')
const OUT = path.resolve(opt('--out', path.join(__dirname, '..', 'capturas-base')))
const LOG = opt('--log', path.join(os.tmpdir(), 'exom-harness-capture.log'))
const ONLY = opt('--only') ? new RegExp(opt('--only')) : null
const BASE = 'http://127.0.0.1:5192'

const C1 = 'c11e0000-0000-4000-8000-000000000001' // cliente protagonista
const RECAP = '7ec00000-0000-4000-8000-000000000001' // recap completo (detalle)

// tall: además de 1440x900, captura 1440x2400. mobile: también a 390 (dark, SUPER_ADMIN).
// roles: ['SUPER_ADMIN'] por defecto; añadir 'ADMIN' para las rutas que dependen del rol.
const R = (id, url, extra = {}) => ({ id, url, roles: ['SUPER_ADMIN'], ...extra })
const ROUTES = [
  R('login', '/login', { auth: 'none', noLight: false }),
  R('onboarding', '/onboarding', { auth: 'noprofile' }),
  R('dashboard', '/dashboard', { tall: true, mobile: true }),
  R('clients', '/clients', { roles: ['ADMIN'], tall: true, mobile: true, lightRoles: ['ADMIN'] }),
  R('users', '/users', { tall: true }),
  R('users-admins', '/users?tab=admins', { tall: true }),
  R('users-super-admins', '/users?tab=super-admins'),
  R('client-info', `/users/${C1}?tab=info`, { roles: ['SUPER_ADMIN', 'ADMIN'], tall: true, mobile: true, urlFor: { ADMIN: `/clients/${C1}?tab=info` } }),
  R('client-metrics', `/users/${C1}?tab=metrics`, { roles: ['SUPER_ADMIN', 'ADMIN'], tall: true, urlFor: { ADMIN: `/clients/${C1}?tab=metrics` } }),
  R('client-streak', `/users/${C1}?tab=streak`, { roles: ['SUPER_ADMIN', 'ADMIN'], urlFor: { ADMIN: `/clients/${C1}?tab=streak` } }),
  R('client-adherence', `/users/${C1}?tab=adherence`, { roles: ['SUPER_ADMIN', 'ADMIN'], tall: true, urlFor: { ADMIN: `/clients/${C1}?tab=adherence` } }),
  R('exercises', '/exercises', { tall: true }),
  R('trainings', '/trainings', { tall: true }),
  R('badges', '/badges', { tall: true }),
  R('ingredients', '/ingredients', { tall: true }),
  R('diets', '/diets', { tall: true }),
  R('assignments-week', `/assignments?clientId=${C1}&view=week&date=2026-11-16`, { tall: true, mobile: true }),
  R('assignments-month', `/assignments?clientId=${C1}&view=month&date=2026-11-16`, { tall: true }),
  ...['dashboard', 'resumen', 'metricas', 'fotos', 'entrenamiento', 'adherencia', 'racha', 'seguimiento'].map((section) =>
    R(`progress-${section}`, `/progress?clientId=${C1}&section=${section}`, { tall: true, mobile: section === 'dashboard' })),
  R('feedback', '/feedback', { tall: true, mobile: true }),
  R('recaps', '/recaps', { tall: true, mobile: true }),
  R('recap-detail', `/recaps/${RECAP}`, { tall: true, mobile: true }),
  R('challenges', '/challenges', { tall: true }),
  R('achievements', '/achievements', { roles: ['SUPER_ADMIN', 'ADMIN'], tall: true }),
  R('notifications', '/notifications', { tall: true }),
  R('notification-templates', '/notification-templates', { roles: ['SUPER_ADMIN', 'ADMIN'], tall: true }),
  R('approval-requests', '/approval-requests', { roles: ['SUPER_ADMIN', 'ADMIN'], tall: true, mobile: true }),
]

const jobs = []
for (const route of ROUTES) {
  const lightRoles = route.lightRoles ?? ['SUPER_ADMIN']
  for (const role of route.roles) {
    // Las rutas solo de ADMIN (/clients) no se capturan como SUPER_ADMIN: allí el listado es /users.
    const urlPath = route.urlFor?.[role] ?? route.url
    const base = { route, role, urlPath }
    jobs.push({ ...base, theme: 'dark', width: 1440, height: 900 })
    if (route.tall) jobs.push({ ...base, theme: 'dark', width: 1440, height: 2400, tag: '1440x2400' })
    if (lightRoles.includes(role)) jobs.push({ ...base, theme: 'light', width: 1440, height: 900 })
    if (route.mobile && role === (route.roles[0])) jobs.push({ ...base, theme: 'dark', width: 390, height: 844, mobile: true })
  }
}
const nameOf = (job) => `${job.route.id}-${job.role === 'ADMIN' ? 'admin' : 'superadmin'}-${job.theme}-${job.tag ?? job.width}.png`

const selected = jobs.filter((job) => !ONLY || ONLY.test(nameOf(job)))
if (args.includes('--list')) { console.log(selected.map(nameOf).join('\n')); console.log(`total: ${selected.length}`); process.exit(0) }

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(LOG, '')
const flagQuery = (job) => `__role=${job.role}&__theme=${job.theme}${job.route.auth ? `&__auth=${job.route.auth}` : ''}`
const withFlags = (job) => `${job.urlPath}${job.urlPath.includes('?') ? '&' : '?'}${flagQuery(job)}`

let ok = 0
const failed = []
for (const job of selected) {
  const file = path.join(OUT, nameOf(job))
  // Chrome headless en Windows no baja de ~500 px de ancho: a 390 se carga la app en un iframe de 390 px
  // dentro de wrapper.html (ventana de 500 px, la página envolvente escala el iframe para llenar la ventana).
  const url = job.mobile
    ? `${BASE}/wrapper.html?w=390&h=${job.height}&src=${encodeURIComponent(withFlags(job))}`
    : `${BASE}${withFlags(job)}`
  const winW = job.mobile ? 500 : job.width
  const winH = job.mobile ? Math.round(job.height * (500 / 390)) : job.height
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'exom-harness-profile-'))
  fs.rmSync(file, { force: true })
  const run = spawnSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--virtual-time-budget=8000',
    '--no-first-run', '--disable-extensions', '--enable-logging=stderr', '--v=0', `--user-data-dir=${profile}`,
    `--screenshot=${file}`, `--window-size=${winW},${winH}`, url,
  ], { encoding: 'utf8', timeout: 90_000 })
  fs.rmSync(profile, { recursive: true, force: true })
  const lines = `${run.stderr ?? ''}`.split(/\r?\n/).filter((line) => /CONSOLE/.test(line) && /(fixture-api|Error|error|Uncaught|Warning: )/.test(line))
  fs.appendFileSync(LOG, `## ${nameOf(job)}\n${lines.map((line) => `   ${line.slice(0, 300)}`).join('\n')}\n`)
  if (fs.existsSync(file)) { ok++; console.log(`ok   ${nameOf(job)}${lines.length ? `  (${lines.length} console)` : ''}`) } else { failed.push(nameOf(job)); console.log(`FAIL ${nameOf(job)}`) }
}
console.log(`capturas: ${ok}/${selected.length}; fallidas: ${failed.length}; log: ${LOG}`)
process.exit(failed.length ? 1 : 0)

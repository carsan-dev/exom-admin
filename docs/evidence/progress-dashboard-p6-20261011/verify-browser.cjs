'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const origin = 'http://127.0.0.1:5189';
const ids = { a: '11111111-1111-4111-8111-111111111111', b: '22222222-2222-4222-8222-222222222222' };
const output = path.join(__dirname, 'browser-output');
const results = [];
const activated = process.argv.includes('--activated');
const canonicalCases = [];
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'browser/summary-cases.json'))).digest('hex'), '474f667eda623200619fc7ef279bef0819d99ffabc46309221702a26fa3ff584');
const summaryCases = JSON.parse(fs.readFileSync(path.join(__dirname, 'browser/summary-cases.json'), 'utf8'));
const sourceHashes = Object.fromEntries(['src/features/progress/pages/progress-page.tsx', 'src/features/progress/components/progress-dashboard.tsx', 'src/features/progress/components/metric-visual.tsx', 'src/features/progress/follow-up-tasks/next-task-summary.tsx', 'src/features/progress/follow-up-tasks/follow-up-panel.tsx', 'src/features/progress/types.ts', 'docs/evidence/progress-dashboard-p6-20261011/browser/summary-cases.json'].map((file) => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
fs.mkdirSync(output, { recursive: true });
let browser;
function allowed(raw, websocket = false) {
  try { const url = new URL(raw); return url.hostname === '127.0.0.1' && url.port === '5189' && url.protocol === (websocket ? 'ws:' : 'http:') && (websocket ? url.pathname === '/' : !/^\/(api|admin)(\/|$)/.test(url.pathname)); } catch { return false; }
}
function scrub(value) { return String(value).split(root).join('[admin-workspace]').replaceAll(path.dirname(root), '[coordination-workspace]'); }
async function control(page, action, argument) {
  return page.evaluate(({ action, argument }) => window.__dashboardFixture[action](argument), { action, argument });
}
async function ready(page) { await page.getByRole('region', { name: 'Próximos pasos', exact: true }).getByText('Próxima tarea', { exact: true }).waitFor(); }
async function overflow(page) {
  const sizes = await page.evaluate(() => ({ document: [document.documentElement.scrollWidth, innerWidth], main: [document.querySelector('main').scrollWidth, document.querySelector('main').clientWidth] }));
  for (const [name, size] of Object.entries(sizes)) assert.ok(size[0] <= size[1] + 1, `${name} horizontal overflow ${size}`);
}
async function run(name, scenario, viewport, theme, body, screenshot = false, extra = '') {
  const context = await browser.newContext({ viewport, colorScheme: theme, serviceWorkers: 'block' });
  const escapes = []; const errors = [];
  await context.route('**/*', async (route) => { const url = route.request().url(); if (!allowed(url)) { escapes.push(new URL(url).origin + new URL(url).pathname); await route.abort(); } else await route.continue(); });
  if (!context.routeWebSocket) throw new Error('WebSocket fence unavailable');
  await context.routeWebSocket('**/*', (socket) => { if (!allowed(socket.url(), true)) { escapes.push(socket.url()); socket.close(); } else socket.connectToServer(); });
  await context.addInitScript((theme) => {
    localStorage.setItem('exom-admin-theme', theme);
    const RealDate = Date;
    window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-10-11T12:00:00Z'])); } static now() { return new RealDate('2026-10-11T12:00:00Z').getTime(); } };
  }, theme);
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on('pageerror', (error) => errors.push(error.message));
  const record = { name, scenario, viewport, theme, status: 'RUNNING', escapes, errors };
  results.push(record);
  try {
    await page.goto(`${origin}/progress?clientId=${ids.a}&section=dashboard&period=3m&date=2099-01-01&scenario=${scenario}${extra}`);
    if (screenshot) {
      await ready(page);
      await page.getByRole('img', { name: /^Peso, kg/ }).waitFor();
      fs.writeFileSync(path.join(output, `${name}-dom.txt`), await page.locator('main').innerText());
      await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
    }
    await body(page);
    assert.deepEqual(escapes, [], 'Network escape'); assert.deepEqual(errors, [], 'Browser errors');
    record.status = 'PASS';
  } catch (error) { record.status = 'FAIL'; record.error = scrub(error.stack || error); }
  finally { await context.close(); }
}
async function main() {
  const modulePath = require.resolve(path.resolve(root, '../docs/evidence/metrics-p1-20260916/browser-tools/node_modules/playwright'));
  const { chromium } = require(modulePath);
  const executable = path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe');
  assert.ok(fs.existsSync(executable), 'Installed Chrome missing; no download');
  const browserEnv = { ...process.env, TMP: path.join(output, 'runtime'), TEMP: path.join(output, 'runtime') };
  fs.mkdirSync(browserEnv.TMP, { recursive: true });
  browser = await chromium.launch({ executablePath: executable, headless: true, env: browserEnv, args: ['--disable-background-networking', '--disable-component-update', '--disable-breakpad', '--disable-crash-reporter', '--no-first-run'] });
  const desktop = { width: 1440, height: 900 }; const mobile = { width: 390, height: 844 };
  for (const [label, viewport] of [['desktop', desktop], ['mobile', mobile]]) for (const theme of ['light', 'dark']) {
    await run(`${label}-${theme}`, 'data', viewport, theme, async (page) => {
      await ready(page); await overflow(page);
      const status = page.getByRole('region', { name: 'Estado y cobertura' });
      await status.getByText('82 kg', { exact: true }).waitFor();
      assert.equal(await status.getByText('-8 kg', { exact: true }).count(), 1);
      assert.equal(await status.getByText('3 / 7', { exact: true }).count(), 1);
      const box = await status.boundingBox(); assert.ok(box.y < viewport.height, 'Status hidden below first viewport');
      const alerts = page.getByRole('region', { name: 'Alertas importantes' });
      await alerts.getByText('Baja adherencia global', { exact: true }).waitFor();
      assert.equal(await alerts.getByText(/2099|2026-10-12/).count(), 0);
      await page.getByRole('link', { name: 'Ver adherencia', exact: true }).click();
      const range = new URL(page.url()).searchParams;
      assert.equal(range.get('adherence_start'), '2026-09-12'); assert.equal(range.get('adherence_end'), '2026-10-11'); assert.equal(range.get('period'), '3m');
      await page.getByRole('region', { name: 'Periodo cerrado', exact: true }).waitFor();
      await page.getByRole('tab', { name: 'Dashboard', exact: true }).click(); await ready(page);
      await page.getByRole('link', { name: 'Ver métricas de estos 30 días' }).click();
      const metrics = new URL(page.url()).searchParams; assert.equal(metrics.get('from'), '2026-09-12'); assert.equal(metrics.get('to'), '2026-10-11'); assert.equal(metrics.get('period'), 'custom');
      await page.getByRole('heading', { name: 'Mediciones del periodo' }).waitFor();
      await page.getByRole('tab', { name: 'Dashboard', exact: true }).click(); await ready(page);
      await page.getByRole('link', { name: 'Ver peso desde inicio' }).click(); assert.equal(new URL(page.url()).searchParams.get('period'), 'all');
      await page.getByRole('tab', { name: 'Racha', exact: true }).click(); await page.getByRole('button', { name: 'Consultar actividad diaria en Resumen' }).click();
      await page.getByRole('tab', { name: 'Resumen', exact: true }).waitFor(); assert.equal(new URL(page.url()).searchParams.get('section'), 'resumen');
    }, false);
  }
  for (const scenario of ['new', 'no-pauta', 'loading', 'error']) await run(scenario, scenario, mobile, 'dark', async (page) => {
    if (scenario === 'loading') { await page.getByText('Cargando el peso histórico…').waitFor(); assert.equal(await page.getByText('82 kg', { exact: true }).count(), 0); }
    else if (scenario === 'error') { await page.getByText('No se pudo cargar el peso histórico.').waitFor(); await control(page, 'recover'); await page.getByRole('button', { name: 'Reintentar el peso histórico' }).click(); await page.getByText('82 kg', { exact: true }).waitFor(); }
    else { await ready(page); await page.getByText(scenario === 'new' ? 'Sin registros de peso' : 'Sin pauta esta semana', { exact: true }).first().waitFor(); assert.equal(await page.getByText('Baja adherencia global', { exact: true }).count(), 0); }
    await overflow(page);
  });
  await run('summary-parity-changes', 'data', desktop, 'light', async (page) => {
    for (const fixture of summaryCases.cases) {
      await control(page, 'setSummaryCase', fixture.name); await control(page, 'refresh'); await ready(page);
      const dashboard = page.getByRole('region', { name: 'Próximos pasos', exact: true });
      const labels = { HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja' };
      const expected = [fixture.summary.next_task, fixture.summary.next_review].map((task) => task ? `${task.title} \u00b7 ${task.due_date} \u00b7 ${labels[task.priority]}${task.overdue ? ' \u00b7 Vencida' : ''}` : 'Sin tareas abiertas');
      await page.waitForFunction(({ expected }) => [...(document.querySelector('[aria-label="Pr\u00f3ximos pasos"]')?.querySelectorAll('dd') ?? [])].map((node) => node.textContent).join('|') === expected.join('|'), { expected });
      assert.deepEqual(await dashboard.locator('dd').allTextContents(), expected);
      const text = await dashboard.locator('dl').innerText();
      canonicalCases.push({ name: fixture.name, status: 'PASS', summary_sha256: crypto.createHash('sha256').update(JSON.stringify(fixture.summary)).digest('hex') });
      await page.getByRole('link', { name: 'Abrir seguimiento' }).click();
      const follow = page.getByRole('region', { name: 'Seguimiento del cliente' });
      await follow.getByText('Próxima tarea', { exact: true }).waitFor(); assert.equal(await follow.locator('dl').innerText(), text);
      await page.getByRole('tab', { name: 'Dashboard', exact: true }).click(); await ready(page);
    }
  });
  await run('recap-pages-filtered', 'recap-pages', mobile, 'light', async (page) => {
    await ready(page);
    const alerts = page.getByRole('region', { name: 'Alertas importantes' });
    const link = alerts.getByRole('link', { name: 'Consultar todos los recaps en Seguimiento' });
    await link.waitFor();
    assert.equal(await alerts.getByRole('heading', { name: 'Recaps enviados pendientes de revisión' }).count(), 0);
    assert.equal(await alerts.getByRole('link', { name: /2026-10-11|2026-10-12/ }).count(), 0);
    await link.click(); await page.getByRole('region', { name: 'Seguimiento del cliente' }).waitFor();
    const params = new URL(page.url()).searchParams;
    assert.equal(params.get('clientId'), ids.a); assert.equal(params.get('period'), '3m'); assert.equal(params.get('section'), 'seguimiento');
  });
  await run('task-unsaved-guard', 'data', desktop, 'light', async (page) => {
    await ready(page); await page.getByRole('link', { name: 'Abrir seguimiento' }).click();
    await page.getByRole('button', { name: 'Nueva tarea' }).click(); await page.getByLabel('Título', { exact: true }).fill('Borrador sintético conservado');
    const before = page.url(); page.once('dialog', (dialog) => dialog.dismiss());
    await page.evaluate(() => history.back()); await page.waitForTimeout(250);
    assert.equal(page.url(), before); assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), 'Borrador sintético conservado');
    page.once('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'Cerrar detalle' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  });
  await run('held-client-identity', 'held', desktop, 'dark', async (page) => {
    await page.waitForFunction(() => window.__dashboardFixture.pending() > 0);
    await page.getByRole('combobox', { name: 'Cliente: Cliente Sintético A', exact: true }).click();
    await page.getByRole('option', { name: /Cliente Sintético B/ }).click();
    await page.getByRole('region', { name: 'Próximos pasos', exact: true }).getByText('Sin tareas abiertas', { exact: true }).first().waitFor();
    await control(page, 'changeIdentity'); await control(page, 'release');
    await page.waitForFunction(() => window.__dashboardFixture.delivered().some((d) => d.suppressed));
    assert.equal(new URL(page.url()).searchParams.get('clientId'), ids.b);
    assert.equal(await page.getByText('Próxima tarea canónica', { exact: true }).count(), 0);
  });
  if (activated) await run('default-dashboard', 'data', desktop, 'light', async (page) => {
    await page.goto(`${origin}/progress?clientId=${ids.a}&period=3m&date=2099-01-01&scenario=data`); await ready(page);
    assert.equal(await page.getByRole('tab', { name: 'Dashboard', exact: true }).getAttribute('aria-selected'), 'true');
    assert.equal(new URL(page.url()).searchParams.get('period'), '3m');
    await page.goto(`${origin}/progress?clientId=${ids.a}&section=unknown&period=3m&scenario=data`);
    await page.getByRole('heading', { name: 'Mediciones del periodo' }).waitFor();
  });
  await run('keyboard-zoom', 'data', { width: 780, height: 844 }, 'light', async (page) => {
    await ready(page); await page.evaluate(() => document.documentElement.style.zoom = '2'); await overflow(page);
    await page.getByRole('tab', { name: 'Dashboard', exact: true }).focus(); await page.keyboard.press('ArrowRight');
    await page.getByRole('tab', { name: 'Resumen', exact: true }).waitFor();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('section') === 'resumen');
  });
}
main().catch((error) => results.push({ name: 'runner', status: 'FAIL', error: scrub(error.stack || error) })).finally(async () => {
  if (browser) await browser.close();
  const pass = results.length === (activated ? 14 : 13) && canonicalCases.length === 8 && results.every((record) => record.status === 'PASS');
  fs.writeFileSync(path.join(output, activated ? 'navigation-final.json' : 'navigation-prerequisite.json'), JSON.stringify({ status: pass ? 'PASS' : 'FAIL', date: new Date().toISOString(), sourceHashes, summaryProvenance: summaryCases.provenance, canonicalCases, activated, results, limit: 'Transporte sintético consumidor de salidas API; no prueba JWT vivo ni sustituye pruebas PostgreSQL. Regresión funcional R3-001 sin nuevas capturas.' }, null, 2));
  console.log(`RESULT: ${pass ? 'PASS' : 'FAIL'}; ${results.filter((r) => r.status === 'PASS').length}/${results.length}`);
  for (const record of results.filter((r) => r.status !== 'PASS')) console.log(`${record.name}: ${record.error}`);
  process.exitCode = pass ? 0 : 1;
});

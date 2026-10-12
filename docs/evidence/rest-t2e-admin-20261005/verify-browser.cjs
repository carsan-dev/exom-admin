'use strict';
// Independent verifier entry point. Never starts/stops Vite or installs anything.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const origin = 'http://127.0.0.1:5187';
const ids = { a: '11111111-1111-4111-8111-111111111111', b: '22222222-2222-4222-8222-222222222222', staff: '33333333-3333-4333-8333-333333333333', other: '44444444-4444-4444-8444-444444444444' };
const first = 'Revisar planificación sintética 1';
const title = 'Tarea creada por verificador';
const base = `/admin/clients/${ids.a}/follow-up-tasks`;
const remainingFunctional = process.argv.slice(2).includes('--remaining-functional');
assert.deepEqual(process.argv.slice(2), remainingFunctional ? ['--remaining-functional'] : [], 'Only --remaining-functional is supported');
const expectedCases = remainingFunctional ? 2 : 18;
const results = [];
let output;
let runtime;
let browser;
let playwrightPath;
function resolvePlaywright() {
  const candidates = process.env.EXOM_PLAYWRIGHT_MODULE ? [process.env.EXOM_PLAYWRIGHT_MODULE] : [
    'playwright', path.resolve(root, '../docs/evidence/metrics-p1-20260916/browser-tools/node_modules/playwright'),
  ];
  for (const candidate of candidates) {
    try { return require.resolve(candidate, { paths: [root] }); } catch { /* no installer/fallback transport */ }
  }
  throw new Error(`Missing installed Playwright module. Checked: ${candidates.join('; ')}`);
}
function permitted(raw, websocket = false) {
  try {
    const url = new URL(raw);
    return url.hostname === '127.0.0.1' && url.port === '5187' && url.protocol === (websocket ? 'ws:' : 'http:') &&
      (websocket ? url.pathname === '/' : !/^\/(api|admin)(\/|$)/.test(url.pathname));
  } catch { return false; }
}
function safeURL(raw) {
  try { const url = new URL(raw); return url.origin + url.pathname; } catch { return 'invalid-url'; }
}
async function control(page, action, argument) {
  return page.evaluate(({ action, argument }) => {
    const fixture = window.__followupFixture;
    if (!fixture || typeof fixture[action] !== 'function') throw new Error(`Missing fixture control ${action}`);
    return fixture[action](argument);
  }, { action, argument });
}
async function calls(page, method) {
  return page.evaluate((method) => window.__followupFixture.calls.filter((call) => !method || call.method === method), method);
}
async function waitCall(page, method, count) {
  await page.waitForFunction(({ method, count }) => window.__followupFixture.calls.filter((call) => call.method === method).length >= count, { method, count });
}
async function visible(locator) { await locator.waitFor({ state: 'visible' }); }
async function absent(locator) { await locator.waitFor({ state: 'hidden' }); }
function button(page, name) { return page.getByRole('button', { name, exact: true }); }
async function openNew(page) {
  await button(page, 'Nueva tarea').click();
  await visible(page.getByRole('dialog'));
  await visible(page.getByRole('combobox', { name: /^Responsable\b/ }));
}
async function fill(page, value = title) {
  await page.getByLabel('Título', { exact: true }).fill(value);
  await page.getByRole('combobox', { name: /^Responsable\b/ }).selectOption(ids.staff);
  await page.getByLabel('Fecha límite · UTC', { exact: true }).fill('2026-10-05');
}
async function close(page) {
  await button(page, 'Cerrar detalle').click();
  await absent(page.getByRole('dialog'));
}
async function overflow(page) {
  const measures = await page.evaluate(() => {
    const main = document.querySelector('main');
    const sheet = document.querySelector('[role="dialog"]');
    return {
      document: [document.documentElement.scrollWidth, window.innerWidth],
      main: main ? [main.scrollWidth, main.clientWidth] : null,
      sheet: sheet ? [sheet.scrollWidth, sheet.clientWidth] : null,
    };
  });
  for (const [name, size] of Object.entries(measures)) if (size) assert.ok(size[0] <= size[1] + 1, `${name} horizontal overflow: ${size}`);
}
async function chooseClient(page, current, next) {
  await page.getByRole('combobox', { name: `Cliente: Cliente Sintético ${current}`, exact: true }).click();
  await page.getByRole('option', { name: new RegExp(`Cliente Sintético ${next}`) }).click();
  await page.waitForURL((url) => url.searchParams.get('clientId') === (next === 'A' ? ids.a : ids.b));
}
async function runCase(name, scenario, viewport, theme, body) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', colorScheme: theme });
  const escapes = [];
  const pageErrors = [];
  const dialogs = [];
  const record = { name, scenario, viewport, theme, mode: remainingFunctional ? 'remaining-functional' : 'full', geometryChecks: [], focusAfterClose: null, status: 'RUNNING', escapes, pageErrors, dialogs };
  results.push(record);
  const filename = name.replace(/[^a-z0-9-]/gi, '-');
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(20000);
  // Network fence installed BEFORE navigation; API adapter never reaches HTTP.
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (!permitted(url)) { escapes.push(safeURL(url)); await route.abort('blockedbyclient'); return; }
    await route.continue();
  });
  if (typeof context.routeWebSocket !== 'function') throw new Error('Installed Playwright lacks routeWebSocket; refusing unfenced run');
  await context.routeWebSocket('**/*', (socket) => {
    if (!permitted(socket.url(), true)) { escapes.push(safeURL(socket.url())); socket.close(); return; }
    socket.connectToServer();
  });
  await context.addInitScript((theme) => localStorage.setItem('exom-admin-theme', theme), theme);
  page.on('pageerror', (error) => pageErrors.push(error.message));
  let nextDialog = 'accept';
  page.on('dialog', async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message(), disposition: nextDialog });
    if (nextDialog === 'dismiss') await dialog.dismiss(); else await dialog.accept();
    nextDialog = 'accept';
  });
  await context.tracing.start({ screenshots: !remainingFunctional, snapshots: true, sources: false });
  try {
    const query = new URLSearchParams({ clientId: ids.a, section: 'seguimiento', period: '3m', scenario });
    await page.goto(`${origin}/progress?${query}`);
    await page.waitForFunction(() => Boolean(window.__followupFixture?.snapshot));
    // Theme hook's incumbent storage key is verified by rendered root class,
    // with its visible theme toggle used if the saved preference differs.
    const wantLight = theme === 'light';
    const isLight = await page.evaluate(() => document.documentElement.classList.contains('light'));
    if (isLight !== wantLight) await page.getByRole('button', { name: 'Cambiar tema' }).click();
    await page.waitForFunction((theme) => document.documentElement.classList.contains(theme), theme);
    await body({ page, screenshot: async (suffix, fullPage = true) => {
      await overflow(page);
      record.geometryChecks.push(suffix);
      if (!remainingFunctional) await page.screenshot({ path: path.join(output, `${filename}-${suffix}.png`), fullPage, animations: 'disabled' });
    }, recordFocus: async () => {
      record.focusAfterClose = await page.evaluate(() => {
        const active = document.activeElement;
        return { tag: active?.tagName, role: active?.getAttribute('role'), label: active?.getAttribute('aria-label'), text: active?.textContent?.trim().slice(0, 100) };
      });
    }, respond: (choice) => { nextDialog = choice; }, dialogs });
    assert.deepEqual(escapes, [], 'External network attempt(s)');
    assert.deepEqual(pageErrors, [], 'Browser page error(s)');
    record.status = 'PASS';
  } catch (error) {
    record.status = 'FAIL'; record.error = error.stack || String(error);
    if (!remainingFunctional) await page.screenshot({ path: path.join(output, `${filename}-failure.png`), animations: 'disabled' }).catch(() => undefined);
  } finally {
    record.calls = await calls(page).catch(() => []);
    await context.tracing.stop({ path: path.join(output, `${filename}-trace.zip`) });
    await context.close();
    fs.writeFileSync(path.join(output, `${filename}.json`), JSON.stringify(record, null, 2));
    const line = `${record.status}: ${name}${record.error ? ` — ${record.error.split('\n')[0]}` : ''}`;
    console.log(line); fs.appendFileSync(path.join(output, 'run.log'), `${line}\n`);
  }
}
async function core({ page, screenshot, recordFocus, respond, dialogs }) {
  await visible(button(page, first));
  assert.equal(await page.getByRole('tab', { name: 'Dashboard · pendiente', exact: true }).isDisabled(), true);
  await screenshot('list');
  await button(page, 'Página siguiente').click();
  await visible(button(page, 'Tarea sin responsable'));
  await page.getByRole('combobox', { name: /^Filtrar por responsable\b/ }).selectOption('unassigned');
  await visible(button(page, 'Tarea sin responsable'));
  await absent(button(page, first));
  await button(page, 'Tarea sin responsable').click();
  assert.equal(await page.getByRole('combobox', { name: /^Responsable\b/ }).inputValue(), '');
  await page.getByLabel('Título', { exact: true }).fill('Tarea sin responsable conservada');
  await button(page, 'Guardar cambios').click(); await absent(page.getByRole('dialog'));
  let retainedSnapshot = await control(page, 'snapshot');
  assert.equal(retainedSnapshot[ids.a].find((task) => task.title === 'Tarea sin responsable conservada').assigned_to_id, null);
  assert.equal(Object.hasOwn((await calls(page, 'put'))[0].payload, 'assigned_to_id'), false);
  await page.getByRole('combobox', { name: /^Filtrar por responsable\b/ }).selectOption('');
  await page.getByRole('combobox', { name: /^Filtrar por estado\b/ }).selectOption('IN_PROGRESS');
  await visible(button(page, 'Revisar planificación sintética 2'));
  await absent(button(page, first));
  await page.getByRole('combobox', { name: /^Filtrar por estado\b/ }).selectOption('');
  await visible(button(page, first));
  await button(page, 'Página siguiente').click();
  await button(page, 'Tarea de responsable anterior').click();
  const retained = page.getByRole('option', { name: /Profesional anterior no habilitado · asignación conservada/ });
  const nativeRetained = await retained.evaluate((element) => {
    if (!(element instanceof HTMLOptionElement)) throw new Error('Retained assignee must be a native option');
    return { disabled: element.disabled, hasDisabledAttribute: element.hasAttribute('disabled'), value: element.value };
  });
  assert.deepEqual(nativeRetained, { disabled: true, hasDisabledAttribute: true, value: '66666666-6666-4666-8666-666666666666' });
  // Playwright 1.56.1 isDisabled follows the wrapping label to its enabled select.
  // The option's own native property, not its parent control, governs eligibility.
  assert.equal(await page.getByRole('combobox', { name: /^Responsable\b/ }).inputValue(), '66666666-6666-4666-8666-666666666666');
  await page.getByLabel('Título', { exact: true }).fill('Responsable anterior conservado');
  await button(page, 'Guardar cambios').click(); await absent(page.getByRole('dialog'));
  retainedSnapshot = await control(page, 'snapshot');
  assert.equal(retainedSnapshot[ids.a].find((task) => task.title === 'Responsable anterior conservado').assigned_to_id, '66666666-6666-4666-8666-666666666666');
  assert.equal(Object.hasOwn((await calls(page, 'put'))[1].payload, 'assigned_to_id'), false);
  // Exercise actual user keyboard exclusion AFTER proving unchanged PUT omission.
  await button(page, 'Responsable anterior conservado').click();
  const nativeAssignee = page.getByRole('combobox', { name: /^Responsable\b/ });
  await visible(nativeAssignee);
  await nativeAssignee.locator(`option[value="${ids.staff}"]`).waitFor({ state: 'attached' });
  const enabledValues = await nativeAssignee.evaluate((element) => [...element.options].filter((option) => !option.disabled).map((option) => option.value));
  assert.equal(enabledValues[0], '');
  assert.ok(enabledValues.length > 1, 'Task-specific lookup must provide eligible assignees');
  await nativeAssignee.focus();
  for (const [key, expectedValue] of [['Home', ''], ['ArrowDown', enabledValues[1]], ['ArrowUp', '']]) {
    await page.keyboard.press(key);
    assert.equal(await nativeAssignee.inputValue(), expectedValue, `Native keyboard ${key} must skip the historical option`);
  }
  await close(page); // Explicitly discard this keyboard-only draft; never persist reassignment.
  assert.equal((await calls(page, 'put')).length, 2, 'Keyboard eligibility check must not write');
  await openNew(page);
  await page.getByLabel('Título', { exact: true }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('combobox', { name: /^Tipo\b/ }).evaluate((element) => document.activeElement === element), true, 'Tab follows labeled form order');
  await screenshot('sheet', false);
  if (page.viewportSize().width === 390) {
    const width = await page.getByRole('dialog').evaluate((element) => element.getBoundingClientRect().width);
    assert.ok(Math.abs(width - 390) <= 1, `Mobile sheet width ${width}`);
  }
  await page.keyboard.press('Escape');
  await absent(page.getByRole('dialog'));
  const opener = await button(page, 'Nueva tarea').elementHandle();
  try {
    await page.waitForFunction((element) => element?.isConnected && document.activeElement === element, opener, { timeout: 12000 });
  } finally {
    await recordFocus(); // Record the actual activeElement after closure, including timeout failures.
  }
  const returnedFocus = await button(page, 'Nueva tarea').evaluate((element) => document.activeElement === element);
  await openNew(page);
  await fill(page);
  await page.getByRole('combobox', { name: /^Responsable\b/ }).selectOption('');
  await button(page, 'Crear tarea').click();
  await visible(page.getByRole('alert').filter({ hasText: 'Selecciona un responsable habilitado para este cliente.' }));
  assert.equal((await calls(page, 'post')).length, 0, 'Invalid assignee must not create a task');
  assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), title);
  await button(page, 'Cargar más responsables').click();
  await page.getByRole('combobox', { name: /^Responsable\b/ }).selectOption(ids.other);
  assert.ok((await calls(page, 'get')).some((call) => call.path === `${base}/assignees` && Number(call.params?.page) === 2), 'Eligible selection must come from task-specific lookup page 2');
  await button(page, 'Crear tarea').click();
  await absent(page.getByRole('dialog'));
  const posts = await calls(page, 'post');
  assert.equal(posts.length, 1);
  assert.equal(posts[0].payload.assigned_to_id, ids.other);
  assert.equal(posts[0].payload.due_date, '2026-10-05');
  assert.match(posts[0].payload.id, /^[0-9a-f-]{36}$/);
  // New task lands on page two; list remains server-paginated after invalidation.
  await visible(button(page, title));
  await page.getByRole('combobox', { name: /^Filtrar por responsable\b/ }).selectOption(ids.other);
  await visible(button(page, title));
  assert.ok((await calls(page, 'get')).some((call) => call.path === base && call.params.assigned_to_id === ids.other));
  await button(page, title).click();
  await page.getByLabel('Título', { exact: true }).fill(`${title} editada`);
  await page.getByRole('combobox', { name: /^Estado\b/ }).selectOption('IN_PROGRESS');
  await button(page, 'Guardar cambios').click();
  await absent(page.getByRole('dialog'));
  await button(page, `${title} editada`).click();
  await button(page, 'Completar tarea').click();
  await absent(page.getByRole('dialog'));
  await button(page, 'Historial').click();
  await visible(button(page, `${title} editada`));
  await button(page, `${title} editada`).click();
  assert.equal(await page.getByLabel('Título', { exact: true }).isDisabled(), true);
  assert.equal(await button(page, 'Guardar cambios').count(), 0);
  assert.equal(await button(page, 'Completar tarea').count(), 0);
  await close(page);
  await page.getByRole('combobox', { name: /^Filtrar por responsable\b/ }).selectOption('');
  await page.getByRole('combobox', { name: /^Filtrar por estado\b/ }).selectOption('COMPLETED');
  await visible(button(page, 'Tarea completada histórica'));
  await absent(button(page, 'Tarea cancelada histórica'));
  await page.getByRole('combobox', { name: /^Filtrar por estado\b/ }).selectOption('');
  await visible(button(page, 'Tarea cancelada histórica'));
  await button(page, 'Tarea completada histórica').click();
  assert.equal(await page.getByRole('combobox', { name: /^Responsable\b/ }).inputValue(), '66666666-6666-4666-8666-666666666666');
  assert.equal(await page.getByLabel('Título', { exact: true }).isDisabled(), true); await close(page);
  await button(page, 'Tarea cancelada histórica').click();
  assert.equal(await page.getByRole('combobox', { name: /^Responsable\b/ }).inputValue(), '');
  assert.equal(await page.getByLabel('Título', { exact: true }).isDisabled(), true); await close(page);
  await button(page, 'Abiertas').click();
  await button(page, first).click();
  respond('dismiss');
  const count = (await calls(page, 'put')).length;
  await button(page, 'Cancelar tarea').click();
  assert.equal((await calls(page, 'put')).length, count, 'Declined cancellation must not write');
  assert.match(dialogs[dialogs.length - 1].message, /Cancelar esta tarea/);
  await button(page, 'Cancelar tarea').click();
  await absent(page.getByRole('dialog'));
  const mutations = [...await calls(page, 'post'), ...await calls(page, 'put')];
  assert.ok(mutations.every((call) => call.path.startsWith(base)), 'No message/plan mutations');
  const updates = await calls(page, 'put');
  assert.deepEqual(updates.map((call) => call.payload.status), ['PENDING', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
  assert.deepEqual(updates.map((call) => call.payload.expected_version), [3, 3, 1, 2, 3]);
  await overflow(page);
  assert.equal(returnedFocus, true, 'Sheet must return focus to opener');
}
async function main() {
  playwrightPath = resolvePlaywright();
  const { chromium } = require(playwrightPath);
  const executable = process.env.EXOM_BROWSER_EXECUTABLE || (process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'));
  if (!executable) throw new Error('EXOM_BROWSER_EXECUTABLE or PROGRAMFILES is required to locate installed Chrome');
  if (!fs.existsSync(executable)) throw new Error(`Missing installed browser executable: ${executable}; no download attempted`);
  const response = await fetch(`${origin}/`, { signal: AbortSignal.timeout(5000), redirect: 'error' });
  assert.ok(response.ok && (await response.text()).includes('EXOM · Seguimiento sintético aislado'), '5187 is not the prepared isolated fixture server');
  output = path.join(__dirname, 'browser-output/independent', `${remainingFunctional ? 'remaining-functional' : 'run'}-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`);
  fs.mkdirSync(output, { recursive: true });
  // Keep Chrome's nested profile/cache paths short; retain readable receipts separately.
  runtime = path.join(__dirname, 'browser-output', `r-${crypto.randomBytes(4).toString('hex')}`);
  fs.mkdirSync(runtime); // Exclusive creation: collisions fail without touching existing profiles.
  const runtimeLine = `RUNTIME: ${runtime}`;
  console.log(runtimeLine); fs.appendFileSync(path.join(output, 'run.log'), `${runtimeLine}\n`);
  process.env.TEMP = runtime; process.env.TMP = runtime; process.env.TMPDIR = runtime;
  const browserEnv = { TEMP: runtime, TMP: runtime, TMPDIR: runtime };
  for (const key of ['PATH', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'COMSPEC']) if (process.env[key]) browserEnv[key] = process.env[key];
  browser = await chromium.launch({ executablePath: executable, headless: true, env: browserEnv,
    args: ['--disable-background-networking', '--disable-component-update', '--disable-breakpad', '--disable-crash-reporter', '--no-first-run'] });
  const desktop = { width: 1440, height: 900 };
  const mobile = { width: 390, height: 844 };
  if (remainingFunctional) {
    await runCase('remaining-functional-desktop', 'data', desktop, 'dark', core);
    await runCase('remaining-functional-mobile', 'data', mobile, 'dark', core);
    return; // Only the two incomplete matrix functional flows, not the 14 completed cases.
  }
  for (const [device, viewport] of [['desktop', desktop], ['mobile', mobile]]) {
    for (const theme of ['light', 'dark']) await runCase(`${device}-${theme}`, 'data', viewport, theme, core);
  }
  await runCase('empty', 'empty', desktop, 'dark', async ({ page }) => visible(page.getByRole('status').filter({ hasText: 'No hay tareas en esta página' })));
  await runCase('loading-release', 'loading', desktop, 'dark', async ({ page }) => {
    await visible(page.getByRole('tabpanel', { name: 'Tareas', exact: true }).getByLabel('Cargando tareas', { exact: true }).filter({ visible: true }));
    await page.waitForFunction(() => window.__followupFixture.pending().length >= 3);
    await control(page, 'releaseResponses');
    await page.waitForFunction(() => window.__followupFixture.delivered().length >= 3);
    await visible(button(page, first));
  });
  for (const scenario of ['network', '403']) await runCase(`${scenario}-retry`, scenario, desktop, 'dark', async ({ page }) => {
    await visible(button(page, 'Reintentar tareas'));
    await control(page, 'recoverErrors');
    await button(page, 'Reintentar tareas').click();
    await button(page, 'Reintentar próximos pasos').click();
    await visible(button(page, first));
  });
  for (const [scenario, message] of [['401', 'Sesión caducada'], ['404', 'Cliente o tarea no disponible'], ['423', 'Cuenta bloqueada']]) {
    await runCase(`${scenario}-distinct-error`, scenario, desktop, 'dark', async ({ page }) => {
      await visible(page.getByRole('alert').filter({ hasText: message }).first());
      assert.equal((await calls(page, 'post')).length, 0);
    });
  }
  await runCase('revoked-retains-draft', 'revoked', desktop, 'dark', async ({ page }) => {
    await visible(button(page, first)); await openNew(page); await fill(page);
    await button(page, 'Crear tarea').click();
    await visible(page.getByRole('alert').filter({ hasText: 'Permiso o responsable no disponible' }));
    assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), title);
    assert.equal(await page.getByRole('combobox', { name: /^Responsable\b/ }).inputValue(), ids.staff);
    const snapshot = await control(page, 'snapshot');
    assert.equal(snapshot[ids.a].filter((task) => task.title === title).length, 0);
  });
  await runCase('lost-response-stable-retry', 'lost-response', desktop, 'dark', async ({ page }) => {
    await visible(button(page, first)); await openNew(page); await fill(page);
    await button(page, 'Crear tarea').click();
    await visible(button(page, 'Reintentar mismo guardado'));
    assert.equal(await page.getByLabel('Título', { exact: true }).isDisabled(), true);
    await button(page, 'Reintentar mismo guardado').click(); await absent(page.getByRole('dialog'));
    const posts = await calls(page, 'post'); assert.equal(posts.length, 2);
    assert.deepEqual(posts[0].payload, posts[1].payload);
    const snapshot = await control(page, 'snapshot');
    assert.equal(snapshot[ids.a].filter((task) => task.id === posts[0].payload.id).length, 1);
  });
  await runCase('409-explicit-review', 'conflict', desktop, 'dark', async ({ page }) => {
    await visible(button(page, first)); await button(page, first).click();
    await page.getByLabel('Título', { exact: true }).fill('Mi borrador no sobrescrito');
    await button(page, 'Guardar cambios').click();
    await visible(page.getByRole('region', { name: 'Versión del servidor' }));
    await visible(page.getByText('Servidor: versión 4 · Pendiente', { exact: true }));
    assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), 'Mi borrador no sobrescrito');
    assert.equal(await button(page, 'Guardar cambios').isDisabled(), true);
    const puts = await calls(page, 'put'); assert.equal(puts.length, 1); assert.equal(puts[0].payload.expected_version, 3);
    await button(page, 'Descartar borrador y cargar versión').click();
    await page.waitForFunction(() => document.querySelector('input') && [...document.querySelectorAll('input')].some((input) => input.value === 'Versión actual del servidor sintético'));
    assert.equal((await calls(page, 'put')).length, 1, 'Review/discard does not overwrite server');
    assert.equal(await page.getByLabel('Fecha límite · UTC', { exact: true }).inputValue(), '2026-10-04');
  });
  await runCase('dirty-client-browser-back', 'data', desktop, 'dark', async ({ page, respond, dialogs }) => {
    await visible(button(page, first)); await chooseClient(page, 'A', 'B');
    await visible(button(page, 'Tarea exclusiva B')); await openNew(page);
    await page.getByLabel('Título', { exact: true }).fill('Borrador del cliente B');
    respond('dismiss');
    const rejectedNavigation = page.waitForEvent('dialog');
    await page.evaluate(() => history.back()); await rejectedNavigation;
    await page.waitForFunction(() => location.search.includes('clientId=22222222'));
    await page.waitForFunction(() => Boolean(document.querySelector('[role="dialog"]')));
    assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), 'Borrador del cliente B');
    assert.ok(dialogs.some((dialog) => dialog.disposition === 'dismiss' && /Descartar/.test(dialog.message)));
    const acceptedNavigation = page.waitForEvent('dialog');
    await page.evaluate(() => history.back()); await acceptedNavigation;
    await page.waitForURL((url) => url.searchParams.get('clientId') === ids.a);
    await absent(page.getByRole('dialog')); await visible(button(page, first));
    assert.equal(new URL(page.url()).searchParams.get('period'), '3m');
    assert.equal(new URL(page.url()).searchParams.get('section'), 'seguimiento');
    assert.equal((await calls(page, 'post')).length, 0);
  });
  await runCase('late-client-read', 'deferred', desktop, 'dark', async ({ page }) => {
    await page.waitForFunction(() => window.__followupFixture.pending().length > 0);
    await chooseClient(page, 'A', 'B'); await visible(button(page, 'Tarea exclusiva B'));
    await control(page, 'releaseResponses');
    await page.waitForFunction(() => window.__followupFixture.delivered().length > 0);
    await visible(button(page, 'Tarea exclusiva B')); await absent(button(page, first));
    assert.equal(new URL(page.url()).searchParams.get('clientId'), ids.b);
  });
  await runCase('late-identity-read', 'deferred', desktop, 'dark', async ({ page }) => {
    await page.waitForFunction(() => window.__followupFixture.pending().length > 0);
    await openNew(page); await page.getByLabel('Título', { exact: true }).fill('Borrador de identidad anterior');
    await control(page, 'changeIdentity'); await absent(page.getByRole('dialog'));
    await page.waitForFunction(() => window.__followupFixture.calls.some((call) => call.identity === '44444444-4444-4444-8444-444444444444'));
    await control(page, 'releaseResponses');
    await page.waitForFunction(() => window.__followupFixture.delivered().some((entry) => entry.suppressed));
    await visible(button(page, first)); assert.equal((await calls(page, 'post')).length, 0);
    await openNew(page); assert.equal(await page.getByLabel('Título', { exact: true }).inputValue(), '');
  });
  await runCase('logout-late-read', 'deferred', desktop, 'dark', async ({ page }) => {
    await page.waitForFunction(() => window.__followupFixture.pending().length > 0);
    await page.getByRole('button', { name: /Administrador/ }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
    await visible(page.getByRole('alert').filter({ hasText: 'Inicia sesión para consultar tareas internas' }));
    await control(page, 'releaseResponses');
    await page.waitForFunction(() => window.__followupFixture.delivered().some((entry) => entry.suppressed));
    await absent(button(page, first)); await absent(button(page, 'Nueva tarea'));
  });
}
main().catch((error) => {
  console.error(error.stack || String(error));
  results.push({ name: 'runner', status: 'FAIL', error: error.stack || String(error) });
}).finally(async () => {
  if (browser) await browser.close();
  const success = results.length === expectedCases && results.every((result) => result.status === 'PASS');
  if (output) fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ status: success ? 'PASS' : 'FAIL', mode: remainingFunctional ? 'remaining-functional' : 'full', expectedCases, playwrightPath, origin, runtimePath: runtime, receiptPath: output, results, limit: remainingFunctional ? 'Two matrix functional flows only, one per viewport in dark theme. No PNG or trace screenshots, no visual approval; not an 18/18 result.' : 'Synthetic transport only; screenshots require independent visual review.' }, null, 2));
  const line = `RESULT: ${success ? 'PASS' : 'FAIL'}${output ? ` — ${output}` : ' — preflight did not produce browser evidence'}`;
  console.log(line); if (output) fs.appendFileSync(path.join(output, 'run.log'), `${line}\n`);
  process.exitCode = success ? 0 : 1;
});

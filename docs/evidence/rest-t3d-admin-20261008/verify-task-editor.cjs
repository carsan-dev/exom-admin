'use strict';
// Preparation only: real shipping editor, existing synthetic in-memory transport.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../../..');
const originalConfig = path.join(root, 'docs/evidence/rest-t2e-admin-20261005/vite.browser.config.ts');
const owner = '11111111-1111-4111-8111-111111111111';
const staff = '33333333-3333-4333-8333-333333333333';
const base = `/admin/clients/${owner}/follow-up-tasks`;
const first = 'Revisar planificación sintética 1';
const pins = {
  'src/features/progress/follow-up-tasks/task-editor.tsx': '634207c12fe526b051365aaad09e568952fa2c69148d2bb7396b7d1ef5a398ce',
  'src/features/progress/follow-up-tasks/follow-up-panel.test.tsx': '1219e241989b55d99ad1439c928be3737194113434b3bd436b3a8d8c82518422',
};
const results = [];
let output, server, browser, origin, dependencies;
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const button = (page, name) => page.getByRole('button', { name, exact: true });
const control = (page, action, argument) => page.evaluate(({ action, argument }) => window.__followupFixture[action](argument), { action, argument });
function resolvePlaywright() {
  const candidates = process.env.EXOM_PLAYWRIGHT_MODULE ? [process.env.EXOM_PLAYWRIGHT_MODULE] : [
    'playwright', path.resolve(root, '../docs/evidence/metrics-p1-20260916/browser-tools/node_modules/playwright'),
  ];
  for (const candidate of candidates) {
    try { return require.resolve(candidate, { paths: [root] }); } catch { /* Installed modules only. */ }
  }
  throw new Error('No installed Playwright found; no installation attempted');
}
async function runCase(device, viewport, operation) {
  const record = { name: `${device}-${operation}`, status: 'RUNNING', viewport, escapes: [], pageErrors: [] };
  results.push(record);
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', colorScheme: 'dark' });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  try {
    // Installed BEFORE navigation. Only own Vite assets/HMR; never API HTTP or remote sockets.
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin || /^\/(api|admin)(\/|$)/.test(url.pathname)) {
        record.escapes.push(url.origin + url.pathname); await route.abort('blockedbyclient');
      } else await route.continue();
    });
    assert.equal(typeof context.routeWebSocket, 'function', 'Unfenced WebSockets are forbidden');
    await context.routeWebSocket('**/*', (socket) => {
      const url = new URL(socket.url());
      if (url.origin === origin.replace('http:', 'ws:') && url.pathname === '/') socket.connectToServer();
      else { record.escapes.push(url.origin + url.pathname); socket.close(); }
    });
    page.on('pageerror', (error) => record.pageErrors.push(error.message));
    page.on('dialog', (dialog) => { record.pageErrors.push(`Unexpected ${dialog.type()} dialog`); void dialog.dismiss(); });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    await page.goto(`${origin}/progress?clientId=${owner}&section=seguimiento&scenario=data`);
    await button(page, first).waitFor({ state: 'visible' });
    await page.getByText('Fecha del servidor: 2026-10-05 · UTC', { exact: true }).waitFor({ state: 'visible' });
    const opener = button(page, operation === 'create' ? 'Nueva tarea' : first);
    const openerHandle = await opener.elementHandle();
    await opener.click();
    const dialog = page.getByRole('dialog', { name: operation === 'create' ? 'Nueva tarea' : 'Detalle de tarea', exact: true });
    await dialog.waitFor({ state: 'visible' });
    const title = `Guardado confirmado ${device} ${operation}`;
    await dialog.getByLabel('Título', { exact: true }).fill(title);
    const assignee = dialog.getByRole('combobox', { name: /^Responsable\b/ });
    await assignee.locator(`option[value="${staff}"]`).waitFor({ state: 'attached' });
    if (operation === 'create') {
      await assignee.selectOption(staff);
      await dialog.getByLabel('Fecha límite · UTC', { exact: true }).fill('2026-10-05');
    }
    assert.deepEqual(await control(page, 'pending'), [], 'Initial fixture reads completed before holding');
    // Hold immediately BEFORE submit: actual invalidation reads remain unresolved.
    await control(page, 'holdReads', owner);
    await dialog.getByRole('button', { name: operation === 'create' ? 'Crear tarea' : 'Guardar cambios', exact: true }).click();
    await page.waitForFunction(({ owner, title }) => {
      const f = window.__followupFixture;
      return f.pending().some((entry) => entry.owner === owner) && f.snapshot()[owner].some((task) => task.title === title);
    }, { owner, title });
    await dialog.waitFor({ state: 'hidden' });
    await page.waitForFunction((element) => element instanceof HTMLButtonElement && element.isConnected && !element.disabled &&
      !element.closest('[hidden], [inert], [aria-hidden="true"]') && element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && document.activeElement === element, openerHandle);
    record.beforeRelease = await page.evaluate(({ owner, title }) => {
      const f = window.__followupFixture;
      return { pending: f.pending(), delivered: f.delivered(), task: f.snapshot()[owner].find((task) => task.title === title),
        mutations: f.calls.filter((call) => ['post', 'put'].includes(call.method)),
        focus: { tag: document.activeElement.tagName, text: document.activeElement.textContent.trim() } };
    }, { owner, title });
    assert.ok(record.beforeRelease.pending.some((entry) => entry.path === base), 'List refetch genuinely unresolved at closure/focus');
    assert.equal(record.beforeRelease.delivered.length, 0, 'No held response delivered before focus');
    assert.equal(record.beforeRelease.mutations.length, 1, 'Exactly one mutation while reads unresolved');
    const mutation = record.beforeRelease.mutations[0];
    assert.equal(mutation.method, operation === 'create' ? 'post' : 'put');
    assert.equal(mutation.path, operation === 'create' ? base : `${base}/${record.beforeRelease.task.id}`);
    assert.equal(mutation.payload.title, title);
    assert.equal(record.beforeRelease.task.version, operation === 'create' ? 1 : mutation.payload.expected_version + 1);
    await page.screenshot({ path: path.join(output, `${record.name}-pending.png`), fullPage: true });
    await control(page, 'releaseResponses');
    await page.waitForFunction((count) => window.__followupFixture.pending().length === 0 &&
      window.__followupFixture.delivered().length === count, record.beforeRelease.pending.length);
    if (operation === 'create') await button(page, 'Página siguiente').click(); // New task is server-paginated onto page two.
    await button(page, title).waitFor({ state: 'visible' });
    record.afterRelease = await page.evaluate(() => ({ pending: window.__followupFixture.pending(), delivered: window.__followupFixture.delivered(),
      mutations: window.__followupFixture.calls.filter((call) => ['post', 'put'].includes(call.method)) }));
    assert.equal(record.afterRelease.mutations.length, 1, 'Refresh must not replay the mutation');
    assert.ok(record.afterRelease.delivered.every((entry) => !entry.suppressed), 'Same-owner responses delivered');
    assert.deepEqual(record.escapes, [], 'Forbidden network attempts');
    assert.deepEqual(record.pageErrors, [], 'Browser errors');
    await page.screenshot({ path: path.join(output, `${record.name}-released.png`), fullPage: true });
    record.status = 'PASS';
  } catch (error) { record.status = 'FAIL'; record.error = error.stack || String(error); }
  finally {
    try { await context.tracing.stop({ path: path.join(output, `${record.name}-trace.zip`) }); }
    catch (error) { record.status = 'FAIL'; record.traceError = String(error); }
    await context.close();
    if (record.escapes.length || record.pageErrors.length) record.status = 'FAIL'; // Include late events during capture/close.
    fs.writeFileSync(path.join(output, `${record.name}.json`), JSON.stringify(record, null, 2));
    console.log(`${record.status}: ${record.name}`);
  }
}
async function main() {
  assert.equal(process.cwd(), root, 'Run from Admin root');
  const argv = process.argv.slice(2);
  assert.ok(argv.length === 0 || (argv.length === 2 && argv[0] === '--output'), 'Only --output <new-system-temp-directory> supported');
  for (const [file, pin] of Object.entries(pins)) assert.equal(hash(path.join(root, file)), pin, `Changed pinned source: ${file}`);
  const temp = fs.realpathSync(os.tmpdir());
  if (argv.length) {
    const candidate = path.resolve(argv[1]);
    const relative = path.relative(temp, candidate);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Output must be inside system TEMP');
    assert.equal(fs.realpathSync(path.dirname(candidate)), temp, 'Custom output must be a direct TEMP child (no symlink traversal)');
    fs.mkdirSync(candidate); // Exclusive: reject even an existing empty directory; never overwrite previous evidence.
    output = candidate; // Failed allocation must never write results into the rejected destination.
  } else output = fs.mkdtempSync(path.join(temp, 'exom-task-editor-'));
  const runtime = path.join(output, 'runtime'); fs.mkdirSync(runtime);
  process.env.TEMP = runtime; process.env.TMP = runtime; process.env.TMPDIR = runtime;
  const playwrightPath = resolvePlaywright();
  const executable = process.env.EXOM_BROWSER_EXECUTABLE || [
    (process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe')),
    path.join(process.env.LOCALAPPDATA || os.homedir(), 'Google/Chrome/Application/chrome.exe'),
  ].find((file) => fs.existsSync(file));
  assert.ok(executable && fs.statSync(executable).isFile(), 'Installed Chrome required; no download');
  const vitePath = require.resolve('vite', { paths: [root] });
  dependencies = { playwrightPath, executable, vitePath, pins };
  const vite = await import(pathToFileURL(vitePath).href);
  // Default bundle loader keeps async factory imports alive; ignored node_modules/.vite-temp output is authorized.
  const loaded = await vite.loadConfigFromFile({ command: 'serve', mode: 'development' }, originalConfig, root, 'error');
  assert.ok(loaded && loaded.config.envDir === false, 'Original fixture must not load dotenv');
  server = await vite.createServer(vite.mergeConfig(loaded.config, { configFile: false, envDir: false,
    cacheDir: path.join(output, 'vite-cache'), server: { host: '127.0.0.1', port: 0, strictPort: true, open: false } }));
  // Vite 6 listen(0) falls back to 5173. Bind ONLY this new HTTP server directly to OS port 0.
  await new Promise((resolve, reject) => { server.httpServer.once('error', reject); server.httpServer.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const marker = await fetch(`${origin}/`, { signal: AbortSignal.timeout(5000), redirect: 'error' });
  assert.ok(marker.ok && (await marker.text()).includes('EXOM · Seguimiento sintético aislado'), 'Own server fixture marker missing');
  const browserEnv = { TEMP: runtime, TMP: runtime, TMPDIR: runtime };
  for (const key of ['PATH', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'COMSPEC']) if (process.env[key]) browserEnv[key] = process.env[key];
  browser = await require(playwrightPath).chromium.launch({ executablePath: executable, headless: true, env: browserEnv,
    args: ['--disable-background-networking', '--disable-component-update', '--disable-breakpad', '--disable-crash-reporter', '--no-first-run'] });
  for (const [device, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]])
    for (const operation of ['create', 'update']) await runCase(device, viewport, operation);
}
main().catch((error) => { results.push({ name: 'runner', status: 'FAIL', error: error.stack || String(error) }); console.error(error); })
  .finally(async () => {
    for (const resource of [browser, server]) if (resource) {
      try { await resource.close(); } catch (error) { results.push({ name: 'cleanup', status: 'FAIL', error: String(error) }); }
    }
    const success = results.length === 4 && results.every((result) => result.status === 'PASS');
    if (output) fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ status: success ? 'PASS' : 'FAIL', expectedCases: 4,
      origin, dependencies, results, limit: 'Synthetic in-memory HTTP adapter only; no rejection/timeout/403 sequencing or real API proof.' }, null, 2));
    console.log(`RESULT: ${success ? 'PASS' : 'FAIL'}; output: ${output || 'no evidence directory'}`);
    process.exitCode = success ? 0 : 1;
  });

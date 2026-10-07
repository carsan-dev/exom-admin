'use strict';
// Prepared for the independent verifier only. Never starts/stops servers or installs tools.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../../..');
const origin = 'http://127.0.0.1:5188';
const marker = 'REST-T3C-ISOLATED-20261007';
const ids = { a: '11111111-1111-4111-8111-111111111111', b: '22222222-2222-4222-8222-222222222222' };
const desktop = { width: 1440, height: 900 }, mobile = { width: 390, height: 844 };
const privatePattern = /PRIVATE_(?:DRAFT|CHANGES|GOALS)_SENTINEL|INTERNAL_NOTE_SENTINEL|EMAIL_SENTINEL|review_version|Borrador: versi[oó]n/;
const results = [];
const requiredPDFs = {
  'desktop-light': ['before', 'after'], 'desktop-dark': ['before', 'after'],
  'mobile-light': ['before', 'after'], 'mobile-dark': ['before', 'after'],
  'private-only-submitted': ['private-only'], 'reviewed-unsent-feedback-contract': ['unsent-feedback'],
};
const expectedRequiredPDFCount = Object.values(requiredPDFs).flat().length;
const manifestSha256 = '4b8ce1ae66e37aa2c67b3c82a31015d583f399b042c38749a663a23ad9f9477b';
function verifySourceIdentity() {
  const bytes = fs.readFileSync(path.join(__dirname, 'source-hashes.sha256'));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), manifestSha256, 'Verified source manifest changed; parent must reconcile baseline');
  const entries = bytes.toString('utf8').trim().split('\n');
  assert.equal(entries.length, 13);
  for (const line of entries) {
    const match = line.match(/^([a-f0-9]{64}) \*(src\/features\/(?:recaps|progress\/follow-up-tasks)\/[a-z0-9/.-]+\.tsx?)$/);
    assert.ok(match && !match[2].includes('..'), 'Unexpected source manifest path');
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, match[2]))).digest('hex');
    assert.equal(actual, match[1], `Source changed since writer validation: ${match[2]}`);
  }
}
let chromium, browserEnv, executablePath, output, playwrightPath;
assert.deepEqual(process.argv.slice(2), [], 'No runner arguments supported');
function resolveInstalled(name) {
  const candidates = [name, path.resolve(root, '../docs/evidence/metrics-p1-20260916/browser-tools/node_modules', name)];
  for (const candidate of candidates) { try { return require.resolve(candidate, { paths: [root] }); } catch { /* installed-only */ } }
  return null;
}
function safeURL(raw) { try { const url = new URL(raw); return url.origin + url.pathname; } catch { return 'invalid-url'; } }
function permitted(raw, websocket = false) {
  try {
    const url = new URL(raw);
    return url.hostname === '127.0.0.1' && url.port === '5188' && url.protocol === (websocket ? 'ws:' : 'http:') &&
      (websocket ? url.pathname === '/' : !/^\/api(?:\/|$)|(?:^|\/)\.env(?:\.|\/|$)|firebase|credential|private.key/i.test(url.pathname));
  } catch { return false; }
}
function button(page, name) { return page.getByRole('button', { name, exact: true }); }
// Playwright includes descendant textarea text in a wrapping label's text.
// Match the exact caption child, retaining the native label→textarea relation.
function privateField(page, caption) {
  return page.locator('label').filter({ has: page.getByText(caption, { exact: true }) }).locator('textarea');
}
function summary(page) { return privateField(page, 'Resumen del coach · borrador privado'); }
function feedback(page) { return page.getByPlaceholder('Escribe un comentario que verá el cliente en su recap...', { exact: true }); }
function notes(page) { return page.getByPlaceholder('Notas internas que nunca se comparten con el cliente...', { exact: true }); }
async function control(page, name, ...args) {
  return page.evaluate(({ name, args }) => {
    const fixture = window.__recapFixture;
    if (!fixture || typeof fixture[name] !== 'function') throw new Error(`Missing fixture control ${name}`);
    return fixture[name](...args);
  }, { name, args });
}
async function calls(page, method) {
  return page.evaluate((method) => window.__recapFixture.calls.filter((call) => !method || call.method === method), method);
}
async function waitEnabled(locator) { await locator.waitFor({ state: 'visible' }); await locator.page().waitForFunction((element) => !element.disabled, await locator.elementHandle()); }
async function visible(locator) { await locator.waitFor({ state: 'visible' }); }
async function textContains(locator, text) { await locator.page().waitForFunction(({ element, text }) => element.textContent.includes(text), { element: await locator.elementHandle(), text }); }
async function screenshot(page, name, fullPage = true) {
  await page.screenshot({ path: path.join(output, `${name}.png`), animations: 'disabled', fullPage });
}
async function failureDiagnostics(page, name, record) {
  const snapshot = await page.evaluate(() => {
    const main = document.querySelector('main');
    const fields = [...(main?.querySelectorAll('textarea') ?? [])].map((field) => {
      const box = field.getBoundingClientRect(), style = getComputedStyle(field);
      return { value: field.value, disabled: field.disabled, labels: [...field.labels].map((label) => ({
        fullText: label.textContent, caption: label.querySelector('span')?.textContent ?? null,
      })), display: style.display, visibility: style.visibility, box: { width: box.width, height: box.height } };
    });
    const privateLabel = [...(main?.querySelectorAll('label') ?? [])].find((label) => label.querySelector('span')?.textContent?.trim() === 'Resumen del coach · borrador privado');
    return { route: location.pathname, mainText: main?.innerText ?? null, fields,
      editorText: privateLabel?.parentElement?.innerText ?? null,
      publishedPreviewText: main?.querySelector('section[aria-label="Última revisión publicada"]')?.textContent ?? null,
      captions: ['Resumen del coach · borrador privado', 'Cambios realizados · borrador privado', 'Objetivos de la próxima semana · borrador privado'].map((caption) => ({
        caption, matches: [...(main?.querySelectorAll('label > span') ?? [])].filter((span) => span.textContent?.trim() === caption).length,
      })), reportPresent: !!document.querySelector('#recap-print-report') };
  });
  snapshot.controlErrors = [];
  snapshot.auth = await control(page, 'authState').catch((error) => { snapshot.controlErrors.push(String(error)); return null; });
  snapshot.syntheticRecapResponses = await control(page, 'recapResponses').catch((error) => { snapshot.controlErrors.push(String(error)); return []; });
  fs.writeFileSync(path.join(output, `${name}-failure-dom.json`), JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(path.join(output, `${name}-failure-page.html`), await page.content());
  record.diagnostics = { dom: `${name}-failure-dom.json`, html: `${name}-failure-page.html`, fieldCount: snapshot.fields.length,
    captions: snapshot.captions, auth: snapshot.auth, syntheticResponseCount: snapshot.syntheticRecapResponses.length };
}
async function geometry(page) {
  const measurements = await page.evaluate(() => {
    const main = document.querySelector('main');
    return { document: [document.documentElement.scrollWidth, innerWidth], main: main ? [main.scrollWidth, main.clientWidth] : null };
  });
  for (const [name, size] of Object.entries(measurements)) if (size) assert.ok(size[0] <= size[1] + 1, `${name} overflows: ${size}`);
  return measurements;
}
async function pdfText(filename, buffer) {
  // No installation, network, shell interpolation or production environment.
  const env = {};
  for (const key of ['PATH', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR']) if (process.env[key]) env[key] = process.env[key];
  const local = spawnSync('pdftotext', ['-layout', filename, '-'], { encoding: 'utf8', env, timeout: 20000, maxBuffer: 10 * 1024 * 1024, windowsHide: true });
  if (!local.error && local.status === 0) return { tool: 'installed pdftotext', text: local.stdout };
  const pdfjs = resolveInstalled('pdfjs-dist/legacy/build/pdf.mjs');
  if (pdfjs) {
    const module = await import(pathToFileURL(pdfjs).href);
    const document = await module.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false, isEvalSupported: false, disableFontFace: true }).promise;
    try {
      const pages = [];
      for (let number = 1; number <= document.numPages; number++) {
        const content = await (await document.getPage(number)).getTextContent();
        pages.push(content.items.map((item) => item.str ?? '').join(' '));
      }
      return { tool: 'installed pdfjs-dist', text: pages.join('\n') };
    } finally { await document.destroy(); }
  }
  const pdfParse = resolveInstalled('pdf-parse');
  if (pdfParse) {
    const module = require(pdfParse);
    if (typeof module === 'function') return { tool: 'installed pdf-parse', text: (await module(buffer)).text };
    if (module.PDFParse) {
      const parser = new module.PDFParse({ data: buffer });
      try { return { tool: 'installed pdf-parse', text: (await parser.getText()).text }; } finally { await parser.destroy(); }
    }
  }
  return { tool: null, text: null, limitation: 'PDF text NOT_VERIFIED: no supported installed parser. Chrome print DOM/layout and PDF binary verified, not extracted PDF text or visual legibility.' };
}
async function printProof(page, record, suffix, expected, absent = [], minimumPages = 1) {
  await waitEnabled(button(page, 'Imprimir / Guardar PDF'));
  const priorCalls = await page.evaluate(() => window.__nativePrintCalls ?? 0);
  await button(page, 'Imprimir / Guardar PDF').click();
  assert.equal(await page.evaluate(() => window.__nativePrintCalls), priorCalls + 1, 'Shipping print control calls native window.print');
  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.emulateMedia({ media: 'print' });
  try {
    const dom = await page.locator('#recap-print-report').evaluate((article) => {
      const box = article.getBoundingClientRect();
      const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
      let node, maxRight = box.left, minLeft = box.right, lineRects = 0;
      while ((node = walker.nextNode())) {
        if (node.parentElement?.closest('style')) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        for (const rect of range.getClientRects()) if (rect.width > 0) { maxRight = Math.max(maxRight, rect.right); minLeft = Math.min(minLeft, rect.left); lineRects++; }
      }
      const p = article.querySelector('p'), heading = article.querySelector('h2');
      const paragraphCSS = getComputedStyle(p), headingCSS = getComputedStyle(heading);
      return { text: article.innerText, box: { left: box.left, right: box.right, width: box.width }, minLeft, maxRight, lineRects,
        controls: article.querySelectorAll('button, textarea, input, a, img').length,
        headings: [...article.querySelectorAll('h2')].map((item) => item.textContent),
        styles: { whiteSpace: paragraphCSS.whiteSpace, overflowWrap: paragraphCSS.overflowWrap, orphans: paragraphCSS.orphans, widows: paragraphCSS.widows, headingBreak: headingCSS.breakAfter },
        visibleMain: getComputedStyle(document.querySelector('#root')).display };
    });
    // Retain real PDF/layout artifacts even when a contract assertion fails.
    await screenshot(page, `${record.name}-${suffix}-print-layout`);
    const filename = path.join(output, `${record.name}-${suffix}.pdf`);
    const binary = await page.pdf({ path: filename, format: 'A4', preferCSSPageSize: true, printBackground: true });
    assert.equal(binary.subarray(0, 5).toString(), '%PDF-');
    assert.ok(binary.subarray(-1024).toString().includes('%%EOF'), 'PDF must have a complete trailer');
    const pageCount = (binary.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length;
    assert.ok(pageCount >= minimumPages, `Actual PDF pages ${pageCount}, expected >=${minimumPages}`);
    const extracted = await pdfText(filename, binary);
    if (extracted.text !== null) fs.writeFileSync(path.join(output, `${record.name}-${suffix}-pdf-text.txt`), extracted.text);
    const proof = { suffix, filename: path.basename(filename), pageCount, sha256: crypto.createHash('sha256').update(binary).digest('hex'), dom,
      parser: extracted.tool, pdfTextStatus: extracted.text === null ? 'NOT_VERIFIED' : 'EXTRACTED_NOT_VERIFIED', limitation: extracted.limitation ?? null };
    record.printProofs.push(proof);
    assert.doesNotMatch(dom.text, privatePattern);
    assert.equal(dom.controls, 0); assert.equal(dom.visibleMain, 'none');
    assert.ok(dom.box.width > 500 && dom.lineRects > 10, 'Actual print CSS must be loaded');
    assert.ok(dom.maxRight <= dom.box.right + 1 && dom.minLeft >= dom.box.left - 1, 'Print text wraps within report width');
    assert.equal(dom.styles.whiteSpace, 'pre-wrap'); assert.equal(dom.styles.overflowWrap, 'anywhere');
    assert.equal(dom.styles.headingBreak, 'avoid'); assert.equal(dom.styles.orphans, '3'); assert.equal(dom.styles.widows, '3');
    for (const text of expected) assert.ok(dom.text.includes(text), `Missing report text ${text}`);
    for (const text of absent) assert.ok(!dom.text.includes(text), `Unexpected report text ${text}`);
    if (extracted.text !== null) {
      assert.doesNotMatch(extracted.text, privatePattern);
      const normalized = extracted.text.replace(/\s+/g, '');
      for (const text of expected) assert.ok(normalized.includes(text.replace(/\s+/g, '')), `Missing actual PDF text ${text}`);
      for (const text of absent) assert.ok(!normalized.includes(text.replace(/\s+/g, '')), `Unexpected actual PDF text ${text}`);
      proof.pdfTextStatus = 'PASS';
    }
  } finally { await page.emulateMedia({ media: 'screen' }); await page.setViewportSize(originalViewport); }
}
async function caseRun(name, viewport, theme, route, body) {
  const profile = path.join(output, `p-${String(results.length + 1).padStart(2, '0')}`);
  assert.ok(profile.length <= 160, `Chrome profile path budget exceeded (${profile.length})`);
  fs.mkdirSync(profile); // Explicit persistent profile: close never removes this directory.
  const context = await chromium.launchPersistentContext(profile, { executablePath, headless: true, env: browserEnv,
    viewport, colorScheme: theme, serviceWorkers: 'block',
    args: ['--disable-background-networking', '--disable-component-update', '--disable-breakpad', '--disable-crash-reporter', '--no-first-run'] });
  const record = { name, viewport, theme, profile, profilePathLength: profile.length, status: 'RUNNING', escapes: [], pageErrors: [], printProofs: [] };
  results.push(record);
  // Both fences precede all navigation; HTTP API never runs (fixture adapter only).
  await context.route('**/*', async (route) => {
    if (!permitted(route.request().url())) { record.escapes.push(safeURL(route.request().url())); await route.abort('blockedbyclient'); return; }
    await route.continue();
  });
  if (typeof context.routeWebSocket !== 'function') { await context.close(); throw new Error('Missing routeWebSocket: refusing unfenced run'); }
  await context.routeWebSocket('**/*', (socket) => {
    if (!permitted(socket.url(), true)) { record.escapes.push(safeURL(socket.url())); socket.close(); return; }
    socket.connectToServer();
  });
  await context.addInitScript((theme) => {
    localStorage.setItem('exom-admin-theme', theme);
    window.__nativePrintCalls = 0;
    const nativePrint = window.print.bind(window);
    window.print = () => { window.__nativePrintCalls++; nativePrint(); };
  }, theme);
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(25000);
  page.on('pageerror', (error) => record.pageErrors.push(error.message));
  let acceptDialog = true;
  page.on('dialog', async (dialog) => { if (acceptDialog) await dialog.accept(); else await dialog.dismiss(); acceptDialog = true; });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  try {
    await page.goto(origin + route);
    await page.waitForFunction((marker) => window.__recapFixture?.marker === marker, marker);
    await page.waitForFunction((theme) => document.documentElement.classList.contains(theme), theme);
    await body(page, record, () => { acceptDialog = false; });
    record.geometry = await geometry(page);
    assert.deepEqual(await control(page, 'unsupported'), [], 'Unsupported fixture route/method');
    assert.deepEqual(record.escapes, [], 'External/sensitive network attempt');
    assert.deepEqual(record.pageErrors, [], 'Browser render error');
    record.status = 'PASS';
  } catch (error) {
    record.status = 'FAIL'; record.error = error.stack || String(error);
    await failureDiagnostics(page, name, record).catch((diagnosticError) => { record.diagnosticsError = String(diagnosticError); });
    await screenshot(page, `${name}-failure`, false).catch(() => undefined);
  } finally {
    record.calls = await calls(page).catch(() => []);
    await context.tracing.stop({ path: path.join(output, `${name}-trace.zip`) });
    await context.close();
    fs.writeFileSync(path.join(output, `${name}.json`), JSON.stringify(record, null, 2));
    console.log(`${record.status}: ${name}`);
  }
}
async function matrixFlow(page, record, dismiss) {
  // Client detail, shell, Progress, FollowUpPanel, RecapsList and recap detail are shipping imports.
  await visible(page.getByRole('heading', { name: 'Cliente Sintético A', exact: true }));
  await screenshot(page, `${record.name}-client-detail`);
  await control(page, 'navigate', `/progress?clientId=${ids.a}&section=seguimiento&period=3m&date=2026-10-07`);
  await visible(button(page, 'Nueva tarea'));
  await page.getByRole('tab', { name: 'Recaps', exact: true }).click();
  await visible(page.getByRole('link', { name: 'Abrir', exact: true }).first());
  assert.ok((await calls(page, 'get')).some((call) => call.path === '/recaps' && call.params.client_id === ids.a && call.params.page === 1 && call.params.limit === 20));
  assert.equal(await page.getByText('Cliente Sintético B', { exact: true }).count(), 0);
  record.listGeometry = await geometry(page);
  await screenshot(page, `${record.name}-scoped-list`, false);
  await button(page, 'Siguiente').click();
  await page.waitForFunction(() => window.__recapFixture.calls.some((call) => call.path === '/recaps' && call.params.page === 2));
  await button(page, 'Anterior').click();
  const link = page.locator(`a[href^="/recaps/recap-a?"]`);
  await visible(link);
  const href = await link.getAttribute('href');
  const returnTo = new URL(href, origin).searchParams.get('returnTo');
  assert.equal(new URL(returnTo, origin).searchParams.get('clientId'), ids.a);
  assert.equal(new URL(returnTo, origin).searchParams.get('section'), 'seguimiento');
  assert.equal(new URL(returnTo, origin).searchParams.get('period'), '3m');
  await link.click(); await visible(summary(page));
  await page.getByRole('link', { name: 'Volver a seguimiento', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/progress' && url.searchParams.get('clientId') === ids.a && url.searchParams.get('section') === 'seguimiento');
  await page.getByRole('tab', { name: 'Recaps', exact: true }).click(); await link.click(); await visible(summary(page));
  await printProof(page, record, 'before', ['RESUMEN_PUBLICADO_ANTERIOR', 'FINAL_RESUMEN_ANTERIOR', 'CAMBIOS_PUBLICADOS', 'OBJETIVOS_PUBLICADOS', 'W'.repeat(2900), 'FINAL_RESPUESTA_CLIENTE', 'FEEDBACK_LEGACY_ENVIADO'], [], 3);
  const nextSummary = `NUEVO_RESUMEN_CONFIRMADO\n${'Resumen nuevo publicado tras confirmación explícita. '.repeat(35)}\nFINAL_NUEVO_RESUMEN`;
  await summary(page).fill(nextSummary);
  await privateField(page, 'Cambios realizados · borrador privado').fill('NUEVOS_CAMBIOS_CONFIRMADOS');
  await privateField(page, 'Objetivos de la próxima semana · borrador privado').fill(`NUEVOS_OBJETIVOS_CONFIRMADOS\n${'Z'.repeat(2900)}`);
  assert.equal(await button(page, 'Publicar revisión').isDisabled(), true);
  assert.equal(await button(page, 'Imprimir / Guardar PDF').isDisabled(), true);
  const preview = page.getByRole('region', { name: 'Última revisión publicada', exact: true });
  assert.ok((await preview.innerText()).includes('RESUMEN_PUBLICADO_ANTERIOR'));
  assert.ok(!(await preview.innerText()).includes('NUEVO_RESUMEN_CONFIRMADO'));
  await preview.scrollIntoViewIfNeeded();
  await screenshot(page, `${record.name}-draft-keeps-last-published`, false);
  // Browser back guard protects all local fields without any save/publication.
  await page.evaluate(() => history.back());
  await visible(page.getByRole('alertdialog')); await button(page, 'Permanecer').click();
  assert.equal(await summary(page).inputValue(), nextSummary);
  await button(page, 'Guardar borrador privado').click(); await waitEnabled(button(page, 'Publicar revisión'));
  const saves = (await calls(page, 'put')).filter((call) => call.path.endsWith('/review-draft'));
  assert.equal(saves.length, 1); assert.equal(saves[0].payload.expected_version, 3);
  assert.deepEqual(Object.keys(saves[0].payload).sort(), ['changes', 'coach_summary', 'expected_version', 'next_week_goals']);
  assert.equal((await calls(page, 'post')).length, 0);
  assert.ok((await preview.innerText()).includes('RESUMEN_PUBLICADO_ANTERIOR'));
  await button(page, 'Publicar revisión').click(); await button(page, 'Cancelar').click();
  assert.equal((await calls(page, 'post')).length, 0, 'Cancel must not publish');
  await button(page, 'Publicar revisión').click(); await button(page, 'Confirmar publicación').click();
  await textContains(preview, 'NUEVO_RESUMEN_CONFIRMADO');
  const posts = await calls(page, 'post');
  assert.equal(posts.length, 1); assert.equal(posts[0].path, '/recaps/recap-a/review-publish');
  assert.deepEqual(posts[0].payload, { expected_version: 4, confirm: true });
  await screenshot(page, `${record.name}-published`, false);
  await printProof(page, record, 'after', ['NUEVO_RESUMEN_CONFIRMADO', 'FINAL_NUEVO_RESUMEN', 'NUEVOS_CAMBIOS_CONFIRMADOS', 'NUEVOS_OBJETIVOS_CONFIRMADOS', 'Z'.repeat(2900), 'FEEDBACK_LEGACY_ENVIADO'], ['RESUMEN_PUBLICADO_ANTERIOR'], 2);
  // Version conflict: local draft and old publication remain; only explicit load resolves.
  await summary(page).fill('BORRADOR_LOCAL_CONFLICTO');
  await control(page, 'rejectNext', 'review-draft', 409);
  await button(page, 'Guardar borrador privado').click();
  await visible(page.getByText('Servidor: versión 6', { exact: true }));
  assert.equal(await summary(page).inputValue(), 'BORRADOR_LOCAL_CONFLICTO');
  assert.equal(await button(page, 'Guardar borrador privado').isDisabled(), true);
  assert.equal(await button(page, 'Publicar revisión').isDisabled(), true);
  dismiss(); await button(page, 'Descartar borrador y cargar versión').click();
  assert.equal(await summary(page).inputValue(), 'BORRADOR_LOCAL_CONFLICTO');
  await button(page, 'Descartar borrador y cargar versión').click();
  assert.equal(await summary(page).inputValue(), 'VERSIÓN_REMOTA_SINTÉTICA');
  assert.equal((await calls(page, 'post')).length, 1);
  // Legacy saves are independent; a private draft must survive and never enter legacy payload.
  await summary(page).fill('PRIVATE_DRAFT_SENTINEL_LOCAL');
  await notes(page).fill('INTERNAL_NOTE_SENTINEL_NEW'); await feedback(page).fill('FEEDBACK_LEGACY_NUEVO');
  await button(page, 'Guardar cambios').click();
  await page.waitForFunction(() => window.__recapFixture.calls.some((call) => call.path.endsWith('/review')));
  await textContains(page.locator('#recap-print-report'), 'FEEDBACK_LEGACY_NUEVO');
  assert.doesNotMatch(await page.locator('#recap-print-report').textContent(), privatePattern);
  assert.equal(await summary(page).inputValue(), 'PRIVATE_DRAFT_SENTINEL_LOCAL');
  const legacy = (await calls(page, 'put')).find((call) => call.path.endsWith('/review'));
  assert.deepEqual(legacy.payload, { admin_comments: 'INTERNAL_NOTE_SENTINEL_NEW', client_feedback_text: 'FEEDBACK_LEGACY_NUEVO' });
  assert.equal((await calls(page, 'post')).length, 1);
  assert.equal(await button(page, 'Imprimir / Guardar PDF').isDisabled(), true);
  await screenshot(page, `${record.name}-private-legacy`, false);
}
async function main() {
  verifySourceIdentity();
  playwrightPath = resolveInstalled('playwright');
  if (!playwrightPath) throw new Error('Installed Playwright missing; no install permitted');
  executablePath = (process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'));
  if (!executablePath) throw new Error('PROGRAMFILES is required to locate installed Chrome');
  if (!fs.existsSync(executablePath)) throw new Error('Installed Chrome missing; no download permitted');
  // Server identity must be proven before launching any browser/navigation.
  const response = await fetch(origin + '/', { redirect: 'error', signal: AbortSignal.timeout(5000) });
  assert.ok(response.ok && (await response.text()).includes(`content="${marker}"`), '5188 is not the prepared isolated T3C fixture server');
  output = path.join(__dirname, 'browser-output', `r-${crypto.randomBytes(4).toString('hex')}`);
  fs.mkdirSync(output); // Exclusive, no reuse/emptying of prior runs or profiles.
  assert.ok(output.length <= 150, `Short runtime path budget exceeded (${output.length}); stop without moving/deleting anything`);
  process.env.TEMP = output; process.env.TMP = output; process.env.TMPDIR = output;
  browserEnv = { TEMP: output, TMP: output, TMPDIR: output };
  for (const key of ['PATH', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'COMSPEC']) if (process.env[key]) browserEnv[key] = process.env[key];
  chromium = require(playwrightPath).chromium;
  for (const [device, viewport] of [['desktop', desktop], ['mobile', mobile]]) for (const theme of ['light', 'dark']) {
    await caseRun(`${device}-${theme}`, viewport, theme, `/clients/${ids.a}`, matrixFlow);
  }
  await caseRun('initial-loading-release', desktop, 'dark', '/recaps/recap-a?fixture=loading', async (page) => {
    await page.waitForFunction(() => window.__recapFixture.pending().length > 0);
    assert.equal(await summary(page).count(), 0); assert.equal(await button(page, 'Publicar revisión').count(), 0);
    await screenshot(page, 'initial-loading'); await control(page, 'release'); await visible(summary(page));
    assert.equal((await calls(page, 'post')).length, 0);
  });
  await caseRun('failed-conflict-consultation-retry', desktop, 'light', '/recaps/recap-a', async (page) => {
    await visible(summary(page)); await summary(page).fill('BORRADOR_REINTENTO_CONSULTA');
    await control(page, 'rejectNext', 'review-draft', 409); await control(page, 'failNextRead');
    await button(page, 'Guardar borrador privado').click();
    await visible(page.getByRole('status').filter({ hasText: 'No se pudo consultar la versión del servidor.' }));
    assert.equal(await summary(page).inputValue(), 'BORRADOR_REINTENTO_CONSULTA');
    assert.equal(await button(page, 'Guardar borrador privado').isDisabled(), true);
    await button(page, 'Consultar versión del servidor').click();
    await visible(page.getByText('Servidor: versión 4', { exact: true }));
    assert.equal((await calls(page, 'put')).length, 1); assert.equal((await calls(page, 'post')).length, 0);
  });
  await caseRun('lost-publish-no-duplicate', mobile, 'dark', '/recaps/recap-a', async (page) => {
    await visible(summary(page)); await summary(page).fill('PUBLICACION_ACEPTADA_RESPUESTA_PERDIDA');
    await button(page, 'Guardar borrador privado').click(); await waitEnabled(button(page, 'Publicar revisión'));
    await control(page, 'loseNextPublish');
    await button(page, 'Publicar revisión').click(); await button(page, 'Confirmar publicación').click();
    await visible(page.getByText('Servidor: versión 5', { exact: true }));
    assert.equal(await summary(page).inputValue(), 'PUBLICACION_ACEPTADA_RESPUESTA_PERDIDA');
    assert.equal(await button(page, 'Guardar borrador privado').isDisabled(), true);
    assert.equal(await button(page, 'Publicar revisión').isDisabled(), true);
    const snapshot = await control(page, 'snapshot');
    assert.equal(snapshot['recap-a'].published_coach_summary, 'PUBLICACION_ACEPTADA_RESPUESTA_PERDIDA');
    assert.equal((await calls(page, 'post')).length, 1);
    await button(page, 'Consultar versión del servidor').click();
    await visible(page.getByText('Servidor: versión 5', { exact: true }));
    assert.equal((await calls(page, 'post')).length, 1, 'GET recovery must never duplicate publication');
  });
  await caseRun('private-only-submitted', desktop, 'light', '/recaps/recap-submitted', async (page, record) => {
    await visible(summary(page));
    await printProof(page, record, 'private-only', ['FINAL_RESPUESTA_CLIENTE'], ['PRIVATE_DRAFT_SENTINEL', 'Resumen del coach', 'Cambios realizados', 'Objetivos de la próxima semana', 'UNSENT_FEEDBACK_SENTINEL', 'Revisión compartible'], 2);
  });
  await caseRun('unsent-draft', mobile, 'dark', '/recaps/recap-unsent', async (page) => {
    await visible(summary(page)); assert.equal(await summary(page).isDisabled(), true);
    assert.equal(await button(page, 'Imprimir / Guardar PDF').count(), 0);
    assert.equal(await page.locator('#recap-print-report').count(), 0);
    await visible(page.getByText('El cliente debe enviar el recap antes de que puedas redactar o publicar su revisión.', { exact: true }));
  });
  await caseRun('reviewed-unsent-feedback-contract', desktop, 'light', '/recaps/recap-reviewed-unsent', async (page, record) => {
    await visible(summary(page));
    // A deliberate contract sentinel, not a weakened assertion: current projection
    // may fail this until the parent dispositions reviewed-but-unsent legacy data.
    await printProof(page, record, 'unsent-feedback', ['RESUMEN_PUBLICADO_ANTERIOR'], ['UNSENT_FEEDBACK_SENTINEL'], 3);
  });
  await caseRun('global-inbox-default-links', desktop, 'dark', '/recaps', async (page) => {
    await visible(page.getByRole('link', { name: 'Abrir', exact: true }).first());
    const hrefs = await page.getByRole('link', { name: 'Abrir', exact: true }).evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    assert.ok(hrefs.every((href) => /^\/recaps\/[^?]+$/.test(href)), 'Global links must not acquire returnTo');
  });
  await caseRun('client-navigation-late-read', desktop, 'dark', '/recaps/recap-a', async (page) => {
    await visible(summary(page)); await control(page, 'hold', '/recaps/recap-a');
    await page.evaluate(() => { void window.__recapFixture.refresh(); });
    await page.waitForFunction(() => window.__recapFixture.pending().length > 0);
    await control(page, 'navigate', '/recaps/recap-b'); await visible(summary(page));
    await page.waitForFunction(() => [...document.querySelectorAll('textarea')].some((field) => field.value === 'BORRADOR_CLIENTE_B'));
    await control(page, 'release');
    await page.waitForFunction(() => window.__recapFixture.delivered().length > 0);
    assert.equal(await summary(page).inputValue(), 'BORRADOR_CLIENTE_B');
    assert.equal((await calls(page, 'post')).length, 0);
  });
  await caseRun('logout-late-read-same-account', mobile, 'light', '/recaps/recap-a', async (page) => {
    await visible(summary(page)); await control(page, 'hold', '/recaps/recap-a');
    await page.evaluate(() => { void window.__recapFixture.refresh(); });
    await page.waitForFunction(() => window.__recapFixture.pending().length > 0);
    await control(page, 'logout');
    await visible(page.getByRole('alert').filter({ hasText: 'Inicia sesión para consultar el recap.' }));
    assert.equal(await page.locator('#recap-print-report').count(), 0); assert.equal(await summary(page).count(), 0);
    await control(page, 'changeIdentity', false); await control(page, 'release');
    await page.waitForFunction(() => window.__recapFixture.delivered().some((item) => item.suppressed));
    await visible(summary(page)); assert.equal(await summary(page).inputValue(), 'PRIVATE_DRAFT_SENTINEL');
    assert.equal((await calls(page, 'post')).length, 0);
  });
  await caseRun('late-mutation-replacement-identity', desktop, 'dark', '/recaps/recap-a', async (page) => {
    await visible(summary(page)); await summary(page).fill('PRIVATE_DRAFT_SENTINEL_OLD_IDENTITY');
    await control(page, 'hold', '/recaps/recap-a/review-draft'); await button(page, 'Guardar borrador privado').click();
    await page.waitForFunction(() => window.__recapFixture.pending().length > 0);
    await control(page, 'changeIdentity', true); await control(page, 'release');
    await page.waitForFunction(() => window.__recapFixture.delivered().some((item) => item.suppressed));
    await visible(summary(page)); assert.equal(await summary(page).inputValue(), 'PRIVATE_DRAFT_SENTINEL');
    assert.equal(await button(page, 'Publicar revisión').isDisabled(), true); assert.equal((await calls(page, 'post')).length, 0);
  });
}
main().catch((error) => { console.error(error.stack || String(error)); results.push({ name: 'runner', status: 'FAIL', error: error.stack || String(error) }); }).finally(async () => {
  const proofs = results.flatMap((record) => (record.printProofs ?? []).map((proof) => ({ caseName: record.name, ...proof })));
  const missingPDFs = Object.entries(requiredPDFs).flatMap(([caseName, suffixes]) => suffixes
    .filter((suffix) => !proofs.some((proof) => proof.caseName === caseName && proof.suffix === suffix)).map((suffix) => `${caseName}:${suffix}`));
  const coverageComplete = proofs.length >= expectedRequiredPDFCount && missingPDFs.length === 0;
  const passed = results.length === 14 && results.every((record) => record.status === 'PASS') && coverageComplete;
  const pdfCoverageStatus = proofs.length === 0 ? 'NOT_RUN' : coverageComplete ? 'PASS' : 'INCOMPLETE';
  const pdfTextStatus = proofs.length === 0 ? 'NOT_RUN' : !coverageComplete ? 'INCOMPLETE' :
    proofs.every((proof) => proof.pdfTextStatus === 'PASS') ? 'PASS' : 'NOT_VERIFIED';
  if (output) fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ status: passed ? 'PASS' : 'FAIL', expectedCases: 14, playwrightPath, origin, output, runtimePathLength: output.length, retainedProfileCount: results.filter((record) => record.profile).length,
    sourceManifestSha256: manifestSha256, verifiedSourceCount: 13,
    pdfProofCount: proofs.length, expectedRequiredPDFCount, missingPDFs, pdfCoverageStatus, pdfTextStatus, results,
    limits: ['Synthetic API/auth only; no live Firebase/API/DB integration.', 'PNG/PDF artifacts require independent human legibility review; computed layout alone is not visual approval.', 'If no parser exists, PDF text/privacy is not independently extracted.', 'No ProtectedRoute/login-provider lifecycle claim; shipping UnsavedChangesGuard and shell are mounted with controlled auth.'] }, null, 2));
  console.log(`RESULT: ${passed ? 'PASS' : 'FAIL'}${output ? ` — ${output}` : ' — preflight produced no browser artifacts'}`);
  process.exitCode = passed ? 0 : 1;
});

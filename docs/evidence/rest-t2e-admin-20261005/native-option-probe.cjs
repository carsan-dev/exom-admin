'use strict';
// Authorized, app-free native-control diagnosis. No navigation, screenshots or tracing.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const installed = process.env.EXOM_PLAYWRIGHT_MODULE || path.resolve(root, '../docs/evidence/metrics-p1-20260916/browser-tools/node_modules/playwright');
const executable = process.env.EXOM_BROWSER_EXECUTABLE || (process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'));
  if (!executable) throw new Error('EXOM_BROWSER_EXECUTABLE or PROGRAMFILES is required to locate installed Chrome');
const output = path.join(__dirname, 'checkpoint', `native-option-probe-${crypto.randomUUID()}`);
const record = { kind: 'native-option-only', cases: [], networkAttempts: [], status: 'RUNNING' };
let browser;
async function main() {
  const modulePath = require.resolve(installed, { paths: [root] });
  const { chromium } = require(modulePath);
  assert.ok(fs.existsSync(executable), 'Installed Chrome missing; no download allowed');
  fs.mkdirSync(output, { recursive: true });
  process.env.TEMP = output; process.env.TMP = output; process.env.TMPDIR = output;
  const env = { TEMP: output, TMP: output, TMPDIR: output };
  for (const key of ['PATH', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'COMSPEC']) if (process.env[key]) env[key] = process.env[key];
  browser = await chromium.launch({ executablePath: executable, headless: true, env,
    args: ['--disable-background-networking', '--disable-component-update', '--disable-breakpad', '--disable-crash-reporter', '--no-first-run'] });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', async route => { record.networkAttempts.push(route.request().url()); await route.abort('blockedbyclient'); });
  await context.routeWebSocket('**/*', socket => { record.networkAttempts.push(socket.url()); socket.close(); });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  for (const wrapped of [false, true]) {
    const select = '<select aria-label="Assignee"><option value="">Choose</option><option value="historical" disabled selected>Historical</option><option value="eligible">Eligible</option></select>';
    await page.setContent(wrapped ? `<label>Assignee${select}</label>` : select);
    const option = page.getByRole('option', { name: 'Historical', exact: true });
    const control = page.getByRole('combobox', { name: 'Assignee', exact: true });
    const row = { wrappedInLabel: wrapped, isDisabled: await option.isDisabled(),
      dom: await option.evaluate(element => ({ tag: element.tagName, disabled: element.disabled, hasAttribute: element.hasAttribute('disabled'), selected: element.selected, value: element.value })),
      accessibleState: await option.ariaSnapshot(), disabledRoleMatches: await page.getByRole('option', { name: 'Historical', exact: true, disabled: true }).count(),
      keyboardValues: [] };
    record.cases.push(row);
    await control.focus();
    for (const key of ['Home', 'ArrowDown', 'ArrowUp']) {
      await page.keyboard.press(key);
      row.keyboardValues.push({ key, value: await control.inputValue() });
    }
    console.log(JSON.stringify(row, null, 2));
    assert.equal(row.dom.tag, 'OPTION');
    assert.equal(row.dom.disabled, true);
    assert.equal(row.dom.hasAttribute, true);
    assert.equal(row.disabledRoleMatches, 1);
    assert.deepEqual(row.keyboardValues.map(item => item.value), ['', 'eligible', '']);
  }
  assert.equal(record.cases[0].isDisabled, true, 'Bare option helper result');
  assert.equal(record.cases[1].isDisabled, false, 'Label-wrapped option retargets to enabled select');
  assert.deepEqual(record.networkAttempts, []);
  record.status = 'PASS';
  await context.close();
}
main().catch(error => { record.status = 'FAIL'; record.error = error.stack || String(error); console.error(record.error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (fs.existsSync(output)) fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(record, null, 2));
  console.log(`${record.status}: ${output}`);
});

// Dedicated browser/OS process lifetime; fixtures remain Vue-package owned.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { chromium } from 'playwright';

const nativeIME = process.argv.includes('--macos-ime');
if (nativeIME) assert.equal(process.platform, 'darwin', 'native macOS IME verification requires macOS');
const output = '.tasks/browser'; mkdirSync(output, { recursive: true });
const report = { sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), nativeIME, status: 'running', results: [] };
const server = spawn(process.execPath, ['packages/vue/scripts/serve-browser-verification.mjs'], {
  env: { ...process.env, SECTILE_BROWSER_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let browser, context, page, source;
const swift = '.tasks/browser/input-source';
const nativeKeys = (codes, control = false) => {
  assert.ok(codes.every(code => Number.isInteger(code) && code >= 0 && code < 128));
  // Quartz virtual-key events leave character translation to the active OS IME.
  const program = `ObjC.import('Cocoa'); ObjC.import('CoreGraphics');
    if (!$.CGPreflightPostEventAccess()) throw new Error('Quartz event posting is not permitted');
    function post(code, down) {
      const event = $.CGEventCreateKeyboardEvent(null, code, down);
      $.CGEventSetFlags(event, ${control ? '(code !== 59 || down) ? $.kCGEventFlagMaskControl : 0' : '0'});
      $.CGEventPost($.kCGHIDEventTap, event);
    }
    ${control ? 'post(59, true);' : ''}
    for (const code of ${JSON.stringify(codes)}) { post(code, true); post(code, false); $.NSThread.sleepForTimeInterval(0.08); }
    ${control ? 'post(59, false);' : ''}
    $.NSThread.sleepForTimeInterval(0.3);`;
  execFileSync('osascript', ['-l', 'JavaScript', '-e', program], { timeout: 10000 });
};
try {
  const url = await new Promise((resolve, reject) => {
    let log = '';
    const timer = setTimeout(() => reject(new Error(`browser server readiness timeout: ${log}`)), 20000);
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`browser server exited: ${code}: ${log}`)); });
    server.stderr.on('data', chunk => { log = (log + chunk).slice(-4000); });
    server.stdout.on('data', chunk => {
      log = (log + chunk).slice(-4000);
      const match = /browser verification ready: (http:\/\/127\.0\.0\.1:\d+)\//u.exec(log);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  browser = await chromium.launch({ headless: !nativeIME, ...(process.env['SECTILE_CHROMIUM_PATH'] ? { executablePath: process.env['SECTILE_CHROMIUM_PATH'] } : {}) });
  context = await browser.newContext();
  await context.tracing.start({ screenshots: true, snapshots: true });
  page = await context.newPage();
  const warnings = [], errors = [];
  page.on('console', message => { if (/Blocked aria-hidden/u.test(message.text())) warnings.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${url}/interactions`);
  await page.waitForFunction(() => window.sectileProbe !== undefined);
  await page.evaluate(() => window.sectileProbe.native());
  for (const id of ['native', 'text', 'combo']) {
    await page.locator(`#${id}`).focus(); await page.keyboard.type('abc');
    await page.keyboard.press('ControlOrMeta+z');
    assert.equal(await page.locator(`#${id}`).inputValue(), '');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    assert.equal(await page.locator(`#${id}`).inputValue(), 'abc');
    report.results.push({ id, undoRedo: 'passed' });
  }
  if (nativeIME) {
    execFileSync('swiftc', ['scripts/browser/macos-input-source.swift', '-o', swift], { timeout: 60000, stdio: 'inherit' });
    await page.evaluate(() => window.sectileProbe.native());
    await page.bringToFront();
    const application = basename(chromium.executablePath());
    assert.match(application, /^[A-Za-z -]+$/u);
    execFileSync('osascript', ['-e', `tell application "System Events" to set frontmost of first process whose name is "${application}" to true`], { timeout: 10000 });
    for (const id of ['native', 'text', 'combo']) {
      await page.locator(`#${id}`).focus();
      const selected = JSON.parse(execFileSync(swift, [], { encoding: 'utf8' }));
      source ??= selected.previous;
      nativeKeys([49], true);
      (report.sources ??= []).push(JSON.parse(execFileSync(swift, ['--inspect'], { encoding: 'utf8' })));
      nativeKeys([5, 40, 1]); // g k s -> 한, through the OS two-set IME.
      if (id === 'combo') await page.evaluate(() => window.sectileProbe.changeItems());
      nativeKeys([15, 46, 3, 36]); // r m f, Return -> 글 and commit.
      await page.waitForFunction(id => document.querySelector(`#${id}`).value === '한글', id);
      if (id !== 'native') await page.waitForFunction(id => window.sectileProbe.models()[id] === '한글', id);
      const events = await page.evaluate(id => window.sectileProbe.events.filter(event => event.id === id), id);
      assert.ok(events.some(event => event.type === 'compositionstart'), `${id}: input bypassed the OS IME`);
      assert.ok(events.some(event => event.type === 'compositionend'), `${id}: composition never committed`);
      report.results.push({ id, text: await page.locator(`#${id}`).inputValue(), events });
      // Native Backspace must remove both committed syllables.
      nativeKeys([51, 51]);
      await page.waitForFunction(id => document.querySelector(`#${id}`).value === '', id);
      if (id !== 'native') await page.waitForFunction(id => window.sectileProbe.models()[id] === '', id);
    }
    assert.deepEqual(await page.evaluate(() => window.sectileProbe.writes), [], 'framework rewrote a live composition');
  } else {
    const defects = await page.evaluate(() => window.sectileProbe.defects());
    assert.equal(defects.initialFocus, 'visible');
    assert.equal(defects.placeholder, 'Enter a number');
    assert.deepEqual(defects.spin, { errors: [], text: '0.16', focused: true });
    assert.equal(defects.rejected.text, '0.16');
    assert.equal(defects.rejected.errors.length, 1);
    for (const item of defects.keys) assert.equal(item.value, item.scenario === 'root' ? 'b' : 'a', JSON.stringify(item));
    report.results.push(defects);
    for (const portal of [false, true]) for (const controlled of [false, true]) {
      await page.evaluate(options => window.sectileProbe.popups(...options), [portal, controlled]);
      await page.locator('#parent-trigger').focus(); await page.keyboard.press('Enter');
      await page.locator('#child-trigger').focus(); await page.keyboard.press('Enter');
      await page.locator('#child-close').waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'child-trigger');
      await page.keyboard.press('Tab');
      assert.notEqual(await page.evaluate(() => document.activeElement.id), 'child-close');
      const cdp = await context.newCDPSession(page);
      const tree = await cdp.send('Accessibility.getFullAXTree');
      assert.ok(!tree.nodes.some(node => !node.ignored && node.role?.value === 'button' && node.name?.value === 'Close child'));
      await cdp.detach();
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'parent-trigger');
      await page.keyboard.press('Tab');
      assert.notEqual(await page.evaluate(() => document.activeElement.id), 'child-close');
      report.results.push({ portal, controlled, closed: true });
    }
  }
  assert.deepEqual(warnings, []);
  assert.deepEqual(errors, []);
  report.status = 'passed';
  await context.tracing.stop();
} catch (error) {
  report.status = 'failed'; report.error = error.stack;
  report.observed = await page?.evaluate(() => ({ active: document.activeElement?.id,
    inputs: [...document.querySelectorAll('input')].map(input => ({ id: input.id, value: input.value })),
    events: window.sectileProbe?.events, writes: window.sectileProbe?.writes,
  })).catch(() => undefined);
  await context?.tracing.stop({ path: `${output}/trace.zip` }).catch(() => {});
  throw error;
} finally {
  try { if (source !== undefined) execFileSync(swift, [source], { timeout: 10000 }); }
  finally {
    await browser?.close();
    server.kill('SIGTERM');
    writeFileSync(`${output}/result.json`, `${JSON.stringify(report, null, 2)}\n`);
  }
}
console.log(JSON.stringify(report));

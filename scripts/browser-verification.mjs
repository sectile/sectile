// Dedicated browser/OS process lifetime; fixtures remain Vue-package owned.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { basename, resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { publishedPackageDirectories } from './lib/published-packages.mjs';
import { validateTarballEntries } from './lib/packed-package-contract.mjs';

const nativeIME = process.argv.includes('--macos-ime');
const shardArgument = process.argv.find(argument => argument.startsWith('--shard='));
const tarballArgument = process.argv.find(argument => argument.startsWith('--tarball-directory='));
assert.deepEqual(process.argv.slice(2).filter(argument => argument !== '--macos-ime' && argument !== shardArgument && argument !== tarballArgument), [], 'unexpected browser verification argument');
assert.notEqual(tarballArgument?.slice('--tarball-directory='.length), '', 'tarball directory must not be empty');
const tarballDirectory = resolve(tarballArgument?.slice('--tarball-directory='.length) ?? '.tasks/verification/publication-packs');
const shard = shardArgument?.slice('--shard='.length).split('/').map(Number) ?? [1,1];
assert.ok(shard.length === 2 && shard.every(Number.isSafeInteger) && shard[0] >= 1 && shard[0] <= shard[1] && shard[1] <= 4, 'invalid browser shard');
if (nativeIME) assert.equal(process.platform, 'darwin', 'native macOS IME verification requires macOS');
const output = '.tasks/browser'; mkdirSync(output, { recursive: true });
const report = { sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), nativeIME, status: 'running', results: [] };
// Root owns artifact composition. The package server receives explicit aliases;
// it never reads sibling packages or reaches upwards for workspace policy.
const packedRoot = resolve(output, 'packages');
rmSync(packedRoot, { recursive: true, force: true });
const aliases = [];
report.artifacts = [];
for (const name of publishedPackageDirectories) {
  const manifest = JSON.parse(readFileSync(`packages/${name}/package.json`, 'utf8'));
  const tarball = join(tarballDirectory, `sectile-${name}-${manifest.version}.tgz`);
  // Preparation owns complete package admission. Recheck extraction safety,
  // then load the bytes once instead of repeating its full verification.
  validateTarballEntries(execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).trim().split('\n'));
  const directory = join(packedRoot, name); mkdirSync(directory, { recursive: true });
  execFileSync('tar', ['-xzf', tarball, '-C', directory]);
  const packed = JSON.parse(readFileSync(join(directory, 'package/package.json'), 'utf8'));
  assert.equal(packed.name, manifest.name); assert.equal(packed.version, manifest.version);
  for (const [subpath, entry] of Object.entries(packed.exports)) {
    const target = typeof entry === 'string' ? entry : entry.import ?? entry.default;
    if (typeof target !== 'string' || !target.endsWith('.js')) continue;
    aliases.push({ find: packed.name + (subpath === '.' ? '' : subpath.slice(1)), replacement: resolve(directory, 'package', target) });
  }
  report.artifacts.push({ name: packed.name, version: packed.version, sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex') });
}
aliases.sort((a,b) => b.find.length - a.find.length);
const server = spawn(process.execPath, ['packages/vue/scripts/serve-browser-verification.mjs'], {
  env: { ...process.env, SECTILE_BROWSER_PORT: '0', SECTILE_BROWSER_ALIASES: JSON.stringify(aliases) }, stdio: ['ignore', 'pipe', 'pipe'],
});
let browser, context, page, source, inputProcess, nativeSource;
const swift = '.tasks/browser/input-source';
const nativeKeys = codes => {
  assert.ok(codes.every(code => Number.isInteger(code) && code >= 0 && code < 128));
  execFileSync(swift, ['--type', ...codes.map(String)], { timeout: 10000 });
};
const typeNative = codes => new Promise((resolve, reject) => {
  assert.ok(codes.every(code => Number.isInteger(code) && code >= 0 && code < 128));
  const child = inputProcess = spawn(swift, ['--type', ...codes.map(String)], { stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = '';
  child.stderr.on('data', data => { errors = (errors + data).slice(-4000); });
  const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('native typing timeout')); }, 10000);
  child.once('error', error => { clearTimeout(timer); reject(error); });
  child.once('exit', code => {
    clearTimeout(timer); if (inputProcess === child) inputProcess = undefined;
    if (code === 0) resolve(); else reject(new Error(`native typing failed: ${code}: ${errors}`));
  });
});
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
  const observePage = target => {
    target.on('console', message => { if (/Blocked aria-hidden/u.test(message.text())) warnings.push(message.text()); });
    target.on('pageerror', error => errors.push(error.message));
  };
  observePage(page);
  await page.goto(`${url}/interactions`);
  await page.waitForFunction(() => window.sectileProbe !== undefined);
  const catalog = await page.evaluate(() => window.sectileProbe.inputFamilies);
  const selected = catalog.filter((_, index) => index % shard[1] === shard[0] - 1);
  const fields = nativeIME ? ['native','native-textarea', ...selected.filter(id => id !== 'native' && id !== 'native-textarea')] : selected;
  report.shard = shard; report.families = selected;
  for (const id of fields) {
    if(id !== 'pin') {
      await page.evaluate(id=>window.sectileProbe.reference(id),id);
      await page.locator('#native-reference').focus();await page.keyboard.press('ControlOrMeta+a');await page.keyboard.type('abc');
      await page.keyboard.press('ControlOrMeta+z');
    }
    const nativeUndo = id === 'pin' ? undefined : await page.locator('#native-reference').inputValue();
    if(id !== 'pin') await page.evaluate(()=>document.querySelector('#native-reference').remove());
    await page.evaluate(id => window.sectileProbe.field(id), id);
    const initial = await page.locator(`#${id}`).inputValue();
    if (id === 'pin') { report.results.push({ id, history: 'specialized per-cell admission; checked through native composition' }); continue; }
    await page.locator(`#${id}`).focus(); await page.keyboard.press('ControlOrMeta+a');
    await page.evaluate(() => { window.sectileProbe.valueWrites.length = 0; });
    await page.keyboard.type('abc');
    if (/^(date|time|datetime)-(start|end)$/u.test(id))
      assert.equal((await page.evaluate(() => window.sectileProbe.nativeState())).rangeDraft, 'abc', `${id}: native range owner did not observe the edit`);
    if (id === 'picker') assert.equal(await page.locator('#picker').getAttribute('placeholder'), 'YYYY-MM-DD', 'picker field binding was not initialized');
    assert.deepEqual(await page.evaluate(() => window.sectileProbe.valueWrites), [], `${id}: accepted native edit caused a value/selection projection`);
    await page.keyboard.press('ControlOrMeta+z');
    const undone = await page.locator(`#${id}`).inputValue();
    assert.equal(undone, nativeUndo ?? initial, `${id}: native undo; writes=${JSON.stringify(await page.evaluate(()=>window.sectileProbe.valueWrites.slice(-12)))}`);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    assert.equal(await page.locator(`#${id}`).inputValue(), 'abc', `${id}: native redo`);
    report.results.push({ id, undoRedo: 'passed' });
  }
  if (nativeIME) {
    execFileSync('swiftc', ['scripts/browser/macos-input-source.swift', '-o', swift], { timeout: 60000, stdio: 'inherit' });
    await page.bringToFront();
    const application = basename(chromium.executablePath());
    assert.match(application, /^[A-Za-z -]+$/u);
    execFileSync('osascript', ['-e', `tell application "System Events" to set frontmost of first process whose name is "${application}" to true`], { timeout: 10000 });
    for (const family of fields) for (const reference of ['native','native-textarea'].includes(family) ? [false] : [true,false]) {
      report.current = { family, reference };
      // Isolate each OS text-input client in its own browser process. Document
      // replacement and source switching did not isolate the plain HTML peers.
      // The continuation below stays in one input and process across its clear.
      await context.tracing.stop(); await browser.close();
      browser = await chromium.launch({ headless: false, ...(process.env['SECTILE_CHROMIUM_PATH'] ? { executablePath: process.env['SECTILE_CHROMIUM_PATH'] } : {}) });
      context = await browser.newContext(); await context.tracing.start({ screenshots: true, snapshots: true });
      page = await context.newPage(); observePage(page);
      await page.goto(`${url}/interactions`); await page.waitForFunction(() => window.sectileProbe !== undefined);
      await page.bringToFront();
      execFileSync('osascript', ['-e', `tell application "System Events" to set frontmost of first process whose name is "${application}" to true`], { timeout: 10000 });
      const id = reference ? 'native-reference' : family;
      const selected = nativeSource ??= JSON.parse(execFileSync(swift, [], { encoding: 'utf8' }));
      source ??= selected.previous;
      const menuScript = `on run argv
        set targetName to item 1 of argv
        tell application "System Events"
          repeat with processName in {"TextInputMenuAgent", "SystemUIServer", "ControlCenter"}
            if exists process (processName as text) then
              tell process (processName as text)
                repeat with bar in menu bars
                  repeat with entry in menu bar items of bar
                    try
                      click entry
                      delay 0.2
                      if exists menu item targetName of menu 1 of entry then
                        click menu item targetName of menu 1 of entry
                        return processName as text
                      end if
                    end try
                    key code 53
                  end repeat
                end repeat
              end tell
            end if
          end repeat
        end tell
        error "Native input menu item unavailable: " & targetName
      end run`;
      // Select both through the focused application's OS menu. CLI TIS selection
      // alone does not reset Chromium's per-application input-method context.
      for (const name of [selected.asciiName, selected.name])
        execFileSync('osascript', ['-e', menuScript, name], { timeout: 20000, stdio: ['ignore', 'pipe', 'inherit'] });
      await page.evaluate(({family,reference}) => reference ? window.sectileProbe.reference(family) : window.sectileProbe.field(family), {family,reference});
      await page.evaluate(() => { window.sectileProbe.nativeMutations.length = 0; });
      await page.locator(`#${id}`).focus();
      // The CLI's source query is diagnostic; the focused browser's actual
      // composition events and committed text are the authoritative witness.
      await page.bringToFront();
      await page.locator(`#${id}`).click();
      if (id === 'native') {
        // Cold input-method startup can precede its marked-text session. Prime
        // that OS session on the plain input before measuring the three fields.
        await typeNative([5, 40, 1, 36]);
        await page.waitForFunction(() => window.sectileProbe.events.some(event => event.id === 'native' && event.type === 'compositionend'), null, { timeout: 5000 });
        report.imeWarmup = await page.locator('#native').inputValue();
        execFileSync(swift, ['--type', '--command', '0'], { timeout: 10000 });
        nativeKeys([51]);
        await page.waitForFunction(() => document.querySelector('#native').value === '');
        await page.evaluate(() => { window.sectileProbe.events.length = 0; window.sectileProbe.writes.length = 0; });
      }
      execFileSync(swift, ['--type', '--command', '0'], { timeout: 10000 });
      // Keep one native typing session; no source-query process interrupts IME.
      await Promise.all([
        typeNative(family === 'pin' ? [5,40,1] : [5,40,1,15,46,3]),
        page.waitForFunction(id => window.sectileProbe.events.some(event => event.id === id && event.type === 'compositionstart'), id, { timeout: 5000 })
          .then(() => reference ? undefined : page.evaluate(() => window.sectileProbe.reconfigure())),
      ]);
      const expected = family === 'pin' ? '한' : '한글';
      assert.equal(await page.locator(`#${id}`).inputValue(), expected, `${id}: live composition value`);
      assert.equal(await page.evaluate(() => document.activeElement.id), id, `${id}: composition focus`);
      assert.deepEqual(await page.evaluate(() => window.sectileProbe.writes), [], `${id}: framework rewrote a live composition`);
      const multiline = await page.locator(`#${id}`).evaluate(element => element.tagName === 'TEXTAREA');
      nativeKeys([36]);
      (report.sources ??= []).push(JSON.parse(execFileSync(swift, ['--inspect'], { encoding: 'utf8' })));
      // Return commits the IME and retains the native textarea newline action.
      // The representation case is still an input when Return is delivered.
      const committed = multiline ? `${expected}\n` : expected;
      if (reference || ['native','native-textarea','text','combo','text-uncontrolled','textarea','text-representation','combo-uncontrolled','tree-select','tree-select-uncontrolled'].includes(id))
        await page.waitForFunction(({id,committed}) => document.querySelector(`#${id}`).value === committed, {id,committed});
      if (id === 'text' || id === 'combo') await page.waitForFunction(id => window.sectileProbe.models()[id] === '한글', id);
      const events = await page.evaluate(id => window.sectileProbe.events.filter(event => event.id === id), id);
      assert.ok(events.some(event => event.type === 'compositionstart'), `${id}: input bypassed the OS IME`);
      assert.ok(events.some(event => event.type === 'compositionend'), `${id}: composition never committed`);
      if (id === 'pin') assert.equal((await page.evaluate(() => window.sectileProbe.nativeState())).value, '한');
      if (id === 'tags') assert.deepEqual((await page.evaluate(() => window.sectileProbe.nativeState())).tags, ['한글']);
      if (id.startsWith('tree-select')) assert.equal((await page.evaluate(() => window.sectileProbe.nativeState())).value, expected);
      if (family === 'tags') {
        // OS setup must not hide a same-input continuation defect. Match
        // the token's accepted clear with the same write on its plain HTML peer.
        if (reference) await page.locator(`#${id}`).evaluate(element => { element.value = ''; });
        await typeNative([5,40,1,15,46,3,5,40,1]);
        // After a programmatic clear the OS may produce different text even on
        // the plain peer. Preserve its native output rather than correcting IME.
        const observed = await page.locator(`#${id}`).inputValue();
        const continued = await page.evaluate(id => window.sectileProbe.events.filter(event => event.id === id), id);
        assert.ok(continued.slice(events.length).some(event => event.type === 'compositionstart'), `${id}: continuation bypassed IME`);
        assert.equal(observed, continued.filter(event => event.type === 'input').at(-1).value, `${id}: continued native output was rewritten`);
        nativeKeys([36]);
        if (!reference) assert.deepEqual((await page.evaluate(() => window.sectileProbe.nativeState())).tags, ['한글',observed]);
        report.results.push({ family, reference, continuation: 'native-output-preserved', requested: '한글한', observed });
      }
      report.results.push({ id, family, reference, text: await page.locator(`#${id}`).inputValue(),
        compositionStarts: events.filter(event=>event.type==='compositionstart').length,
        compositionEnds: events.filter(event=>event.type==='compositionend').length, frameworkWrites: 0, reconfigured: !reference });
      // Remove both committed syllables and the textarea's native newline.
      if (await page.locator(`#${id}`).isVisible() && await page.locator(`#${id}`).inputValue() === committed && family !== 'pin') {
        nativeKeys(Array.from(committed, () => 51));
        await page.waitForFunction(id => document.querySelector(`#${id}`).value === '', id);
        if (id === 'text' || id === 'combo') await page.waitForFunction(id => window.sectileProbe.models()[id] === '', id);
      }
      assert.deepEqual(await page.evaluate(() => window.sectileProbe.writes), [], `${id}: framework rewrote a live composition`);
      if (reference) await page.locator('#native-reference').evaluate(element => element.remove());
    }
    assert.deepEqual(await page.evaluate(() => window.sectileProbe.writes), [], 'framework rewrote a live composition');
  } else {
    const positioning = await page.evaluate(() => window.sectileProbe.positioning());
    assert.equal(positioning.rows.length, 96);
    for (const row of positioning.rows) {
      assert.equal(row.nativeRoute, 'css-anchor', JSON.stringify(row));
      assert.equal(row.jsRoute, 'javascript', JSON.stringify(row));
      assert.ok(Math.abs(row.native.x - row.js.x) <= 0.5 && Math.abs(row.native.y - row.js.y) <= 0.5, JSON.stringify(row));
    }
    assert.equal(positioning.size.route, 'css-anchor');
    assert.ok(Math.abs(positioning.size.height - positioning.size.expected) <= 0.5, JSON.stringify(positioning.size));
    assert.equal(positioning.scroll.route, 'css-anchor');
    assert.ok(Math.abs(positioning.scroll.anchorX - positioning.scroll.popupX) <= 0.5, JSON.stringify(positioning.scroll));
    report.results.push({ id: 'positioning', ...positioning });
    for (const kind of ['popover', 'menu']) {
      await page.evaluate(kind => window.sectileProbe.composedTrigger(kind), kind);
      const button = page.locator('#composed-native'), original = await button.elementHandle();
      assert.equal(await button.count(), 1);
      await button.focus(); await page.getByRole('tooltip').waitFor({ state: 'visible' });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.sectileProbe.composed.open);
      await page.evaluate(() => window.sectileProbe.moveComposed());
      assert.equal(await button.evaluate((element, saved) => element === saved, original), true);
      await button.focus(); await page.keyboard.press('Escape');
      await page.waitForFunction(() => !window.sectileProbe.composed.open);
      await page.evaluate(() => window.sectileProbe.disableComposed());
      assert.equal(await button.isDisabled(), true);
      const count = await page.evaluate(() => window.sectileProbe.composed.requests.length);
      await button.evaluate(element => element.click());
      assert.equal(await page.evaluate(() => window.sectileProbe.composed.requests.length), count);
      assert.deepEqual(await page.evaluate(() => window.sectileProbe.composed.errors), []);
      await original.dispose(); report.results.push({ id: 'composed-trigger', kind, passed: true });
    }
    const toast = await page.evaluate(() => window.sectileProbe.toast());
    assert.deepEqual(toast, { prevented: false, focused: 'toast-input', queueUnchanged: true, count: 0 });
    await page.keyboard.press('F8');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'toast-viewport');
    report.results.push({ id: 'toast-keyless', ...toast, shortcut: 'passed' });
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
    for (const compound of [false, true]) {
      await page.evaluate(compound => window.sectileProbe.retainedDrawer(compound), compound);
      const trigger = await page.locator('#retained-trigger').elementHandle();
      await page.locator('#retained-trigger').click();
      await page.locator('[data-retained-panel][role=dialog]').waitFor();
      await page.locator('#retained-input').focus();
      await page.keyboard.press('Escape');
      await page.locator('[data-retained-panel][data-presentation=inline]').waitFor();
      assert.equal(await page.locator('#retained-trigger').evaluate((element, original) => element === original, trigger), true);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'retained-trigger');
      await trigger.dispose();
      report.results.push({ retainedDrawer: true, compound, restored: true });
    }
    await page.evaluate(() => window.sectileProbe.mediaGesture());
    await page.locator('#media-image').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'media-button');
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => window.sectileProbe.mediaStats.activations), 2);
    const image = await page.locator('#media-image').boundingBox();
    await page.mouse.move(image.x + 30, image.y + 30); await page.mouse.down();
    await page.mouse.move(image.x + 65, image.y + 35, { steps: 3 }); await page.mouse.up();
    await page.locator('#media-ordinary').click();
    const media = await page.evaluate(() => window.sectileProbe.mediaStats);
    assert.equal(media.activations, 2); assert.equal(media.ordinary, 1); assert.equal(media.starts, 1);
    assert.ok(media.moves > 0); assert.deepEqual(media.ends, ['complete']);
    report.results.push({ media });
    await page.evaluate(() => window.sectileProbe.reorder());
    await page.locator('#reorder-a').focus(); await page.keyboard.press('Space'); await page.keyboard.press('ArrowDown');
    let reorder = await page.evaluate(() => window.sectileProbe.reorderState());
    assert.deepEqual(reorder.items, ['a','b','c']); assert.deepEqual(reorder.preview.value.ids, ['b','a','c']);
    assert.equal(reorder.changes.length, 0); assert.equal(reorder.interaction.sourceID, 'a');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Space'); await page.keyboard.press('End'); await page.keyboard.press('Enter');
    reorder = await page.evaluate(() => window.sectileProbe.reorderState());
    assert.deepEqual(reorder.items, ['b','c','a']); assert.equal(reorder.changes.length, 1);
    assert.equal(reorder.interaction.sourceID, null); assert.equal(await page.evaluate(() => document.activeElement.id), 'reorder-a');
    report.results.push({ reorderPreview: 'passed' });
  }
  assert.deepEqual(warnings, []);
  assert.deepEqual(errors, []);
  report.status = 'passed';
  await context.tracing.stop();
} catch (error) {
  report.status = 'failed'; report.error = error.stack;
  report.observed = await page?.evaluate(() => ({ active: document.activeElement?.id,
    inputs: [...document.querySelectorAll('input')].map(input => ({ id: input.id, value: input.value })),
    events: window.sectileProbe?.events, writes: window.sectileProbe?.writes, valueWrites: window.sectileProbe?.valueWrites, nativeMutations: window.sectileProbe?.nativeMutations,
  })).catch(() => undefined);
  await context?.tracing.stop({ path: `${output}/trace.zip` }).catch(() => {});
  throw error;
} finally {
  inputProcess?.kill('SIGTERM');
  try { if (source !== undefined) execFileSync(swift, [source], { timeout: 10000 }); }
  finally {
    await browser?.close();
    server.kill('SIGTERM');
    writeFileSync(`${output}/result.json`, `${JSON.stringify(report, null, 2)}\n`);
  }
}
console.log(JSON.stringify(report));

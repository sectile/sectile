import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

// SafariDriver owns a native Safari session on the disposable macOS runner.
export async function verifySafari(url, report) {
  const port = await freePort();
  const driver = spawn('/usr/bin/safaridriver', ['-p', String(port)], { stdio: ['ignore', 'inherit', 'inherit'] });
  let driverError;
  driver.once('error', error => { driverError = error; });
  const command = async (method, path, body) => {
    if (driverError !== undefined) throw driverError;
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method, signal: AbortSignal.timeout(25_000),
      ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const { value } = await response.json();
    if (!response.ok) throw new Error(`SafariDriver ${method} ${path}: ${value.error}: ${value.message}`);
    return value;
  };
  let session;
  try {
    await waitFor(async () => {
      try { return (await command('GET', '/status')).ready; }
      catch (error) { if (driverError !== undefined || driver.exitCode !== null) throw error; return false; }
    }, 'SafariDriver startup');
    const opened = await command('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'safari' } } });
    session = '/session/' + opened.sessionId;
    assert.equal(opened.capabilities.browserName.toLowerCase(), 'safari');
    report.browserVersion = opened.capabilities.browserVersion;
    const post = (path, body) => command('POST', session + path, body);
    const evaluate = (script, ...args) => post('/execute/sync', { script, args });
    const mount = (...args) => post('/execute/async', {
      script: `const done = arguments[arguments.length - 1];
        const [name, ...args] = Array.from(arguments).slice(0, -1);
        window.sectileProbe[name](...args).then(() => done(null), error => done(String(error)));`,
      args,
    }).then(error => assert.equal(error, null));
    const element = async selector => {
      const value = await post('/element', { using: 'css selector', value: selector });
      const id = value['element-6066-11e4-a52e-4f735466cecf'];
      assert.equal(typeof id, 'string');
      return '/element/' + encodeURIComponent(id);
    };
    const keys = (input, text) => post(input + '/value', { text });

    await post('/url', { url: url + '/interactions' });
    await waitFor(() => evaluate('return window.sectileProbe !== undefined;'), 'Safari fixture readiness');
    await mount('composedTrigger', 'menu');
    const opener = await element('[data-composed-native]');
    await post(opener + '/click', {});
    await waitFor(() => evaluate('return window.sectileProbe.composed.open;'), 'Safari menu opening');
    assert.equal(await evaluate('return document.activeElement.matches("[data-composed-native]");'), true);
    await keys(opener, '\uE004');
    await waitFor(() => evaluate('return !window.sectileProbe.composed.open;'), 'Safari menu Tab dismissal');
    report.results.push({ id: 'safari-menu-pointer-and-tab', result: 'passed' });

    await mount('field', 'date');
    const date = await element('#date');
    await keys(date, '2026-08-22\uE007');
    assert.equal(await evaluate('return document.querySelector("#date").value;'), '2026-08-22');
    await keys(date, '\uE012'.repeat(4) + '\uE013');
    assert.equal(await evaluate('return document.querySelector("#date").value;'), '2026-09-22');
    await keys(date, '\uE014'.repeat(3) + '19\uE007');
    assert.equal(await evaluate('return document.querySelector("#date").value;'), '2026-09-19');
    report.results.push({ id: 'safari-date-segment-keyboard', result: 'passed' });
  } finally {
    try { if (session !== undefined) await command('DELETE', session); }
    finally { driver.kill('SIGTERM'); }
  }
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function waitFor(probe, label) {
  const deadline = Date.now() + 20_000;
  do {
    if (await probe()) return;
    await delay(100);
  } while (Date.now() < deadline);
  throw new Error(label + ' timed out');
}

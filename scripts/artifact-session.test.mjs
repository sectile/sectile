import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { artifactSessionEnvironment } from './lib/artifact-session.mjs';

const workerPath = fileURLToPath(new URL('./fixtures/artifact-session-worker.mjs', import.meta.url));

test('artifact sessions serialize processes after selecting an available test scope', { timeout: 30_000 }, async (context) => {
  const blocker = await provision(context, 'unrelated listener', 'occupy');
  const holder = await provision(context, 'DOM verification', 'hold', [blocker.scope]);
  assert.ok(holder.collisions.some(({ scope }) => scope === blocker.scope));
  assert.notEqual(holder.scope, blocker.scope);
  assert.equal(blocker.child.exitCode, null, 'scope selection must preserve the unrelated listener');

  const waiter = startWorker(context, 'Vue verification', 'run', holder.scope);
  await waiter.waitFor('waiting');
  assert.equal(waiter.messages.has('acquired'), false, 'the waiter must remain blocked until release');
  holder.child.send({ type: 'release' });
  await Promise.all([holder.waitFor('done'), waiter.waitFor('done')]);
  assert.equal(waiter.messages.has('acquired'), true);
  assert.equal((await holder.closed).code, 0);
  assert.equal((await waiter.closed).code, 0);

  blocker.child.send({ type: 'release' });
  await blocker.waitFor('done');
  assert.equal((await blocker.closed).code, 0);
});

test('artifact sessions recover when the owner process exits', { timeout: 30_000 }, async (context) => {
  const holder = await provision(context, 'crashed verification', 'hold');
  holder.child.kill('SIGKILL');
  assert.equal((await holder.closed).signal, 'SIGKILL');

  const successor = startWorker(context, 'successor verification', 'run', holder.scope);
  await successor.waitFor('acquired');
  await successor.waitFor('done');
  assert.equal((await successor.closed).code, 0);
});

test('worker failures settle every pending wait with the original diagnostic', async (context) => {
  const worker = startWorker(context, 'invalid verification', 'invalid', `failure-${randomUUID()}`);
  const results = await Promise.allSettled([worker.waitFor('acquired'), worker.waitFor('done')]);
  for (const result of results) {
    assert.equal(result.status, 'rejected');
    assert.match(result.reason.message, /invalid worker mode: invalid/u);
    assert.equal(result.reason.cause.phase, 'invalid');
  }
  assert.equal((await worker.closed).code, 1);
});

async function provision(context, label, mode, initialScopes = []) {
  const collisions = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const scope = initialScopes[attempt] ?? `session-test-${randomUUID()}`;
    const worker = startWorker(context, label, mode, scope);
    try {
      await worker.waitFor(mode === 'occupy' ? 'occupied' : 'acquired');
      return { ...worker, scope, collisions };
    } catch (error) {
      const failure = error.cause;
      const occupied = mode === 'occupy'
        ? failure?.phase === 'occupy' && failure.code === 'EADDRINUSE'
        : failure?.phase === mode && /^artifact session port \d+ is occupied by another process$/u.test(failure.message);
      if (!occupied) throw error;
      assert.equal((await worker.closed).code, 1);
      // Only test provisioning may choose a new scope; acquired scenarios never retry.
      collisions.push({ scope, message: failure.message });
    }
  }
  throw new Error(`could not provision an artifact test scope after ${collisions.length} occupied candidates`);
}

function startWorker(context, label, mode, scope) {
  const env = { ...process.env, SECTILE_ARTIFACT_LOCK_SCOPE: scope, SECTILE_ARTIFACT_WAIT_TIMEOUT_MS: '4000' };
  delete env[artifactSessionEnvironment];
  const child = spawn(process.execPath, [workerPath, label, mode], {
    env,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  const messages = new Map();
  const waiters = new Set();
  let stdout = '', stderr = '', termination = null, spawnError = null;
  const notify = () => { for (const waiter of waiters) waiter(); };
  child.on('message', (message) => { messages.set(message.type, message); notify(); });
  child.stdout.on('data', (chunk) => {
    stdout = (stdout + chunk.toString()).slice(-4096);
    if (/^… waiting for /mu.test(stdout)) messages.set('waiting', { type: 'waiting' });
    notify();
  });
  child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-4096); });
  child.on('error', (error) => { spawnError = error; notify(); });
  const closed = new Promise((resolve) => child.once('close', (code, signal) => {
    termination = { code, signal };
    notify();
    resolve(termination);
  }));
  context.after(async () => {
    if (child.pid !== undefined && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await closed;
  });

  const diagnostic = (reason) => {
    const failure = messages.get('failed');
    return new Error(`${reason}${failure ? `\n${failure.message}` : ''}\nstdout:\n${stdout}\nstderr:\n${stderr}`, {
      cause: failure ?? spawnError,
    });
  };
  function waitFor(type) {
    return new Promise((resolve, reject) => {
      let timeout;
      const cleanup = () => { clearTimeout(timeout); waiters.delete(check); };
      const check = () => {
        if (messages.has(type)) { cleanup(); resolve(messages.get(type)); }
        else if (messages.has('failed') || spawnError !== null || termination !== null) {
          cleanup();
          reject(diagnostic(`worker stopped before ${type}`));
        }
      };
      timeout = setTimeout(() => { cleanup(); reject(diagnostic(`timed out waiting for ${type}`)); }, 6_000);
      waiters.add(check);
      check();
    });
  }
  return { child, messages, waitFor, closed };
}

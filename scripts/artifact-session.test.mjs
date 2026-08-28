import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { artifactSessionEnvironment } from './lib/artifact-session.mjs';

const worker = new URL('./fixtures/artifact-session-worker.mjs', import.meta.url);

test('artifact sessions serialize separate verification processes', async (context) => {
  const scope = `serialize-${randomUUID()}`;
  const holder = startWorker('DOM verification', 350, scope);
  context.after(() => holder.kill('SIGKILL'));
  const holderDone = message(holder, 'done');
  await message(holder, 'acquired');

  const waiter = startWorker('Vue verification', 0, scope);
  context.after(() => waiter.kill('SIGKILL'));
  const waiterAcquired = message(waiter, 'acquired');
  const waiterDone = message(waiter, 'done');
  const early = await Promise.race([
    waiterAcquired.then(() => true),
    delay(100).then(() => false),
  ]);
  assert.equal(early, false, 'a dependent verification acquired the artifact session too early');

  await holderDone;
  await waiterAcquired;
  await waiterDone;
});

test('artifact sessions recover when the owner process exits', async (context) => {
  const scope = `recovery-${randomUUID()}`;
  const holder = startWorker('crashed verification', 10_000, scope);
  context.after(() => holder.kill('SIGKILL'));
  await message(holder, 'acquired');
  holder.kill('SIGKILL');
  await exited(holder);

  const successor = startWorker('successor verification', 0, scope);
  context.after(() => successor.kill('SIGKILL'));
  const successorDone = message(successor, 'done');
  await message(successor, 'acquired');
  await successorDone;
});

function startWorker(label, holdMilliseconds, scope) {
  const env = { ...process.env, SECTILE_ARTIFACT_LOCK_SCOPE: scope };
  delete env[artifactSessionEnvironment];
  return spawn(process.execPath, [worker.pathname, label, String(holdMilliseconds)], {
    env,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
}

function message(child, type) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`timed out waiting for ${type}${diagnostics(child)}`)), 4_000);
    const onMessage = (value) => {
      if (value?.type !== type) return;
      cleanup();
      resolve(value);
    };
    const onExit = (code, signal) => {
      cleanup();
      reject(new Error(`worker exited before ${type}: code=${code} signal=${signal}${diagnostics(child)}`));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.off('message', onMessage);
      child.off('exit', onExit);
    };
    child.on('message', onMessage);
    child.on('exit', onExit);
  });
}

function exited(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once('exit', resolve));
}

function diagnostics(child) {
  const stdout = child.stdout?.read()?.toString() ?? '';
  const stderr = child.stderr?.read()?.toString() ?? '';
  return stdout === '' && stderr === '' ? '' : `\nstdout:\n${stdout}\nstderr:\n${stderr}`;
}

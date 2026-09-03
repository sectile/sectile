import assert from 'node:assert/strict';
import test from 'node:test';
import { runVerificationSteps } from './lib/verification-runner.mjs';

test('verification runner stops at the first failure by default', async () => {
  const commands = [
    Object.freeze({ command: 'first', args: [], detail: 'first' }),
    Object.freeze({ command: 'second', args: [], detail: 'second' }),
    Object.freeze({ command: 'third', args: [], detail: 'third' }),
  ];
  const steps = [
    Object.freeze({ label: 'one', commands: Object.freeze(commands.slice(0, 2)) }),
    Object.freeze({ label: 'two', commands: Object.freeze(commands.slice(2)) }),
  ];
  const invoked = [];
  const reported = [];
  const result = await runVerificationSteps(steps, {
    onFailure: ({ command }) => { reported.push(command.detail); },
    run: (command) => {
      invoked.push(command.detail);
      return { status: command.detail === 'first' ? 1 : 0 };
    },
  });

  assert.deepEqual(invoked, ['first']);
  assert.deepEqual(reported, ['first']);
  assert.equal(result.status, 1);
  assert.equal(result.failures.length, 1);
});

test('verification runner can collect failures when explicitly requested', async () => {
  const commands = ['first', 'second', 'third'].map((detail) => Object.freeze({ command: detail, args: [], detail }));
  const invoked = [];
  const result = await runVerificationSteps([
    Object.freeze({ label: 'one', commands: Object.freeze(commands) }),
  ], {
    continueOnFailure: true,
    run: (command) => {
      invoked.push(command.detail);
      return { status: command.detail === 'second' ? 0 : 1 };
    },
  });
  assert.deepEqual(invoked, ['first', 'second', 'third']);
  assert.equal(result.failures.length, 2);
});

test('verification runner succeeds only when every command succeeds', async () => {
  const result = await runVerificationSteps([
    Object.freeze({
      label: 'clean',
      commands: Object.freeze([Object.freeze({ command: 'ok', args: [], detail: 'ok' })]),
    }),
  ], { run: () => ({ status: 0 }) });
  assert.equal(result.status, 0);
  assert.deepEqual(result.failures, []);
});

test('verification runner overlaps explicit parallel commands and stops before the next stage after failure', async () => {
  const commands = ['first', 'second', 'third'].map((detail) => Object.freeze({ command: detail, args: [], detail }));
  const invoked = [];
  let active = 0;
  let maximumActive = 0;
  const result = await runVerificationSteps([
    Object.freeze({
      label: 'parallel',
      parallel: true,
      commands: Object.freeze(commands.slice(0, 2)),
    }),
    Object.freeze({ label: 'later', commands: Object.freeze(commands.slice(2)) }),
  ], {
    run: (command) => {
      invoked.push(command.detail);
      return { status: 0 };
    },
    runAsync: async (command) => {
      invoked.push(command.detail);
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return { status: command.detail === 'first' ? 1 : 0 };
    },
  });

  assert.deepEqual(invoked, ['first', 'second']);
  assert.equal(maximumActive, 2);
  assert.equal(result.status, 1);
  assert.deepEqual(result.failures.map(({ command }) => command.detail), ['first']);
});

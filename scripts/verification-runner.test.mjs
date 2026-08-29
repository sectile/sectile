import assert from 'node:assert/strict';
import test from 'node:test';
import { runVerificationSteps } from './lib/verification-runner.mjs';

test('verification runner reports every failure without stopping later commands', () => {
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
  const result = runVerificationSteps(steps, {
    onFailure: ({ command }) => { reported.push(command.detail); },
    run: (command) => {
      invoked.push(command.detail);
      if (command.detail === 'first') return { status: 1 };
      if (command.detail === 'third') return { error: new Error('missing executable'), status: null };
      return { status: 0 };
    },
  });

  assert.deepEqual(invoked, ['first', 'second', 'third']);
  assert.deepEqual(reported, ['first', 'third']);
  assert.equal(result.status, 1);
  assert.equal(result.failures.length, 2);
});

test('verification runner succeeds only when every command succeeds', () => {
  const result = runVerificationSteps([
    Object.freeze({
      label: 'clean',
      commands: Object.freeze([Object.freeze({ command: 'ok', args: [], detail: 'ok' })]),
    }),
  ], { run: () => ({ status: 0 }) });
  assert.equal(result.status, 0);
  assert.deepEqual(result.failures, []);
});

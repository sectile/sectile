import assert from 'node:assert/strict';
import test from 'node:test';
import { runVerificationSteps } from './lib/verification-runner.mjs';

test('verification runner stops at the first failure by default', () => {
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
      return { status: command.detail === 'first' ? 1 : 0 };
    },
  });

  assert.deepEqual(invoked, ['first']);
  assert.deepEqual(reported, ['first']);
  assert.equal(result.status, 1);
  assert.equal(result.failures.length, 1);
});

test('verification runner can collect failures when explicitly requested', () => {
  const commands = ['first', 'second', 'third'].map((detail) => Object.freeze({ command: detail, args: [], detail }));
  const invoked = [];
  const result = runVerificationSteps([
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

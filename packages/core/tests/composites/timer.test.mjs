import assert from 'node:assert/strict';
import test from 'node:test';
import { applyTimerEvent, createTimerState, getTimerParts, getTimerProgress } from '../../dist/timer.js';

test('timer counts up to a target and emits completion once', () => {
  const policies = { startMs: 1_000, targetMs: 3_000 };
  let state = createTimerState(policies).value;
  state = applyTimerEvent(state, 'start', policies).value.state;
  const update = applyTimerEvent(state, { type: 'tick', elapsedMs: 5_000 }, policies).value;
  assert.deepEqual(update.state, { valueMs: 3_000, running: false, completed: true });
  assert.deepEqual(update.commands, [{ type: 'timer-completed', valueMs: 3_000 }]);
  assert.equal(getTimerProgress(update.state, policies).value, 100);
});

test('countdown pauses, resumes, resets, and restarts deterministically', () => {
  const policies = { countdown: true, startMs: 90_000 };
  let state = createTimerState(policies, 90_000, true).value;
  state = applyTimerEvent(state, { type: 'tick', elapsedMs: 30_250 }, policies).value.state;
  assert.deepEqual(getTimerParts(state.valueMs).value, { days: 0, hours: 0, minutes: 0, seconds: 59, milliseconds: 750 });
  state = applyTimerEvent(state, 'pause', policies).value.state;
  assert.equal(applyTimerEvent(state, { type: 'tick', elapsedMs: 20_000 }, policies).value.state.valueMs, 59_750);
  assert.deepEqual(applyTimerEvent(state, 'reset', policies).value.state, { valueMs: 90_000, running: false, completed: false });
  assert.deepEqual(applyTimerEvent(state, 'restart', policies).value.state, { valueMs: 90_000, running: true, completed: false });
});

test('timer rejects invalid time and policy values atomically', () => {
  assert.equal(createTimerState({ countdown: true, startMs: 1_000, targetMs: 2_000 }).ok, false);
  const state = createTimerState({ startMs: 0 }, 10, true).value;
  assert.equal(applyTimerEvent(state, { type: 'tick', elapsedMs: -1 }).ok, false);
});

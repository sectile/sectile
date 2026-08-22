import assert from 'node:assert/strict';
import test from 'node:test';
import { createTimer } from '../dist/timer.js';

test('terminal timer exposes deterministic ticking and conventional controls', () => {
  let completed = 0; const timer = createTimer({ countdown: true, startMs: 3_000, autoStart: true, onComplete: () => { completed += 1; } });
  timer.tick(1_250); assert.equal(timer.getSnapshot().state.valueMs, 1_750); assert.equal(timer.getParts().seconds, 1);
  timer.handleKeyboardInput({ key: 'space' }); timer.tick(1_000); assert.equal(timer.getSnapshot().state.valueMs, 1_750);
  timer.handleKeyboardInput({ key: 'space' }); timer.tick(2_000); assert.equal(timer.getSnapshot().state.completed, true); assert.equal(completed, 1);
  timer.handleKeyboardInput({ key: 'r' }); assert.equal(timer.getSnapshot().state.running, true);
});

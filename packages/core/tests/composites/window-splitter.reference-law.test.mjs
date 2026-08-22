import assert from 'node:assert/strict';
import test from 'node:test';
import { createRange } from '../../.verification-dist/structures/range.js';
import { applySliderEvent, createSliderState } from '../../.verification-dist/slider.js';
import { applyWindowSplitterEvent, createWindowSplitterState } from '../../.verification-dist/window-splitter.js';
import { unwrap } from '../support.mjs';

test('window splitter is observationally equivalent to the bounded slider algebra', () => {
  const range = unwrap(createRange({ origin: '0', step: '1', count: 5 }));
  for (let tick = 0; tick <= range.count; tick += 1) for (const event of [
    'increment', 'decrement', 'page-up', 'page-down', 'home', 'end', { type: 'set-tick', tick: 3 },
  ]) {
    assert.deepEqual(
      applyWindowSplitterEvent(range, unwrap(createWindowSplitterState(range, tick)), event),
      applySliderEvent(range, unwrap(createSliderState(range, tick)), event),
    );
  }
});

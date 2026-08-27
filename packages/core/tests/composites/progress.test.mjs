import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgressState, tryCreateProgressState } from '../../dist/progress.js';

test('Progress defaults to an immutable indeterminate state', () => {
  const state = createProgressState();
  assert.deepEqual(state, { max: '100', value: null, ratio: null, status: 'indeterminate' });
  assert.equal(Object.isFrozen(state), true);
});

test('Progress preserves exact determinate values and classifies completion', () => {
  const progressing = createProgressState({ value: '0.10', max: '0.3' });
  assert.deepEqual(progressing, {
    max: '0.3', value: '0.1', ratio: { numerator: 1n, denominator: 3n }, status: 'progressing',
  });
  assert.equal(Object.isFrozen(progressing.ratio), true);
  assert.equal(createProgressState({ value: '0', max: '1' }).status, 'progressing');
  assert.equal(createProgressState({ value: '1.0', max: '1' }).status, 'complete');
});

test('Progress rejects non-positive maxima and determinate values outside the range', () => {
  const cases = [
    [{ max: '0' }, 'progress-maximum-not-positive'],
    [{ max: '-1' }, 'progress-maximum-not-positive'],
    [{ max: '1', value: '-0.1' }, 'progress-value-outside-range'],
    [{ max: '1', value: '1.1' }, 'progress-value-outside-range'],
    [{ max: 'nope' }, 'invalid-decimal'],
  ];
  for (const [input, code] of cases) {
    const result = tryCreateProgressState(input);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, code);
  }
});

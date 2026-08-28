import assert from 'node:assert/strict';
import test from 'node:test';
import {
  distributionIsStable,
  distributionSnapshot,
  formatElapsed,
} from './adaptive-sampling.ts';

const options = {
  minimumSamples: 30,
  medianRelativeTolerance: 0.05,
  p95RelativeTolerance: 0.1,
} as const;

test('stops only after both the median and p95 stabilize with enough samples', () => {
  const previous = distributionSnapshot(Array.from({ length: 20 }, (_, index) => 10 + index / 100));
  const stable = distributionSnapshot(Array.from({ length: 30 }, (_, index) => 10 + index / 100));
  const unstable = distributionSnapshot([...Array.from({ length: 28 }, () => 10), 20, 21]);

  assert.equal(distributionIsStable(previous, stable, options), true);
  assert.equal(distributionIsStable(previous, unstable, options), false);
  assert.equal(distributionIsStable(previous, distributionSnapshot(Array.from({ length: 29 }, () => 10)), options), false);
});

test('formats elapsed time without implying false precision', () => {
  assert.equal(formatElapsed(9_500), '10s');
  assert.equal(formatElapsed(125_000), '2m 5s');
  assert.equal(formatElapsed(7_500_000), '2h 5m');
});

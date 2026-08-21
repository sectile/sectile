/* Law evidence: RNG-01 RNG-02 RNG-03 RNG-04 RNG-05 RNG-06 RNG-07 RNG-08 RNG-09 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createBoundedRange, createRange } from '../../.verification-dist/structures/range.js';
import { ReferenceRange } from '../../.verification-dist/internal/reference/structures/range.js';
import { unwrap } from '../support.mjs';

test('RNG-01,07,08: tick/value and ratio observations are exact inverses', () => {
  const configurations = [
    ['0', '1', 12],
    ['-3.25', '0.25', 24],
    ['0.1', '0.2', 15],
    ['100000000000000000000', '0.0001', 10],
  ];
  let cases = 0;
  for (const [origin, step, count] of configurations) {
    const model = new ReferenceRange(origin, step, count);
    for (let tick = 0; tick <= count; tick += 1) {
      const value = model.valueAt(tick);
      assert.equal(model.tickOf(value), tick);
      const ratio = model.ratioOfTick(tick);
      assert.equal(model.tickFromRatio(ratio, 'lower'), tick);
      assert.equal(model.tickFromRatio(ratio, 'upper'), tick);
      assert.equal(model.tickFromRatio(ratio, 'even-tick'), tick);
      cases += 1;
    }
  }
  assert.equal(cases, 65);
});

test('RNG-02..06: clamp and snap are closed, idempotent, monotone, and use explicit ties', () => {
  const model = new ReferenceRange('-1', '0.5', 8);
  const samples = ['-10', '-1', '-0.75', '-0.5', '0.25', '1', '3', '10'];
  for (const tie of ['lower', 'upper', 'even-tick']) {
    let previous = null;
    for (const sample of samples) {
      const clamped = model.clamp(sample);
      assert.equal(model.clamp(clamped), clamped);
      const snapped = model.snap(sample, tie);
      assert.notEqual(model.tickOf(snapped), null);
      assert.equal(model.snap(snapped, tie), snapped);
      if (previous !== null) assert.ok(Number(snapped) >= Number(previous));
      previous = snapped;
    }
  }
  assert.equal(model.snap('-0.75', 'lower'), '-1');
  assert.equal(model.snap('-0.75', 'upper'), '-0.5');
  assert.equal(model.snap('-0.25', 'even-tick'), '0');
});

test('RNG-09: a billion-tick range remains intensional and exact', () => {
  const range = unwrap(
    createRange({ origin: '10', step: '0.5', count: 1_000_000_000, maxCount: 1_000_000_000 }),
  );
  assert.equal(range.cardinality, 1_000_000_001);
  assert.equal(range.valueAt(999_999_999), '500000009.5');
  assert.equal(range.tickOf('500000009.5'), 999_999_999);
});

test('range construction is exact and rejects off-lattice or unbounded inputs', () => {
  assert.equal(createRange({ origin: '0', step: '0', count: 1 }).error.code, 'non-positive-step');
  assert.equal(createRange({ origin: '0', step: 'x', count: 1 }).error.code, 'invalid-decimal');
  assert.equal(createRange({ origin: '0', step: '1', count: -1 }).ok, false);
  assert.equal(createRange({ origin: '0', step: '1', count: Number.MAX_SAFE_INTEGER, maxCount: Number.MAX_SAFE_INTEGER }).error.code, 'cardinality-not-safe');
  assert.equal(createBoundedRange({ min: '0', max: '1', step: '0.3' }).error.code, 'endpoint-off-lattice');
  assert.equal(createBoundedRange({ min: '0', max: '0.001', step: '0.001', maxScale: 2 }).error.code, 'decimal-scale-ceiling-exceeded');
  assert.equal(createBoundedRange({ min: '0', max: '1000', step: '1', maxDecimalCodeUnits: 3 }).error.code, 'decimal-code-unit-ceiling-exceeded');
  const exact = unwrap(createBoundedRange({ min: '-0.3', max: '0.3', step: '0.1' }));
  assert.equal(exact.count, 6);
  assert.equal(exact.valueAt(3), '0');
});

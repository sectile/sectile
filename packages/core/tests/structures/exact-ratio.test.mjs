import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addExactRatios,
  clampExactRatio,
  compareExactRatios,
  createExactRatio,
  divideExactRatios,
  interpolateExactRatios,
  invertExactRatio,
  mapExactRatio,
  multiplyExactRatios,
  subtractExactRatios,
  tryCreateExactRatio,
} from '../../.verification-dist/structures/range.js';

const ratio = (numerator, denominator = 1n) => createExactRatio(numerator, denominator);

test('exact ratios reduce signs and zero to one canonical representation', () => {
  assert.deepEqual(ratio(6n, -8n), { numerator: -3n, denominator: 4n });
  assert.deepEqual(ratio(0n, -999n), { numerator: 0n, denominator: 1n });
  assert.equal(Object.isFrozen(ratio(1n, 2n)), true);
});

test('exact-ratio algebra agrees with rational identities', () => {
  const a = ratio(2n, 3n);
  const b = ratio(-5n, 7n);
  assert.deepEqual(addExactRatios(a, b), ratio(-1n, 21n));
  assert.deepEqual(subtractExactRatios(a, b), ratio(29n, 21n));
  assert.deepEqual(multiplyExactRatios(a, b), ratio(-10n, 21n));
  assert.deepEqual(divideExactRatios(a, b), ratio(-14n, 15n));
  assert.deepEqual(invertExactRatio(a), ratio(3n, 2n));
  assert.equal(compareExactRatios(a, b), 1);
  assert.deepEqual(clampExactRatio(ratio(2n), ratio(0n), ratio(1n)), ratio(1n));
});

test('interpolation and range mapping preserve endpoints and exact midpoints', () => {
  assert.deepEqual(interpolateExactRatios(ratio(10n), ratio(20n), ratio(0n)), ratio(10n));
  assert.deepEqual(interpolateExactRatios(ratio(10n), ratio(20n), ratio(1n)), ratio(20n));
  assert.deepEqual(interpolateExactRatios(ratio(10n), ratio(20n), ratio(1n, 2n)), ratio(15n));
  assert.deepEqual(mapExactRatio(ratio(15n), ratio(10n), ratio(20n), ratio(-1n), ratio(1n)), ratio(0n));
});

test('exact-ratio ceilings reject operands before unbounded work', () => {
  assert.equal(tryCreateExactRatio(256n, 1n, { maxNumeratorBits: 8 }).error.code, 'count-ceiling-exceeded');
  assert.equal(tryCreateExactRatio(1n, 256n, { maxDenominatorBits: 8 }).error.code, 'count-ceiling-exceeded');
  assert.equal(tryCreateExactRatio(1n, 0n).error.code, 'invalid-boundary');
  assert.throws(() => multiplyExactRatios(ratio(128n), ratio(2n), { maxNumeratorBits: 8 }), { code: 'count-ceiling-exceeded' });
  assert.throws(() => invertExactRatio(ratio(0n)), { code: 'invalid-boundary' });
  assert.throws(() => divideExactRatios(ratio(1n), ratio(0n)), { code: 'invalid-boundary' });
});

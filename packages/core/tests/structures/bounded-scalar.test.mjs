import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boundedRatio,
  formatRatioPercentage,
  midpointDecimal,
  tryParseBoundedScalar,
} from '../../dist/internal/kernel/bounded-scalar.js';

test('bounded scalar canonicalizes decimals and reduces exact ratios', () => {
  const result = tryParseBoundedScalar({ min: '-10.00', max: '30.0', value: '10.000' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    [result.value.canonicalMin, result.value.canonicalMax, result.value.canonicalValue],
    ['-10', '30', '10'],
  );
  assert.deepEqual(boundedRatio(result.value.value, result.value.min, result.value.max), {
    numerator: 1n,
    denominator: 2n,
  });
});

test('bounded scalar defines a degenerate ratio and exact midpoint', () => {
  const result = tryParseBoundedScalar({ min: '0.1', max: '0.3', value: '0.1' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(formatRatioPercentage(boundedRatio(result.value.value, result.value.min, result.value.max)), '0');
  assert.deepEqual(midpointDecimal(result.value.min, result.value.max), { coefficient: 2n, scale: 1 });

  const degenerate = tryParseBoundedScalar({ min: '5', max: '5', value: '5' });
  assert.equal(degenerate.ok, true);
  if (!degenerate.ok) return;
  assert.deepEqual(boundedRatio(degenerate.value.value, degenerate.value.min, degenerate.value.max), {
    numerator: 0n,
    denominator: 1n,
  });
});

test('bounded scalar enforces code-unit and scale ceilings', () => {
  const codeUnits = tryParseBoundedScalar(
    { min: '0', max: '100', value: '10' },
    { maxDecimalCodeUnits: 1 },
  );
  assert.equal(codeUnits.ok, false);
  if (!codeUnits.ok) assert.equal(codeUnits.error.code, 'decimal-code-unit-ceiling-exceeded');

  const scale = tryParseBoundedScalar(
    { min: '0', max: '1', value: '0.01' },
    { maxScale: 1 },
  );
  assert.equal(scale.ok, false);
  if (!scale.ok) assert.equal(scale.error.code, 'decimal-scale-ceiling-exceeded');
});

test('percentage formatting is deterministic and half-even', () => {
  assert.equal(formatRatioPercentage({ numerator: 1n, denominator: 3n }), '33.333333333333');
  assert.equal(formatRatioPercentage({ numerator: 1n, denominator: 8n }), '12.5');
});

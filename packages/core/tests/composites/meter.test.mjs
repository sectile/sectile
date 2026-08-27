import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeterState, tryCreateMeterState } from '../../dist/meter.js';

test('Meter defaults to an exact 0 through 100 measurement', () => {
  const state = createMeterState({ value: '25.00' });
  assert.deepEqual(state, {
    min: '0',
    max: '100',
    value: '25',
    low: '0',
    high: '100',
    optimum: '50',
    ratio: { numerator: 1n, denominator: 4n },
    zone: 'optimum',
  });
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.ratio), true);
});

test('Meter follows optimum, suboptimal, and even-less-good regions', () => {
  const input = { min: '0', max: '100', low: '30', high: '70', optimum: '10' };
  assert.equal(createMeterState({ ...input, value: '30' }).zone, 'optimum');
  assert.equal(createMeterState({ ...input, value: '70' }).zone, 'suboptimal');
  assert.equal(createMeterState({ ...input, value: '71' }).zone, 'even-less-good');

  const highOptimum = { ...input, optimum: '90' };
  assert.equal(createMeterState({ ...highOptimum, value: '70' }).zone, 'optimum');
  assert.equal(createMeterState({ ...highOptimum, value: '30' }).zone, 'suboptimal');
  assert.equal(createMeterState({ ...highOptimum, value: '29' }).zone, 'even-less-good');

  const middleOptimum = { ...input, optimum: '50' };
  assert.equal(createMeterState({ ...middleOptimum, value: '30' }).zone, 'optimum');
  assert.equal(createMeterState({ ...middleOptimum, value: '29' }).zone, 'suboptimal');
});

test('Meter supports negative and degenerate ranges with an exact midpoint', () => {
  const negative = createMeterState({ min: '-1.1', max: '0', value: '-0.55' });
  assert.equal(negative.optimum, '-0.55');
  assert.deepEqual(negative.ratio, { numerator: 1n, denominator: 2n });

  const degenerate = createMeterState({ min: '5', max: '5', value: '5' });
  assert.deepEqual(degenerate.ratio, { numerator: 0n, denominator: 1n });
});

test('Meter rejects values and thresholds instead of repairing them', () => {
  const cases = [
    [{ min: '0', max: '1', value: '2' }, 'meter-value-outside-range'],
    [{ min: '0', max: '1', value: '0', low: '-1' }, 'meter-threshold-outside-range'],
    [{ min: '0', max: '1', value: '0', low: '0.8', high: '0.2' }, 'meter-threshold-order-invalid'],
    [{ min: '1', max: '0', value: '0' }, 'inverted-bounds'],
    [{ min: '0', max: '1', value: 'nope' }, 'invalid-decimal'],
  ];
  for (const [input, code] of cases) {
    const result = tryCreateMeterState(input);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, code);
  }
});

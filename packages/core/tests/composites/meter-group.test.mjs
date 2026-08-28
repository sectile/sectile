import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeterGroupState, tryCreateMeterGroupState } from '../../.verification-dist/meter-group.js';

test('MeterGroup defaults to an immutable empty 0 through 100 partition', () => {
  const state = createMeterGroupState({ items: [] });
  assert.deepEqual(state, {
    max: '100',
    items: [],
    segments: [],
    total: '0',
    remaining: '100',
    ratio: { numerator: 0n, denominator: 1n },
    zone: 'optimum',
  });
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.items), true);
  assert.equal(Object.isFrozen(state.segments), true);
  assert.equal(Object.isFrozen(state.ratio), true);
});

test('MeterGroup preserves order and computes exact cumulative segments', () => {
  const state = createMeterGroupState({
    max: '0.6',
    items: [
      { id: 'alpha', value: '0.10' },
      { id: 'zero', value: '0' },
      { id: 'beta', value: '0.2' },
    ],
  });
  assert.deepEqual(state.items, [
    { id: 'alpha', value: '0.1' },
    { id: 'zero', value: '0' },
    { id: 'beta', value: '0.2' },
  ]);
  assert.deepEqual(state.segments, [
    {
      id: 'alpha',
      value: '0.1',
      start: '0',
      end: '0.1',
      valueRatio: { numerator: 1n, denominator: 6n },
      startRatio: { numerator: 0n, denominator: 1n },
      endRatio: { numerator: 1n, denominator: 6n },
    },
    {
      id: 'zero',
      value: '0',
      start: '0.1',
      end: '0.1',
      valueRatio: { numerator: 0n, denominator: 1n },
      startRatio: { numerator: 1n, denominator: 6n },
      endRatio: { numerator: 1n, denominator: 6n },
    },
    {
      id: 'beta',
      value: '0.2',
      start: '0.1',
      end: '0.3',
      valueRatio: { numerator: 1n, denominator: 3n },
      startRatio: { numerator: 1n, denominator: 6n },
      endRatio: { numerator: 1n, denominator: 2n },
    },
  ]);
  assert.equal(state.total, '0.3');
  assert.equal(state.remaining, '0.3');
  assert.deepEqual(state.ratio, { numerator: 1n, denominator: 2n });
  for (const item of state.items) assert.equal(Object.isFrozen(item), true);
  for (const segment of state.segments) {
    assert.equal(Object.isFrozen(segment), true);
    assert.equal(Object.isFrozen(segment.valueRatio), true);
    assert.equal(Object.isFrozen(segment.startRatio), true);
    assert.equal(Object.isFrozen(segment.endRatio), true);
  }
});

test('MeterGroup cumulative partition laws hold over bounded integer inputs', () => {
  for (let first = 0; first <= 8; first += 1) {
    for (let second = 0; second <= 8 - first; second += 1) {
      for (let third = 0; third <= 8 - first - second; third += 1) {
        const values = [first, second, third];
        const state = createMeterGroupState({
          max: '8',
          items: values.map((value, index) => ({ id: `item-${index}`, value: `${value}.0` })),
        });
        let cursor = 0;
        for (const [index, segment] of state.segments.entries()) {
          assert.equal(segment.id, `item-${index}`);
          assert.equal(segment.value, String(values[index]));
          assert.equal(segment.start, String(cursor));
          cursor += values[index];
          assert.equal(segment.end, String(cursor));
          assert.equal(segment.startRatio.numerator * 8n, BigInt(segment.start) * segment.startRatio.denominator);
          assert.equal(segment.endRatio.numerator * 8n, BigInt(segment.end) * segment.endRatio.denominator);
        }
        assert.equal(state.total, String(cursor));
        assert.equal(state.remaining, String(8 - cursor));
        assert.equal(state.ratio.numerator * 8n, BigInt(cursor) * state.ratio.denominator);
      }
    }
  }
});

test('MeterGroup reuses Meter threshold semantics for its aggregate zone', () => {
  const input = {
    max: '100',
    low: '30',
    high: '70',
    optimum: '10',
  };
  assert.equal(createMeterGroupState({ ...input, items: [{ id: 'a', value: '30' }] }).zone, 'optimum');
  assert.equal(createMeterGroupState({ ...input, items: [{ id: 'a', value: '70' }] }).zone, 'suboptimal');
  assert.equal(createMeterGroupState({ ...input, items: [{ id: 'a', value: '71' }] }).zone, 'even-less-good');
});

test('MeterGroup rejects invalid maxima, values, totals, and thresholds as construction errors', () => {
  const cases = [
    [{ max: '0', items: [] }, 'meter-group-maximum-not-positive'],
    [{ max: '-1', items: [] }, 'meter-group-maximum-not-positive'],
    [{ items: [{ id: 'a', value: '-0.1' }] }, 'meter-group-value-negative'],
    [{ max: '0.3', items: [{ id: 'a', value: '0.1' }, { id: 'b', value: '0.21' }] }, 'meter-group-total-exceeds-maximum'],
    [{ items: [{ id: 'a', value: 'nope' }] }, 'invalid-decimal'],
    [{ max: '10', low: '8', high: '2', items: [] }, 'meter-threshold-order-invalid'],
  ];
  for (const [input, code] of cases) {
    const result = tryCreateMeterGroupState(input);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, code);
      assert.equal(result.error.class, 'construction');
    }
  }
});

test('MeterGroup enforces stable identity and resource ceilings', () => {
  const cases = [
    [{ items: [{ id: 'a', value: '1' }, { id: 'a', value: '2' }] }, 'duplicate-id', 'construction'],
    [{ items: [{ id: 'long', value: '1' }], maxIDCodeUnits: 3 }, 'id-code-unit-ceiling-exceeded', 'resource-rejection'],
    [{ items: [{ id: 'a', value: '1' }], maxItems: 0 }, 'item-ceiling-exceeded', 'resource-rejection'],
    [{ items: [], maxItems: -1 }, 'invalid-max-items', 'construction'],
    [{ items: [], maxIDCodeUnits: 0 }, 'invalid-max-id-code-units', 'construction'],
    [{ items: [{ id: 'a', value: '1.23' }], maxScale: 1 }, 'decimal-scale-ceiling-exceeded', 'resource-rejection'],
    [{ max: '1000', items: [], maxDecimalCodeUnits: 3 }, 'decimal-code-unit-ceiling-exceeded', 'resource-rejection'],
  ];
  for (const [input, code, errorClass] of cases) {
    const result = tryCreateMeterGroupState(input);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, code);
      assert.equal(result.error.class, errorClass);
    }
  }
});

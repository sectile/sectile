import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeter, tryCreateMeter } from '../dist/meter.js';

test('Terminal Meter returns immutable exact-width plans', () => {
  const meter = createMeter({ value: '25', low: '20', high: '80', optimum: '50' });
  assert.deepEqual(meter.getRenderPlan(8), {
    ok: true,
    value: { width: 8, filledCells: 2, emptyCells: 6, zone: 'optimum' },
  });
  assert.equal(Object.isFrozen(meter.getRenderPlan(8).value), true);
  assert.deepEqual(meter.getRenderPlan(0), {
    ok: true,
    value: { width: 0, filledCells: 0, emptyCells: 0, zone: 'optimum' },
  });
});

test('Terminal Meter applies explicit exact-half tie policies', () => {
  const meter = createMeter({ value: '50' });
  assert.equal(meter.getRenderPlan(3, 'lower').value.filledCells, 1);
  assert.equal(meter.getRenderPlan(3, 'upper').value.filledCells, 2);
  assert.equal(meter.getRenderPlan(3, 'even-tick').value.filledCells, 2);
});

test('Terminal Meter synchronizes controlled snapshots without events', () => {
  let updates = 0;
  const meter = createMeter({ value: '0', onUpdate: () => { updates += 1; } });
  const result = meter.syncControlledValues({ value: '100' });
  assert.equal(result.ok, true);
  assert.equal(meter.getSnapshot().revision, 1);
  assert.equal(meter.getRenderPlan(7).value.filledCells, 7);
  assert.equal(updates, 1);

  const invalid = meter.syncControlledValues({ value: '101' });
  assert.equal(invalid.ok, false);
  assert.equal(meter.getSnapshot().revision, 1);
  assert.equal(tryCreateMeter({ value: '101' }).ok, false);
  assert.equal(meter.getRenderPlan(-1).ok, false);
});

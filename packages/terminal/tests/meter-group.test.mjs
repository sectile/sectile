import assert from 'node:assert/strict';
import test from 'node:test';
import { createMeterGroup, tryCreateMeterGroup } from '../dist/meter-group.js';

test('Terminal MeterGroup allocates every cell across segments and remaining capacity', () => {
  const group = createMeterGroup({
    max: '10',
    items: [{ id: 'a', value: '3' }, { id: 'b', value: '2' }],
  });
  const plan = group.getRenderPlan(10);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.deepEqual(plan.value, {
    width: 10,
    segments: [
      { id: 'a', startCell: 0, cellCount: 3 },
      { id: 'b', startCell: 3, cellCount: 2 },
    ],
    remainingStartCell: 5,
    remainingCells: 5,
    zone: 'optimum',
  });
  assert.equal(Object.isFrozen(plan.value), true);
  assert.equal(Object.isFrozen(plan.value.segments), true);
  for (const segment of plan.value.segments) assert.equal(Object.isFrozen(segment), true);
});

test('Terminal MeterGroup resolves largest-remainder ties by item order with remaining last', () => {
  const thirds = createMeterGroup({
    max: '3',
    items: [{ id: 'a', value: '1' }, { id: 'b', value: '1' }],
  });
  const narrow = thirds.getRenderPlan(2);
  assert.equal(narrow.ok, true);
  if (narrow.ok) {
    assert.deepEqual(narrow.value.segments.map((segment) => segment.cellCount), [1, 1]);
    assert.equal(narrow.value.remainingCells, 0);
  }
  const half = createMeterGroup({ max: '2', items: [{ id: 'a', value: '1' }] }).getRenderPlan(1);
  assert.equal(half.ok, true);
  if (half.ok) {
    assert.equal(half.value.segments[0].cellCount, 1);
    assert.equal(half.value.remainingCells, 0);
  }
});

test('Terminal MeterGroup allocation laws hold across bounded partitions and widths', () => {
  for (let first = 0; first <= 6; first += 1) {
    for (let second = 0; second <= 6 - first; second += 1) {
      for (let width = 0; width <= 15; width += 1) {
        const group = createMeterGroup({
          max: '6',
          items: [{ id: 'a', value: String(first) }, { id: 'b', value: String(second) }],
        });
        const firstPlan = group.getRenderPlan(width);
        const secondPlan = group.getRenderPlan(width);
        assert.deepEqual(secondPlan, firstPlan);
        assert.equal(firstPlan.ok, true);
        if (!firstPlan.ok) continue;
        const counts = firstPlan.value.segments.map((segment) => segment.cellCount);
        assert.equal(counts.reduce((sum, count) => sum + count, firstPlan.value.remainingCells), width);
        assert.ok(counts.every((count) => count >= 0));
        if (first === 0) assert.equal(counts[0], 0);
        if (second === 0) assert.equal(counts[1], 0);
        assert.equal(firstPlan.value.segments[0].startCell, 0);
        assert.equal(firstPlan.value.segments[1].startCell, counts[0]);
        assert.equal(firstPlan.value.remainingStartCell, counts[0] + counts[1]);
      }
    }
  }
});

test('Terminal MeterGroup supports exact decimals, synchronization, and invalid widths', () => {
  let updates = 0;
  const group = createMeterGroup({
    max: '0.3',
    items: [{ id: 'a', value: '0.1' }],
    onUpdate: () => { updates += 1; },
  });
  const plan = group.getRenderPlan(3);
  assert.equal(plan.ok, true);
  if (plan.ok) assert.deepEqual(plan.value.segments, [{ id: 'a', startCell: 0, cellCount: 1 }]);
  assert.equal(group.getRenderPlan(-1).ok, false);
  assert.equal(group.getRenderPlan(1.5).ok, false);

  const synchronized = group.syncControlledValues({ max: '0.3', items: [{ id: 'a', value: '0.2' }] });
  assert.equal(synchronized.ok, true);
  assert.equal(group.getSnapshot().revision, 1);
  assert.equal(updates, 1);
  const invalid = group.syncControlledValues({ max: '0.3', items: [{ id: 'a', value: '0.4' }] });
  assert.equal(invalid.ok, false);
  assert.equal(group.getSnapshot().revision, 1);
});

test('Terminal MeterGroup fallible factory rejects invalid state', () => {
  assert.equal(tryCreateMeterGroup({ max: '0', items: [] }).ok, false);
});

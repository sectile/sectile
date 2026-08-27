import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgress, tryCreateProgress } from '../dist/progress.js';

test('Terminal Progress returns stable indeterminate plans', () => {
  const progress = createProgress();
  assert.deepEqual(progress.getRenderPlan(8), {
    ok: true,
    value: { mode: 'indeterminate', width: 8, filledCells: null, emptyCells: null, status: 'indeterminate' },
  });
  assert.deepEqual(progress.getRenderPlan(0).value, {
    mode: 'indeterminate', width: 0, filledCells: null, emptyCells: null, status: 'indeterminate',
  });
});

test('Terminal Progress allocates exact determinate widths with explicit ties', () => {
  const progress = createProgress({ value: '50' });
  assert.equal(progress.getRenderPlan(3, 'lower').value.filledCells, 1);
  assert.equal(progress.getRenderPlan(3, 'upper').value.filledCells, 2);
  assert.equal(progress.getRenderPlan(3, 'even-tick').value.filledCells, 2);
  assert.deepEqual(createProgress({ value: '100' }).getRenderPlan(1).value, {
    mode: 'determinate', width: 1, filledCells: 1, emptyCells: 0, status: 'complete',
  });
});

test('Terminal Progress synchronizes controlled snapshots and validates render input', () => {
  let updates = 0;
  const progress = createProgress({ onUpdate: () => { updates += 1; } });
  assert.equal(progress.syncControlledValues({ value: '25' }).ok, true);
  assert.equal(progress.getSnapshot().revision, 1);
  assert.equal(progress.getRenderPlan(4).value.filledCells, 1);
  assert.equal(updates, 1);
  assert.equal(progress.syncControlledValues({ value: '101' }).ok, false);
  assert.equal(progress.getSnapshot().revision, 1);
  assert.equal(tryCreateProgress({ max: '0' }).ok, false);
  assert.equal(progress.getRenderPlan(-1).ok, false);
  assert.equal(progress.getRenderPlan(1, 'unsupported').ok, false);
});

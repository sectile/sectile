import assert from 'node:assert/strict';
import test from 'node:test';
import { applyChartPatchReference } from '../../.verification-dist/internal/reference/model.js';
import { createChartModel, tryApplyChartPatch } from '../../.verification-dist/model.js';

test('optimized model patching agrees with the independent array oracle', () => {
  let state = createChartModel({ layers: [{
    id: 'series',
    profile: 'ordered-series',
    data: Array.from({ length: 32 }, (_, id) => ({ id, x: id, y: id * 2 })),
  }] });
  const patches = [
    { operations: [{ type: 'replace', layerID: 'series', index: 4, data: [{ id: 4, x: 4, y: 99 }] }] },
    { operations: [{ type: 'insert', layerID: 'series', index: 8, data: [{ id: 'inserted', x: 7.5, y: 8 }] }] },
    { operations: [{ type: 'remove', layerID: 'series', index: 20, count: 3 }] },
  ];
  let reference = state.toModel();
  for (const patch of patches) {
    reference = applyChartPatchReference(reference, patch);
    const result = tryApplyChartPatch(state, patch);
    assert.equal(result.ok, true);
    state = result.value;
    assert.deepEqual(state.toModel(), reference);
  }
});

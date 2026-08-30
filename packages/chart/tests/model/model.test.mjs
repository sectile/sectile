import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createChartModel,
  tryApplyChartPatch,
  tryCreateChartModel,
  tryReplaceChartModel,
} from '../../.verification-dist/model.js';

const allProfiles = {
  layers: [
    { id: 'points', profile: 'point', data: [{ id: 1, x: 1, y: 2 }] },
    { id: 'ordered', profile: 'ordered-series', data: [{ id: '1', x: 0, y: 3 }, { id: 2, x: 1, y: 4 }] },
    { id: 'segments', profile: 'cartesian-segment', data: [{ id: 'segment', x1: 0, y1: 0, x2: 1, y2: 1 }] },
    { id: 'cells', profile: 'grid-cell', data: [{ id: 'cell', column: 2, row: 3, value: 4 }] },
    { id: 'radial', profile: 'radial-segment', data: [{ id: 'slice', value: 5, innerRadius: 0.25, outerRadius: 1 }] },
  ],
};

test('normalizes every chart profile into immutable dense identity state', () => {
  const state = createChartModel(allProfiles);
  assert.equal(state.generation, 0);
  assert.equal(state.layerCount, 5);
  assert.equal(state.size, 6);
  assert.deepEqual(state.identities.slice(0, 3), [1, '1', 2]);
  assert.equal(state.indexOf(1), 0);
  assert.equal(state.indexOf('1'), 1);
  assert.deepEqual(state.layerAt(4), { id: 'radial', profile: 'radial-segment', size: 1 });
  assert.deepEqual(state.toModel(), allProfiles);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.identities), true);
});

test('enforces identity, profile, datum, order, and resource invariants', () => {
  assert.equal(tryCreateChartModel({ layers: [{ id: 'x', profile: 'point', data: [
    { id: 1, x: 0, y: 0 }, { id: 1, x: 1, y: 1 },
  ] }] }).error.code, 'chart-datum-duplicate');
  assert.equal(tryCreateChartModel({ layers: [{ id: 'x', profile: 'ordered-series', data: [
    { id: 1, x: 2, y: 0 }, { id: 2, x: 1, y: 1 },
  ] }] }).error.code, 'chart-datum-invalid');
  assert.equal(tryCreateChartModel({ layers: [{ id: 'x', profile: 'point', data: [
    { id: 1, x: Number.NaN, y: 0 },
  ] }] }).error.code, 'chart-datum-invalid');
  assert.equal(tryCreateChartModel(allProfiles, { maxLayers: 4 }).error.code, 'chart-layer-ceiling-exceeded');
  assert.equal(tryCreateChartModel(allProfiles, { maxDatums: 5 }).error.code, 'chart-datum-ceiling-exceeded');
});

test('patch and replacement generations reject stale writes and preserve no-ops', () => {
  const initial = createChartModel({ layers: [{ id: 'points', profile: 'point', data: [{ id: 1, x: 0, y: 0 }] }] });
  assert.equal(tryApplyChartPatch(initial, { operations: [] }).value, initial);
  assert.equal(tryReplaceChartModel(initial, initial.toModel()).value, initial);

  const inserted = tryApplyChartPatch(initial, {
    expectedGeneration: 0,
    operations: [{ type: 'insert', layerID: 'points', index: 1, data: [{ id: '2', x: 1, y: 1 }] }],
  }).value;
  assert.equal(inserted.generation, 1);
  assert.deepEqual(inserted.identities, [1, '2']);
  assert.equal(tryApplyChartPatch(inserted, { expectedGeneration: 0, operations: [] }).error.code, 'chart-stale-generation');

  const replaced = tryApplyChartPatch(inserted, {
    operations: [{ type: 'replace', layerID: 'points', index: 1, data: [{ id: '2', x: 2, y: 3 }] }],
  }).value;
  assert.equal(replaced.generation, 2);
  assert.equal(replaced.toModel().layers[0].data[1].y, 3);

  const removed = tryApplyChartPatch(replaced, {
    operations: [{ type: 'remove', layerID: 'points', index: 0, count: 1 }],
  }).value;
  assert.deepEqual(removed.identities, ['2']);
});

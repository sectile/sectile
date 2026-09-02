import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createChartModel,
  replaceChartLayer,
  tryApplyChartPatch,
  tryCreateChartModel,
  tryReplaceChartLayer,
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

function observeDatumReads(data) {
  let reads = 0;
  return {
    data: new Proxy(data, {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^(?:0|[1-9]\d*)$/u.test(property)) reads += 1;
        return Reflect.get(target, property, receiver);
      },
    }),
    reads: () => reads,
  };
}

test('CHT-01: model generations and dense indices preserve exact stable identity', () => {
  const state = createChartModel(allProfiles);
  assert.equal(state.generation, 0);
  assert.equal(state.layerCount, 5);
  assert.equal(state.size, 6);
  assert.deepEqual(state.identities.slice(0, 3), [1, '1', 2]);
  assert.equal(state.indexOf(1), 0);
  assert.equal(state.indexOf('1'), 1);
  assert.deepEqual(state.layerAt(4), {
    id: 'radial', profile: 'radial-segment', size: 1,
    revisions: { identity: 0, order: 0, value: 0, geometry: 0, aggregate: 0, style: 0 },
  });
  assert.deepEqual(state.toModel(), allProfiles);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.identities), true);
});

test('CHT-02: rejected patches leave the original model unchanged', () => {
  const initial = createChartModel({ layers: [{
    id: 'points', profile: 'point', data: [{ id: 1, x: 0, y: 0 }],
  }] });
  const before = initial.toModel();
  const result = tryApplyChartPatch(initial, { operations: [
    { type: 'insert', layerID: 'points', index: 1, data: [{ id: 2, x: 1, y: 1 }] },
    { type: 'insert', layerID: 'points', index: 2, data: [{ id: 1, x: 2, y: 2 }] },
  ] });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'chart-datum-duplicate');
  assert.equal(initial.generation, 0);
  assert.deepEqual(initial.toModel(), before);
});

test('CHT-09: raw model and patch ceilings reject before datum observation', () => {
  const initial = createChartModel({ layers: [{
    id: 'points', profile: 'point', data: [{ id: 0, x: 0, y: 0 }, { id: 1, x: 1, y: 1 }],
  }] }, { maxLayers: 2, maxDatums: 3 });

  const modelData = observeDatumReads([{ id: 10, x: 10, y: 10 }]);
  const modelResult = tryReplaceChartModel(initial, { layers: [
    { id: 'points', profile: 'point', data: modelData.data },
    { id: 'extra', profile: 'point', data: [
      { id: 11, x: 11, y: 11 }, { id: 12, x: 12, y: 12 }, { id: 13, x: 13, y: 13 },
    ] },
  ] });
  assert.equal(modelResult.error.code, 'chart-datum-ceiling-exceeded');
  assert.equal(modelData.reads(), 0);

  const replacementData = observeDatumReads(Array.from(
    { length: 4 },
    (_, id) => ({ id: id + 20, x: id, y: id }),
  ));
  const replacement = tryReplaceChartLayer(initial, {
    id: 'points', profile: 'point', data: replacementData.data,
  });
  assert.equal(replacement.error.code, 'chart-datum-ceiling-exceeded');
  assert.equal(replacementData.reads(), 0);

  const rejectedInsertData = observeDatumReads([
    { id: 30, x: 30, y: 30 }, { id: 31, x: 31, y: 31 },
  ]);
  const rejectedPatch = tryApplyChartPatch(initial, { operations: [
    { type: 'insert', layerID: 'points', index: 2, data: rejectedInsertData.data },
    { type: 'remove', layerID: 'points', index: 0, count: 1 },
  ] });
  assert.equal(rejectedPatch.error.code, 'chart-datum-ceiling-exceeded');
  assert.equal(rejectedInsertData.reads(), 0);
  assert.equal(initial.generation, 0);
  assert.deepEqual(initial.identities, [0, 1]);

  const acceptedInsertData = observeDatumReads([
    { id: 2, x: 2, y: 2 }, { id: 3, x: 3, y: 3 },
  ]);
  const acceptedPatch = tryApplyChartPatch(initial, { operations: [
    { type: 'remove', layerID: 'points', index: 1, count: 1 },
    { type: 'insert', layerID: 'points', index: 1, data: acceptedInsertData.data },
  ] });
  assert.equal(acceptedPatch.ok, true);
  assert.equal(acceptedInsertData.reads(), 2);
  assert.deepEqual(acceptedPatch.value.identities, [0, 2, 3]);
});

test('large valid inserts remain total without variadic argument expansion', () => {
  const insertCount = 130_000;
  const inserted = Array.from({ length: insertCount }, (_, offset) => ({
    id: offset + 1,
    x: offset + 1,
    y: offset + 1,
  }));
  const initial = createChartModel({ layers: [{
    id: 'points', profile: 'point', data: [{ id: 0, x: 0, y: 0 }],
  }] }, { maxDatums: insertCount + 1 });
  let result;
  assert.doesNotThrow(() => {
    result = tryApplyChartPatch(initial, { operations: [{
      type: 'insert', layerID: 'points', index: 1, data: inserted,
    }] });
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.size, insertCount + 1);
  assert.equal(result.value.identityAt(insertCount), insertCount);
});

test('reuses unchanged layer owners and bounds changed-layer normalization', () => {
  const initial = createChartModel(allProfiles);
  const next = replaceChartLayer(initial, {
    id: 'points', profile: 'point', data: [{ id: 1, x: 10, y: 20 }],
  });
  assert.equal(next.generation, 1);
  assert.equal(next.diagnostics.normalizedLayers, 1);
  assert.equal(next.diagnostics.normalizedDatums, 1);
  assert.equal(next.diagnostics.reusedLayers, 4);
  assert.deepEqual(next.layerAt(0).revisions, {
    identity: 0, order: 0, value: 1, geometry: 1, aggregate: 1, style: 0,
  });
  assert.deepEqual(next.layerAt(1).revisions, initial.layerAt(1).revisions);
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
  assert.equal(replaced.diagnostics.normalizedDatums, 1);
  assert.equal(replaced.diagnostics.repairedLayers, 1);
  assert.equal(replaced.diagnostics.copiedValueBlocks, 1);
  assert.ok(replaced.diagnostics.repairedIndexEntries > 0);

  const removed = tryApplyChartPatch(replaced, {
    operations: [{ type: 'remove', layerID: 'points', index: 0, count: 1 }],
  }).value;
  assert.deepEqual(removed.identities, ['2']);
});

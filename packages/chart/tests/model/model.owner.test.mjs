import assert from 'node:assert/strict';
import test from 'node:test';
import { getChartModelData } from '../../.verification-dist/internal/model-store.js';
import { createChartModel, replaceChartLayer, tryApplyChartPatch } from '../../.verification-dist/model.js';

test('retains one bounded profile index per immutable layer owner', () => {
  const state = createChartModel({ layers: [
    { id: 'scatter', profile: 'point', data: [{ id: 'p1', x: 0, y: 1 }, { id: 'p2', x: 2, y: 3 }] },
    { id: 'line', profile: 'ordered-series', data: [{ id: 'l1', x: 0, y: 1 }, { id: 'l2', x: 2, y: 3 }] },
    { id: 'bar', profile: 'cartesian-segment', data: [{ id: 'b1', x1: 0, y1: 0, x2: 1, y2: 4 }] },
    { id: 'dense', profile: 'grid-cell', data: [
      { id: 'd1', column: 0, row: 0, value: 1 }, { id: 'd2', column: 1, row: 0, value: 2 },
    ] },
    { id: 'sparse', profile: 'grid-cell', data: [
      { id: 's1', column: 0, row: 0, value: 1 }, { id: 's2', column: 4, row: 8, value: 2 },
    ] },
    { id: 'radial', profile: 'radial-segment', data: [{ id: 'r1', value: 1 }, { id: 'r2', value: 2 }] },
  ] });
  const layers = getChartModelData(state).layers;
  assert.deepEqual(layers.map((layer) => layer.index.kind), [
    'spatial', 'ordered', 'categorical', 'heatmap', 'heatmap', 'radial',
  ]);
  assert.equal(layers[3].index.representation, 'dense');
  assert.equal(layers[4].index.representation, 'sparse');
  for (const layer of layers) {
    assert.ok(layer.index.hierarchy.leafCount < Math.max(2, layer.owner.size * 2));
    assert.ok(layer.index.hierarchy.leafCount * 2 <= Math.max(2, layer.owner.size * 4));
  }
  assert.deepEqual([...layers[5].index.prefix], [0, 1, 3]);
});

test('reuses unchanged owners and repairs only sparse value blocks and hierarchy paths', () => {
  const data = Array.from({ length: 4_096 }, (_, id) => ({ id, x: id, y: id }));
  const initial = createChartModel({ layers: [
    { id: 'stable', profile: 'point', data: [{ id: 'stable-point', x: 0, y: 0 }] },
    { id: 'series', profile: 'ordered-series', data },
  ] });
  const initialData = getChartModelData(initial);
  const result = tryApplyChartPatch(initial, {
    operations: [{ type: 'replace', layerID: 'series', index: 2_048, data: [{ id: 2_048, x: 2_048, y: -1 }] }],
  });
  assert.equal(result.ok, true);
  const next = result.value;
  const nextData = getChartModelData(next);
  assert.equal(nextData.layers[0].owner, initialData.layers[0].owner);
  assert.equal(nextData.layers[1].owner.values.parent, initialData.layers[1].owner.values);
  assert.equal(nextData.layers[1].index.hierarchy.parent, initialData.layers[1].index.hierarchy);
  assert.equal(next.diagnostics.normalizedDatums, 1);
  assert.equal(next.diagnostics.copiedValueBlocks, 1);
  assert.ok(next.diagnostics.repairedIndexEntries <= Math.ceil(Math.log2(data.length)) + 2);

  const rebuilt = replaceChartLayer(next, {
    id: 'series', profile: 'ordered-series', data: data.map((datum) => ({ ...datum, y: datum.y + 1 })),
  });
  assert.equal(getChartModelData(rebuilt).layers[0].owner, nextData.layers[0].owner);
  assert.equal(rebuilt.diagnostics.rebuiltLayers, 1);
  assert.equal(rebuilt.diagnostics.normalizedDatums, data.length);
});

test('tracks identity order and packed values with independent revisions', () => {
  const initial = createChartModel({ layers: [{
    id: 'points', profile: 'point', data: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 1, y: 1 }],
  }] });
  const reordered = tryApplyChartPatch(initial, {
    operations: [{
      type: 'replace', layerID: 'points', index: 0,
      data: [{ id: 'b', x: 0, y: 0 }, { id: 'a', x: 1, y: 1 }],
    }],
  }).value;
  assert.deepEqual(reordered.layerAt(0).revisions, {
    identity: 0,
    order: 1,
    value: 0,
    aggregate: 0,
  });
});

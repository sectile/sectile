import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartDefinition } from '../../.verification-dist/definition.js';
import { createChartModel } from '../../.verification-dist/model.js';
import { createChartProjection } from '../../.verification-dist/projection.js';
import {
  hitTestChartProjection,
  inspectChartProjectionHitTest,
  tryHitTestChartProjection,
} from '../../.verification-dist/query.js';

function project(layers) {
  return createChartProjection(createChartModel({ layers }), { viewport: { width: 100, height: 100 } });
}

function projectDefinition(coordinate, layers, viewport = { width: 240, height: 160 }) {
  return createChartProjection(createChartDefinition({ coordinate, layers }), { viewport });
}

test('packed query index resolves points, line segments, rectangles, cells, and arcs', () => {
  const cases = [
    [project([{ id: 'p', profile: 'point', data: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 10, y: 10 }] }]), { x: 1, y: 99 }, 1],
    [project([{ id: 'l', profile: 'ordered-series', data: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 10, y: 10 }] }]), { x: 75, y: 25 }, 2],
    [project([{ id: 'r', profile: 'cartesian-segment', data: [{ id: 1, x1: 0, y1: 0, x2: 10, y2: 10 }] }]), { x: 50, y: 50 }, 1],
    [project([{ id: 'c', profile: 'grid-cell', data: [{ id: 1, column: 0, row: 0, value: 5 }] }]), { x: 50, y: 50 }, 1],
    [project([{ id: 'a', profile: 'radial-segment', data: [{ id: 1, value: 1 }] }]), { x: 90, y: 50 }, 1],
  ];
  for (const [projection, coordinate, expected] of cases) {
    assert.equal(hitTestChartProjection(projection, { ...coordinate, radius: 4 })[0].id, expected);
  }
});

test('hit ordering prefers distance then visually later layers', () => {
  const projection = project([
    { id: 'back', profile: 'point', data: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 1, y: 1 }] },
    { id: 'front', profile: 'point', data: [{ id: '1', x: 0, y: 0 }, { id: '2', x: 1, y: 1 }] },
  ]);
  const hits = hitTestChartProjection(projection, { x: 0, y: 100, radius: 1, maximumHits: 2 });
  assert.deepEqual(hits.map((hit) => hit.id), ['1', 1]);
});

test('line queries assign the plot to nearest X regions with Y as the series tie-breaker', () => {
  const projection = project([
    { id: 'back', profile: 'ordered-series', data: [{ id: 'back-a', x: 0, y: 0 }, { id: 'back-b', x: 10, y: 10 }] },
    { id: 'front', profile: 'ordered-series', data: [{ id: 'front-a', x: 0, y: 8 }, { id: 'front-b', x: 10, y: 2 }] },
  ]);
  assert.equal(hitTestChartProjection(projection, { x: 49, y: 100 })[0].id, 'back-a');
  assert.equal(hitTestChartProjection(projection, { x: 51, y: 0 })[0].id, 'back-b');
  assert.equal(hitTestChartProjection(projection, { x: 1, y: 20 })[0].id, 'front-a');
  assert.deepEqual(hitTestChartProjection(projection, { x: -1, y: 50 }), []);

  const inspected = inspectChartProjectionHitTest(projection, { x: 49, y: 100 });
  assert.equal(inspected.hits[0].id, 'back-a');
  assert.equal(inspected.diagnostics.searchedPartitions, 2);
  assert.ok(inspected.diagnostics.testedPrimitives <= 4);
});

test('line queries inspect every datum tied at the nearest X and choose by Y', () => {
  const projection = project([{ id: 'line', profile: 'ordered-series', data: [
    { id: 'low', x: 0, y: 0 }, { id: 'middle', x: 0, y: 5 }, { id: 'high', x: 0, y: 10 },
    { id: 'end', x: 10, y: 10 },
  ] }]);
  const inspected = inspectChartProjectionHitTest(projection, { x: 1, y: 50 });
  assert.equal(inspected.hits[0].id, 'middle');
  assert.equal(inspected.diagnostics.searchedPartitions, 1);
  assert.equal(inspected.diagnostics.testedPrimitives, 3);
});

test('scatter queries use bounded two-dimensional nearest regions', () => {
  const projection = project([{ id: 'points', profile: 'point', data: [
    { id: 'left', x: 0, y: 0 }, { id: 'right', x: 10, y: 10 },
  ] }]);
  assert.equal(hitTestChartProjection(projection, { x: 24, y: 100 })[0].id, 'left');
  assert.deepEqual(hitTestChartProjection(projection, { x: 24, y: 100, radius: 20 }), []);
  const inspected = inspectChartProjectionHitTest(projection, { x: 24, y: 100 });
  assert.ok(inspected.diagnostics.visitedIndexNodes <= 2);
  assert.ok(inspected.diagnostics.testedPrimitives <= 2);
});

test('vertical and horizontal bars use their categorical axis regions', () => {
  const vertical = projectDefinition({ kind: 'cartesian', axes: [
    { id: 'category', orientation: 'x', scale: 'categorical', field: 'category' },
    { id: 'value', orientation: 'y', scale: 'linear', field: 'value' },
  ] }, [{ id: 'bars', kind: 'bar', xAxis: 'category', yAxis: 'value', data: [
    { id: 'small', category: 'A', value: 1 }, { id: 'large', category: 'B', value: 10 },
  ] }]);
  const verticalBatch = vertical.batches[0];
  const verticalX = verticalBatch.rectangles[0] + verticalBatch.rectangles[2] / 2;
  assert.equal(hitTestChartProjection(vertical, { x: verticalX, y: vertical.layout.plot.y })[0].id, 'small');
  const verticalInspection = inspectChartProjectionHitTest(vertical, { x: verticalX, y: vertical.layout.plot.y });
  assert.equal(verticalInspection.diagnostics.searchedPartitions, 1);
  assert.equal(verticalInspection.diagnostics.testedPrimitives, 1);

  const horizontal = projectDefinition({ kind: 'cartesian', axes: [
    { id: 'value', orientation: 'x', scale: 'linear', field: 'value' },
    { id: 'category', orientation: 'y', scale: 'categorical', field: 'category' },
  ] }, [{ id: 'bars', kind: 'bar', orientation: 'horizontal', xAxis: 'value', yAxis: 'category', data: [
    { id: 'small', category: 'A', value: 1 }, { id: 'large', category: 'B', value: 10 },
  ] }]);
  const horizontalBatch = horizontal.batches[0];
  const horizontalY = horizontalBatch.rectangles[1] + horizontalBatch.rectangles[3] / 2;
  assert.equal(hitTestChartProjection(horizontal, { x: horizontal.layout.plot.x + horizontal.layout.plot.width, y: horizontalY })[0].id, 'small');
});

test('heatmaps keep empty logical cells inactive', () => {
  const projection = projectDefinition({ kind: 'cartesian', axes: [
    { id: 'column', orientation: 'x', scale: 'categorical', field: 'column' },
    { id: 'row', orientation: 'y', scale: 'categorical', field: 'row' },
  ] }, [{ id: 'heat', kind: 'heatmap', xAxis: 'column', yAxis: 'row', data: [
    { id: 'a1', column: 'A', row: '1', value: 1 }, { id: 'b2', column: 'B', row: '2', value: 2 },
  ] }]);
  const cells = projection.batches[0].cells;
  const emptyX = cells[0] + cells[2] / 2;
  const emptyY = cells[6] + cells[8] / 2;
  assert.deepEqual(hitTestChartProjection(projection, { x: emptyX, y: emptyY }), []);
});

test('pie and donut queries respect visible sectors and the donut hole', () => {
  const pie = project([{ id: 'pie', profile: 'radial-segment', data: [{ id: 'share', value: 1 }] }]);
  const pieArc = pie.batches[0].arcs;
  assert.equal(hitTestChartProjection(pie, { x: pieArc[0] + pieArc[3] / 2, y: pieArc[1] })[0].id, 'share');
  assert.deepEqual(hitTestChartProjection(pie, { x: pieArc[0] + pieArc[3] + 1, y: pieArc[1] }), []);

  const donut = project([{ id: 'donut', profile: 'radial-segment', data: [{ id: 'share', value: 1, innerRadius: 0.5 }] }]);
  const donutArc = donut.batches[0].arcs;
  assert.equal(hitTestChartProjection(donut, { x: donutArc[0] + (donutArc[2] + donutArc[3]) / 2, y: donutArc[1] })[0].id, 'share');
  assert.deepEqual(hitTestChartProjection(donut, { x: donutArc[0], y: donutArc[1] }), []);
});

test('mixed charts prioritize an exact area before a line X region', () => {
  const projection = project([
    { id: 'line', profile: 'ordered-series', data: [
      { id: 'line-start', x: 0, y: 0 }, { id: 'line-end', x: 10, y: 10 },
    ] },
    { id: 'area', profile: 'cartesian-segment', data: [
      { id: 'bar', x1: 4, y1: 4, x2: 6, y2: 6 },
    ] },
  ]);
  assert.equal(hitTestChartProjection(projection, { x: 50, y: 50 })[0].id, 'bar');
  assert.equal(hitTestChartProjection(projection, { x: 25, y: 90 })[0].id, 'line-start');
});

test('query ceilings and invalid coordinates fail before index construction', () => {
  const projection = project([{ id: 'p', profile: 'point', data: [{ id: 1, x: 0, y: 0 }] }]);
  assert.equal(tryHitTestChartProjection(projection, { x: Number.NaN, y: 0 }).error.code, 'chart-query-invalid');
  assert.equal(tryHitTestChartProjection(projection, { x: 0, y: 0, maximumHits: 257 }).error.code, 'chart-query-invalid');
});

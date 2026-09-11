import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chartSelectionContains,
  createChartState,
  reconcileChartState,
  reduceChartEvent,
  tryCreateChartState,
} from '../../.verification-dist/interaction.js';
import { createChartModel, applyChartPatch } from '../../.verification-dist/model.js';
import { createChartAxisViewState } from '../../.verification-dist/view.js';

const model = createChartModel({ layers: [{ id: 'points', profile: 'point', data: [
  { id: 1, x: 0, y: 0 }, { id: '1', x: 1, y: 1 }, { id: 2, x: 2, y: 2 },
] }] });

const view = createChartAxisViewState([
  { id: 'x', orientation: 'x', scale: 'linear', domain: { kind: 'numeric', minimum: 0, maximum: 10 }, ticks: 0 },
  { id: 'y', orientation: 'y', scale: 'linear', domain: { kind: 'numeric', minimum: 0, maximum: 10 }, ticks: 0 },
], [{ axisID: 'x' }, { axisID: 'y' }]);

function skewedSelection(type, fields) {
  const reads = {};
  const selection = {};
  for (const [field, [first, later]] of Object.entries({ type: [type, 'points'], ...fields })) {
    Object.defineProperty(selection, field, {
      enumerable: true,
      get() {
        reads[field] = (reads[field] ?? 0) + 1;
        return reads[field] === 1 ? first : later;
      },
    });
  }
  return { selection, reads };
}

test('focus movement preserves mixed stable identity semantics and emits effects', () => {
  const initial = createChartState(model);
  const first = reduceChartEvent(model, initial, { type: 'move-focus', direction: 'next' }).value;
  assert.equal(first.state.cursor, 1);
  assert.deepEqual(first.commands.map((command) => command.type), ['focus-datum', 'announce-datum', 'render-requested']);
  const second = reduceChartEvent(model, first.state, { type: 'move-focus', direction: 'next' }).value;
  assert.equal(second.state.cursor, '1');
  assert.notEqual(second.state.cursor, 1);
});

test('controlled channels emit change requests without mutating local state', () => {
  const initial = createChartState(model, { cursor: 1 });
  const update = reduceChartEvent(model, initial, { type: 'set-cursor', id: '1' }, { cursor: true }).value;
  assert.equal(update.changed, false);
  assert.equal(update.state, initial);
  assert.deepEqual(update.commands.map((command) => command.type), ['cursor-change-requested']);
});

test('interval and region selections capture external fields once before canonicalization', () => {
  const interval = skewedSelection('axis-interval', {
    axisID: ['x', 'missing'],
    start: [2, Number.NaN],
    end: [8, Number.NaN],
  });
  const created = tryCreateChartState(model, { view, selection: interval.selection });
  assert.equal(created.ok, true);
  assert.deepEqual(interval.reads, { type: 1, axisID: 1, start: 1, end: 1 });
  assert.deepEqual(created.value.selection, { type: 'axis-interval', axisID: 'x', start: 2, end: 8 });
  assert.equal(tryCreateChartState(model, { view, selection: created.value.selection }).ok, true);

  const region = skewedSelection('domain-region', {
    xAxisID: ['x', 'missing-x'],
    xStart: [1, Number.NaN],
    xEnd: [9, Number.NaN],
    yAxisID: ['y', 'missing-y'],
    yStart: [2, Number.NaN],
    yEnd: [8, Number.NaN],
  });
  const initial = createChartState(model, { view });
  const reduced = reduceChartEvent(model, initial, { type: 'set-selection', selection: region.selection });
  assert.equal(reduced.ok, true);
  assert.deepEqual(region.reads, {
    type: 1, xAxisID: 1, xStart: 1, xEnd: 1, yAxisID: 1, yStart: 1, yEnd: 1,
  });
  assert.deepEqual(reduced.value.state.selection, {
    type: 'domain-region', xAxisID: 'x', xStart: 1, xEnd: 9, yAxisID: 'y', yStart: 2, yEnd: 8,
  });
  assert.equal(tryCreateChartState(model, { view, selection: reduced.value.state.selection }).ok, true);

  const points = skewedSelection('points', { ids: [[1], [2]] });
  const pointState = tryCreateChartState(model, { selection: points.selection });
  assert.equal(pointState.ok, true);
  assert.deepEqual(points.reads, { type: 1, ids: 1 });
  assert.deepEqual(pointState.value.selection, { type: 'points', ids: [1] });

  assert.equal(tryCreateChartState(model, {
    view,
    selection: { type: 'axis-interval', axisID: 'x', start: Number.NaN, end: 8 },
  }).error.code, 'chart-interaction-invalid');
});

test('selection validates membership and reconciles through model generations', () => {
  const initial = createChartState(model, { selection: { type: 'points', ids: [1, '1'] } });
  assert.equal(reduceChartEvent(model, initial, {
    type: 'set-selection', selection: { type: 'points', ids: [1, 1] },
  }).error.code, 'chart-interaction-invalid');

  const nextModel = applyChartPatch(model, {
    operations: [{ type: 'remove', layerID: 'points', index: 0, count: 1 }],
  });
  const reconciled = reconcileChartState(initial, nextModel).value;
  assert.equal(reconciled.generation, 1);
  assert.deepEqual(reconciled.selection, { type: 'points', ids: ['1'] });
  assert.equal(chartSelectionContains(initial.selection, 1), true);
  assert.equal(chartSelectionContains(initial.selection, '1'), true);
  assert.equal(chartSelectionContains(initial.selection, 2), false);
});

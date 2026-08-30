import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createChartState,
  reconcileChartState,
  reduceChartEvent,
} from '../../.verification-dist/interaction.js';
import { createChartModel, applyChartPatch } from '../../.verification-dist/model.js';

const model = createChartModel({ layers: [{ id: 'points', profile: 'point', data: [
  { id: 1, x: 0, y: 0 }, { id: '1', x: 1, y: 1 }, { id: 2, x: 2, y: 2 },
] }] });

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
  assert.deepEqual(update.commands.map((command) => command.type), [
    'cursor-change-requested', 'focus-datum', 'announce-datum',
  ]);
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
});

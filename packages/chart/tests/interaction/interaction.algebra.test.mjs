import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartState, reduceChartEvent } from '../../.verification-dist/interaction.js';
import { createChartModel } from '../../.verification-dist/model.js';

const model = createChartModel({ layers: [{ id: 'series', profile: 'ordered-series', data: [
  { id: 1, x: 0, y: 0 }, { id: 2, x: 1, y: 1 },
] }] });

test('identity events preserve object identity and emit no commands', () => {
  const state = createChartState(model);
  for (const event of [
    { type: 'set-active', id: null },
    { type: 'set-cursor', id: null },
    { type: 'set-selection', selection: { type: 'points', ids: [] } },
    { type: 'reset-view' },
  ]) {
    const update = reduceChartEvent(model, state, event).value;
    assert.equal(update.state, state);
    assert.equal(update.changed, false);
    assert.deepEqual(update.commands, []);
  }
});

test('pan composes additively and zoom keeps its anchor fixed', () => {
  const initial = createChartState(model);
  const once = reduceChartEvent(model, initial, { type: 'pan', x: 3, y: -2 }).value.state;
  const twice = reduceChartEvent(model, once, { type: 'pan', x: 4, y: 5 }).value.state;
  assert.deepEqual(twice.viewTransform, { xScale: 1, xOffset: 7, yScale: 1, yOffset: 3 });

  const anchor = { x: 40, y: 20 };
  const zoomed = reduceChartEvent(model, twice, { type: 'zoom', ...anchor, factor: 2 }).value.state;
  const beforeX = anchor.x * twice.viewTransform.xScale + twice.viewTransform.xOffset;
  const sourceAtAnchor = (anchor.x - twice.viewTransform.xOffset) / twice.viewTransform.xScale;
  const afterX = sourceAtAnchor * zoomed.viewTransform.xScale + zoomed.viewTransform.xOffset;
  assert.equal(afterX, anchor.x);
  assert.notEqual(beforeX, afterX);
});

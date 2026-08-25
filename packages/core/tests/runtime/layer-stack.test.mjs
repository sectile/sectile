import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLayerStackEvent,
  createLayerStackState,
  getInteractiveLayerIDs,
  getTopLayer,
  tryCreateLayerStackState,
} from '../../.verification-dist/layer-stack.js';

test('LAY-02, LAY-05: layer stack opens only contiguous parent-child chains', () => {
  let state = createLayerStackState();
  state = applyLayerStackEvent(state, {
    type: 'open-layer', layer: { id: 'dialog', mode: 'modal' },
  }).value.state;
  state = applyLayerStackEvent(state, {
    type: 'open-layer', layer: { id: 'popover', parentID: 'dialog' },
  }).value.state;
  assert.equal(getTopLayer(state).id, 'popover');
  assert.deepEqual(getInteractiveLayerIDs(state), ['dialog', 'popover']);
  assert.equal(applyLayerStackEvent(state, {
    type: 'open-layer', layer: { id: 'invalid', parentID: 'dialog' },
  }).ok, false);
});

test('LAY-03: topmost dismissal respects each layer policy', () => {
  const state = createLayerStackState([
    { id: 'dialog', mode: 'modal' },
    { id: 'tooltip', parentID: 'dialog', mode: 'tooltip' },
  ]);
  const ignored = applyLayerStackEvent(state, { type: 'dismiss-top', reason: 'escape' }).value;
  assert.equal(ignored.state, state);
  assert.deepEqual(ignored.commands, []);
  const outside = applyLayerStackEvent(state, {
    type: 'dismiss-top', reason: 'interact-outside',
  }).value;
  assert.deepEqual(outside.state.layers.map((layer) => layer.id), ['dialog']);
});

test('LAY-04: closing an ancestor closes descendants in top-down command order', () => {
  const state = createLayerStackState([
    { id: 'dialog', mode: 'modal' },
    { id: 'popover', parentID: 'dialog' },
    { id: 'tooltip', parentID: 'popover', mode: 'tooltip' },
    { id: 'independent' },
  ]);
  const closed = applyLayerStackEvent(state, { type: 'close-layer', id: 'dialog' }).value;
  assert.deepEqual(closed.state.layers.map((layer) => layer.id), ['independent']);
  assert.deepEqual(closed.commands, [
    { type: 'layer-closed', id: 'tooltip', reason: 'ancestor-closed' },
    { type: 'layer-closed', id: 'popover', reason: 'ancestor-closed' },
    { type: 'layer-closed', id: 'dialog', reason: 'programmatic' },
  ]);
});

test('LAY-01: layer construction rejects duplicate, missing-chain, and self-parent models', () => {
  assert.equal(tryCreateLayerStackState([{ id: 'a' }, { id: 'a' }]).ok, false);
  assert.equal(tryCreateLayerStackState([{ id: 'a', parentID: 'missing' }]).ok, false);
  assert.equal(tryCreateLayerStackState([{ id: 'a', parentID: 'a' }]).ok, false);
  assert.equal(applyLayerStackEvent(createLayerStackState(), {
    type: 'open-layer', layer: { id: '' },
  }).ok, false);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence, tryCreateSequence } from '../../.verification-dist/structures/sequence.js';
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

test('LayerStack rejects oversized inputs before ID reads or materialization', () => {
  const limit = createSequence([]).maxItems;
  assert.equal(limit, 100_000);
  for (const size of [limit + 1, 250_000]) {
    let reads = 0;
    const input = Array.from({ length: size }, (_, id) => ({ get id() { reads += 1; return id; } }));
    const result = tryCreateLayerStackState(input);
    assert.deepEqual(result, tryCreateSequence(new Array(size)));
    assert.equal(result.error.class, 'resource-rejection');
    assert.equal(result.error.code, 'item-ceiling-exceeded');
    assert.deepEqual(result.error.details, { size, maxItems: limit });
    assert.equal(reads, 0);
    const transition = applyLayerStackEvent({ layers: input }, { type: 'dismiss-top', reason: 'escape' });
    assert.equal(transition.error.class, 'transition-rejection');
    assert.equal(transition.error.code, result.error.code);
    assert.equal(reads, 0);
  }
  const enormous = new Array(0xffff_ffff);
  Object.defineProperty(enormous, '0', { get() { throw new Error('must not read rejected input'); } });
  Object.defineProperty(enormous, 'map', { get() { throw new Error('must not materialize rejected input'); } });
  assert.deepEqual(tryCreateLayerStackState(enormous).error.details, { size: 0xffff_ffff, maxItems: limit });
});

test('LayerStack accepts the inclusive Sequence ceiling and validates supported layers completely', () => {
  const limit = createSequence([]).maxItems;
  for (const size of [0, 1, limit - 1, limit]) {
    let reads = 0;
    const input = Array.from({ length: size }, (_, id) => ({ get id() { reads += 1; return id; } }));
    const result = tryCreateLayerStackState(input);
    assert.equal(result.ok, true);
    assert.equal(result.value.layers.length, size);
    assert.equal(reads, size * 2);
    assert.ok(Object.isFrozen(result.value.layers));
    if (size > 0) assert.equal(getTopLayer(result.value).id, size - 1);
  }
  for (const input of [
    [{ id: '' }], [{ id: 'x'.repeat(1_025) }], [{ id: 'a' }, { id: 'a' }],
    [{ id: 'a', mode: 'invalid' }], [{ id: 'a', dismissOnEscape: 'yes' }],
    [{ id: 'a', dismissOnInteractOutside: 1 }], [{ id: 'a', parentID: 'missing' }],
    [{ id: 'a' }, { id: 'b' }, { id: 'c', parentID: 'a' }],
  ]) assert.equal(tryCreateLayerStackState(input).ok, false);
});

test('canonical ignored dismissals do constant work across all LayerStack owner paths', () => {
  const ignored = { type: 'dismiss-top', reason: 'escape' };
  for (const size of [16, 4_096, 100_000]) {
    const base = createLayerStackState(Array.from({ length: size - 1 }, (_, id) => ({ id, mode: 'tooltip' })));
    const opened = applyLayerStackEvent(base, { type: 'open-layer', layer: { id: size, mode: 'tooltip' } }).value.state;
    const closed = applyLayerStackEvent(opened, { type: 'close-layer', id: size }).value.state;
    const dismissible = applyLayerStackEvent(base, { type: 'open-layer', layer: { id: size } }).value.state;
    const dismissed = applyLayerStackEvent(dismissible, ignored).value.state;
    for (const state of [base, opened, closed, dismissed]) {
      const freeze = Object.freeze;
      const map = Array.prototype.map;
      const set = Map.prototype.set;
      let copies = 0; let fullMaps = 0; let indexWrites = 0;
      Object.freeze = (value) => {
        if (value && Object.hasOwn(value, 'parentID') && Object.hasOwn(value, 'dismissOnEscape')) copies += 1;
        return freeze(value);
      };
      Array.prototype.map = function (...args) { if (this === state.layers) fullMaps += 1; return Reflect.apply(map, this, args); };
      Map.prototype.set = function (...args) { indexWrites += 1; return Reflect.apply(set, this, args); };
      try {
        for (let repeat = 0; repeat < 3; repeat += 1) {
          const result = applyLayerStackEvent(state, ignored);
          assert.equal(result.ok, true);
          assert.equal(result.value.state, state);
          assert.deepEqual(result.value.commands, []);
        }
      } finally { Object.freeze = freeze; Array.prototype.map = map; Map.prototype.set = set; }
      assert.deepEqual({ copies, fullMaps, indexWrites }, { copies: 0, fullMaps: 0, indexWrites: 0 });
    }
  }
  const empty = createLayerStackState();
  assert.equal(applyLayerStackEvent(empty, ignored).value.state, empty);
});

test('LayerStack provenance never trusts frozen foreign states or mutable layer aliases', () => {
  const ignored = { type: 'dismiss-top', reason: 'escape' };
  for (const layers of [
    [{ id: 'a' }, { id: 'a' }], [{ id: 'a', mode: 'invalid' }],
    [{ id: 'a', parentID: 'missing' }], [{ id: 'a', parentID: 'a' }],
    [{ id: 'a', dismissOnEscape: 'no' }],
  ]) {
    const expected = tryCreateLayerStackState(layers);
    assert.equal(expected.ok, false);
    const foreign = Object.freeze({ layers: Object.freeze(layers.map((layer) => Object.freeze(layer))) });
    const result = applyLayerStackEvent(foreign, ignored);
    assert.equal(result.error.class, 'transition-rejection');
    assert.equal(result.error.code, expected.error.code);
  }
  for (const closeKind of ['ignored', 'close', 'dismiss']) {
    const retained = { id: 'retained', parentID: null, mode: 'tooltip', dismissOnEscape: false, dismissOnInteractOutside: true };
    const foreign = Object.freeze({ layers: [retained] });
    let next = foreign;
    if (closeKind === 'ignored') {
      assert.equal(applyLayerStackEvent(foreign, ignored).value.state, foreign);
    } else {
      foreign.layers.push({ id: 'removed', parentID: null, mode: 'non-modal', dismissOnEscape: true, dismissOnInteractOutside: true });
      const result = applyLayerStackEvent(foreign, closeKind === 'close' ? { type: 'close-layer', id: 'removed' } : ignored);
      assert.equal(result.ok, true);
      next = result.value.state;
      assert.equal(next.layers[0], retained);
    }
    assert.equal(applyLayerStackEvent(next, ignored).ok, true);
    retained.mode = 'invalid';
    assert.equal(applyLayerStackEvent(next, ignored).error.code, 'layer-mode-invalid');
  }
});

test('LAY-01: layer construction rejects duplicate, missing-chain, and self-parent models', () => {
  assert.equal(tryCreateLayerStackState([{ id: 'a' }, { id: 'a' }]).ok, false);
  assert.equal(tryCreateLayerStackState([{ id: 'a', parentID: 'missing' }]).ok, false);
  assert.equal(tryCreateLayerStackState([{ id: 'a', parentID: 'a' }]).ok, false);
  assert.equal(applyLayerStackEvent(createLayerStackState(), {
    type: 'open-layer', layer: { id: '' },
  }).ok, false);
});

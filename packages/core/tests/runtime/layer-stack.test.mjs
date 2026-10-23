import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence, tryCreateSequence } from '../../.verification-dist/structures/sequence.js';
import {
  applyLayerStackEvent,
  applyLayerPresentationEvent,
  createLayerPresentationState,
  createLayerStackState,
  getInteractiveLayerIDs,
  getTopLayer,
  tryCreateLayerStackState,
  tryCreateLayerPresentationState,
} from '../../.verification-dist/layer-stack.js';

test('retiring an active branch discards its retained paint atomically and preserves unrelated generations', () => {
  let state = createLayerPresentationState([{ id: 'parent' }, { id: 'child', parentID: 'parent' }, { id: 'exit' }, { id: 'other' }]);
  for (const [id, generation] of [['parent', 1], ['child', 2], ['exit', 3]]) {
    state = applyLayerPresentationEvent(state, { type: 'retain-layer', id, generation }).value.state;
  }
  state = applyLayerPresentationEvent(state, { type: 'close-layer', id: 'exit' }).value.state;
  const before = state, retired = applyLayerPresentationEvent(state, { type: 'retire-layer', id: 'parent' }).value;
  assert.equal(retired.state.revision, before.revision + 1);
  assert.equal(retired.state.generation, before.generation);
  assert.deepEqual(retired.state.stack.layers.map(layer => layer.id), ['other']);
  assert.deepEqual(retired.state.presentations.map(({ id, generation, phase, order }) => ({ id, generation, phase, order })), [
    { id: 'exit', generation: 3, phase: 'exiting', order: 0 }, { id: 'other', generation: 4, phase: 'active', order: 1 },
  ]);
  assert.deepEqual(retired.commands, [{ type: 'layer-closed', id: 'child', reason: 'ancestor-closed' }, { type: 'layer-closed', id: 'parent', reason: 'programmatic' }]);
  assert.equal(applyLayerPresentationEvent(retired.state, { type: 'retire-layer', id: 'exit' }).error.code, 'layer-id-missing');
  const resumed = applyLayerPresentationEvent(retired.state, { type: 'open-layer', layer: { id: 'parent' } }).value.state;
  assert.equal(resumed.presentations.at(-1).generation, 5);
});

test('core:layer-stack:retire-work performs bounded branch and paint passes up to the layer ceiling', () => {
  for (const size of [32, 4096, 100000]) {
    const state = createLayerPresentationState(Array.from({ length: size }, (_, id) => ({ id, parentID: id === 0 ? null : id - 1 })));
    const has = Set.prototype.has; let membership = 0, result;
    Set.prototype.has = function (value) { membership++; return Reflect.apply(has, this, [value]); };
    try { result = applyLayerPresentationEvent(state, { type: 'retire-layer', id: 0 }).value; }
    finally { Set.prototype.has = has; }
    assert.equal(result.state.stack.layers.length, 0); assert.equal(result.state.presentations.length, 0);
    assert.equal(result.commands.length, size); assert.ok(membership <= 3 * size, 'no descendant-by-presentation nested scan');
  }
});

test('configuring active policy preserves generation, ancestry, order and retained paint while changing input authority', () => {
  let state = createLayerPresentationState([{ id: 'outer' }, { id: 'child', parentID: 'outer' }, { id: 'exit' }]);
  state = applyLayerPresentationEvent(state, { type: 'retain-layer', id: 'exit', generation: 3 }).value.state;
  state = applyLayerPresentationEvent(state, { type: 'close-layer', id: 'exit' }).value.state;
  const before = state, policy = { mode: 'modal', dismissOnEscape: false, dismissOnInteractOutside: false };
  const result = applyLayerPresentationEvent(state, { type: 'configure-layer', id: 'child', policy }).value;
  state = result.state;
  assert.equal(state.presentations, before.presentations); assert.equal(state.generation, before.generation);
  assert.equal(state.revision, before.revision + 1); assert.deepEqual(result.commands, []);
  assert.equal(state.stack.layers[0], before.stack.layers[0]); assert.equal(state.stack.layers[1].parentID, 'outer');
  assert.deepEqual(getInteractiveLayerIDs(state.stack), ['child']);
  assert.equal(applyLayerPresentationEvent(state, { type: 'dismiss-top', reason: 'escape' }).value.state, state);
  assert.equal(applyLayerPresentationEvent(state, { type: 'configure-layer', id: 'child', policy }).value.state, state);
  const changed = applyLayerPresentationEvent(state, { type: 'configure-layer', id: 'child', policy: { ...policy, mode: 'non-modal', dismissOnEscape: true } }).value.state;
  assert.deepEqual(getInteractiveLayerIDs(changed.stack), ['outer', 'child']);
  assert.deepEqual(applyLayerPresentationEvent(changed, { type: 'dismiss-top', reason: 'escape' }).value.state.stack.layers.map(layer => layer.id), ['outer']);
});

test('policy configuration rejects incomplete or invalid input and isolates normalized foreign state', () => {
  const policy = { mode: 'non-modal', dismissOnEscape: true, dismissOnInteractOutside: true };
  const state = createLayerStackState([{ id: 'a' }]);
  for (const invalid of [null, {}, { ...policy, mode: 'invalid' }, { ...policy, dismissOnEscape: 1 }]) {
    assert.equal(applyLayerStackEvent(state, { type: 'configure-layer', id: 'a', policy: invalid }).ok, false);
  }
  assert.equal(applyLayerStackEvent(state, { type: 'configure-layer', id: 'missing', policy }).error.code, 'layer-id-missing');
  const record = { id: 'a' }, foreign = { layers: [record] };
  const next = applyLayerStackEvent(foreign, { type: 'configure-layer', id: 'a', policy }).value.state;
  record.mode = 'invalid';
  assert.equal(next.layers[0].mode, 'non-modal'); assert.notEqual(next, foreign);
  assert.equal(applyLayerStackEvent(next, { type: 'configure-layer', id: 'a', policy }).value.state, next);
});

test('core:layer-stack:configure-work performs one lookup and vector copy without scanning retained paint', () => {
  for (const size of [16, 4096, 100000]) {
    const state = createLayerPresentationState(Array.from({ length: size }, (_, id) => ({ id })));
    const find = Array.prototype.findIndex, slice = Array.prototype.slice;
    let visits = 0, copies = 0, changed, unchanged;
    Array.prototype.findIndex = function(callback, receiver) {
      return find.call(this, (value, index, array) => { if (this === state.stack.layers) visits++; return callback.call(receiver, value, index, array); });
    };
    Array.prototype.slice = function(...args) { if (this === state.stack.layers) copies += this.length; return slice.apply(this, args); };
    const policy = { mode: 'modal', dismissOnEscape: false, dismissOnInteractOutside: false };
    try {
      changed = applyLayerPresentationEvent(state, { type: 'configure-layer', id: size - 1, policy }).value.state;
      assert.equal(visits, size); assert.equal(copies, size);
      visits = 0; copies = 0;
      unchanged = applyLayerPresentationEvent(state, { type: 'configure-layer', id: size - 1,
        policy: { mode: 'non-modal', dismissOnEscape: true, dismissOnInteractOutside: true } }).value.state;
      assert.equal(visits, size); assert.equal(copies, 0);
    } finally { Array.prototype.findIndex = find; Array.prototype.slice = slice; }
    assert.equal(changed.presentations, state.presentations); assert.equal(unchanged, state);
    assert.equal(changed.stack.layers[0], state.stack.layers[0]);
  }
});

test('reparent preserves unrelated order while moving an interleaved subtree behind a later parent', () => {
  const state = createLayerStackState([
    { id: 'old' }, { id: 'a', parentID: 'old' }, { id: 'child', parentID: 'a' },
    { id: 'unrelated' }, { id: 'grandchild', parentID: 'child' }, { id: 'target' },
    { id: 'target-child', parentID: 'target' }, { id: 'last' },
  ]);
  const result = applyLayerStackEvent(state, { type: 'reparent-layer', id: 'a', parentID: 'target' }).value;
  assert.deepEqual(result.state.layers.map(layer => layer.id), ['old', 'unrelated', 'target', 'a', 'child', 'grandchild', 'target-child', 'last']);
  assert.equal(result.state.layers[3].parentID, 'target'); assert.deepEqual(result.commands, []);
  assert.equal(result.state.layers[4], state.layers[2]);
  assert.equal(tryCreateLayerStackState(result.state.layers).ok, true);
  const closeOld = applyLayerStackEvent(result.state, { type: 'close-layer', id: 'old' }).value;
  assert.equal(closeOld.state.layers.some(layer => layer.id === 'grandchild'), true);
  const closeTarget = applyLayerStackEvent(closeOld.state, { type: 'close-layer', id: 'target' }).value;
  assert.deepEqual(closeTarget.state.layers.map(layer => layer.id), ['unrelated', 'last']);
});

test('reparent rejects cycles and missing endpoints and preserves stable order for earlier parents and detach', () => {
  const state = createLayerStackState([{ id: 'a' }, { id: 'child', parentID: 'a' }, { id: 'grandchild', parentID: 'child' }, { id: 'other' }]);
  for (const [id, parentID, code] of [
    ['a', 'child', 'layer-parent-cycle'], ['a', 'grandchild', 'layer-parent-cycle'],
    ['a', 'a', 'layer-self-parent'], ['a', 'missing', 'layer-parent-missing'], ['missing', 'a', 'layer-id-missing'],
  ]) assert.equal(applyLayerStackEvent(state, { type: 'reparent-layer', id, parentID }).error.code, code);
  assert.equal(applyLayerStackEvent(state, { type: 'reparent-layer', id: 'child', parentID: 'a' }).value.state, state);
  const earlier = applyLayerStackEvent(state, { type: 'reparent-layer', id: 'grandchild', parentID: 'a' }).value.state;
  assert.deepEqual(earlier.layers.map(layer => layer.id), state.layers.map(layer => layer.id));
  assert.equal(earlier.layers[2].parentID, 'a'); assert.equal(earlier.layers[1], state.layers[1]);
  const detached = applyLayerStackEvent(earlier, { type: 'reparent-layer', id: 'child', parentID: null }).value.state;
  assert.deepEqual(detached.layers.map(layer => layer.id), state.layers.map(layer => layer.id));
  assert.equal(detached.layers[1].parentID, null);
  assert.equal(state.layers[1].parentID, 'a');
});

test('reparent permutes active paint without replacing generations or moving retained exit slots', () => {
  let state = createLayerPresentationState([{ id: 'a' }, { id: 'child', parentID: 'a' }, { id: 'exit' }, { id: 'target' }, { id: 'grandchild', parentID: 'child' }, { id: 'last' }]);
  state = applyLayerPresentationEvent(state, { type: 'retain-layer', id: 'exit', generation: 3 }).value.state;
  state = applyLayerPresentationEvent(state, { type: 'close-layer', id: 'exit' }).value.state;
  const previous = state;
  state = applyLayerPresentationEvent(state, { type: 'reparent-layer', id: 'a', parentID: 'target' }).value.state;
  assert.deepEqual(state.stack.layers.map(layer => layer.id), ['target', 'a', 'child', 'grandchild', 'last']);
  assert.deepEqual(state.presentations.map(entry => [entry.id, entry.generation, entry.order]), [['target', 4, 0], ['a', 1, 1], ['exit', 3, 2], ['child', 2, 3], ['grandchild', 5, 4], ['last', 6, 5]]);
  assert.equal(state.presentations[2], previous.presentations[2]); assert.equal(state.presentations[4], previous.presentations[4]);
  assert.equal(state.generation, previous.generation); assert.equal(state.revision, previous.revision + 1);
  assert.equal(applyLayerPresentationEvent(state, { type: 'reparent-layer', id: 'a', parentID: 'target' }).value.state, state);
  assert.equal(applyLayerPresentationEvent(state, { type: 'reparent-layer', id: 'exit', parentID: null }).error.code, 'layer-id-missing');
  state = applyLayerPresentationEvent(state, { type: 'release-layer', id: 'exit', generation: 3 }).value.state;
  assert.deepEqual(state.presentations.map(entry => entry.id), ['target', 'a', 'child', 'grandchild', 'last']);
});

test('foreign reparent transitions normalize mutable records before granting canonical provenance', () => {
  const root = { id: 'root' }, child = { id: 'child', parentID: 'root' }, target = { id: 'target' };
  const result = applyLayerStackEvent({ layers: [root, child, target] }, { type: 'reparent-layer', id: 'root', parentID: 'target' }).value;
  child.mode = 'invalid'; target.parentID = 'missing';
  assert.equal(result.state.layers[0].parentID, null); assert.equal(result.state.layers[2].mode, 'non-modal');
  assert.equal(applyLayerStackEvent(result.state, { type: 'dismiss-top', reason: 'escape' }).ok, true);
  for (const value of [result.state, result.state.layers, ...result.state.layers]) assert.equal(Object.isFrozen(value), true);
});

test('core:layer-stack:reparent-work remains linear through the supported presentation ceiling', () => {
  for (const size of [16, 4096, 100000]) {
    const state = createLayerPresentationState(Array.from({ length: size }, (_, id) => ({ id, ...(id % 2 === 1 && id !== size - 1 ? { parentID: 0 } : {}) })));
    const iterator = Array.prototype[Symbol.iterator], has = Set.prototype.has, set = Map.prototype.set;
    let layerVisits = 0, paintVisits = 0, memberships = 0, indexWrites = 0, result;
    Array.prototype[Symbol.iterator] = function (...args) {
      const inner = Reflect.apply(iterator, this, args), source = this;
      return { next() { const next = inner.next(); if (!next.done) { if (source === state.stack.layers) layerVisits++; if (source === state.presentations) paintVisits++; } return next; }, [Symbol.iterator]() { return this; } };
    };
    Set.prototype.has = function (...args) { memberships++; return Reflect.apply(has, this, args); };
    Map.prototype.set = function (...args) { indexWrites++; return Reflect.apply(set, this, args); };
    try { result = applyLayerPresentationEvent(state, { type: 'reparent-layer', id: 0, parentID: size - 1 }).value; }
    finally { Array.prototype[Symbol.iterator] = iterator; Set.prototype.has = has; Map.prototype.set = set; }
    assert.equal(result.state.stack.layers.length, size); assert.equal(result.state.stack.layers[size / 2].id, 0);
    assert.equal(result.state.generation, size); assert.equal(result.state.presentations[size / 2].generation, 1);
    assert.equal(layerVisits, size); assert.equal(paintVisits, size); assert.equal(indexWrites, size);
    assert.ok(memberships > 0 && memberships <= size);
    assert.deepEqual(result.commands, []);
  }
});

test('presentation retention preserves paint while canonical ancestor closure removes input authority', () => {
  let state = createLayerPresentationState([
    { id: 'parent', mode: 'modal' }, { id: 'child', parentID: 'parent' }, { id: 'sibling' },
  ]);
  const original = state;
  for (const entry of state.presentations.slice(0, 2)) {
    state = applyLayerPresentationEvent(state, { type: 'retain-layer', id: entry.id, generation: entry.generation }).value.state;
  }
  const retained = state;
  assert.equal(applyLayerPresentationEvent(state, { type: 'retain-layer', id: 'child', generation: 2 }).value.state, retained);
  const change = applyLayerPresentationEvent(state, { type: 'close-layer', id: 'parent' }).value;
  state = change.state;
  assert.deepEqual(state.stack.layers.map(layer => layer.id), ['sibling']);
  assert.deepEqual(getInteractiveLayerIDs(state.stack), ['sibling']);
  assert.equal(getTopLayer(state.stack).id, 'sibling');
  assert.deepEqual(change.commands, applyLayerStackEvent(retained.stack, { type: 'close-layer', id: 'parent' }).value.commands);
  assert.deepEqual(state.presentations.map(({ id, phase, order }) => ({ id, phase, order })), [
    { id: 'parent', phase: 'exiting', order: 0 }, { id: 'child', phase: 'exiting', order: 1 }, { id: 'sibling', phase: 'active', order: 2 },
  ]);
  assert.equal(state.presentations[2], retained.presentations[2]);
  assert.deepEqual(original.presentations.map(entry => entry.phase), ['active', 'active', 'active']);
  for (const value of [state, state.presentations, ...state.presentations, change, change.commands, ...change.commands]) assert.equal(Object.isFrozen(value), true);
  state = applyLayerPresentationEvent(state, { type: 'release-layer', id: 'parent', generation: 1 }).value.state;
  assert.deepEqual(state.presentations.map(({ id, order }) => [id, order]), [['child', 0], ['sibling', 1]]);
  assert.equal(state.stack, change.state.stack);
});

test('presentation reopen issues a new generation above older exits and stale completions cannot release it', () => {
  let state = createLayerPresentationState([{ id: 'dialog' }]);
  const send = event => { const result = applyLayerPresentationEvent(state, event); assert.equal(result.ok, true); state = result.value.state; return result.value; };
  send({ type: 'retain-layer', id: 'dialog', generation: 1 });
  send({ type: 'close-layer', id: 'dialog' });
  send({ type: 'open-layer', layer: { id: 'dialog' } });
  assert.deepEqual(state.presentations.map(entry => [entry.id, entry.generation, entry.phase, entry.order]), [['dialog', 1, 'exiting', 0], ['dialog', 2, 'active', 1]]);
  send({ type: 'retain-layer', id: 'dialog', generation: 2 });
  send({ type: 'release-layer', id: 'dialog', generation: 1 });
  assert.deepEqual(state.presentations.map(entry => [entry.generation, entry.retained, entry.order]), [[2, true, 0]]);
  const latest = state;
  assert.deepEqual(send({ type: 'release-layer', id: 'dialog', generation: 1 }).commands, []);
  assert.equal(state, latest);
  assert.equal(applyLayerPresentationEvent(state, { type: 'retain-layer', id: 'dialog', generation: 1 }).error.code, 'layer-presentation-generation-stale');
  send({ type: 'release-layer', id: 'dialog', generation: 2 });
  assert.equal(state.presentations[0].phase, 'active');
  assert.equal(state.presentations[0].retained, false);
  assert.deepEqual(state.stack.layers.map(layer => layer.id), ['dialog']);
  send({ type: 'close-layer', id: 'dialog' });
  assert.deepEqual(state.presentations, []);
});

test('presentation capacity includes exits and rejects before materialization while release restores admission', () => {
  for (const maxItems of [0, -1, 1.5, NaN, Infinity, 100001]) assert.equal(tryCreateLayerPresentationState([], { maxItems }).error.code, 'invalid-max-items');
  let reads = 0;
  const excessive = [{ get id() { reads++; return 'one'; } }, { get id() { reads++; return 'two'; } }];
  assert.equal(tryCreateLayerPresentationState(excessive, { maxItems: 1 }).error.code, 'item-ceiling-exceeded');
  assert.equal(reads, 0);
  let state = createLayerPresentationState([{ id: 'one' }], { maxItems: 1 });
  state = applyLayerPresentationEvent(state, { type: 'retain-layer', id: 'one', generation: 1 }).value.state;
  state = applyLayerPresentationEvent(state, { type: 'close-layer', id: 'one' }).value.state;
  assert.equal(state.stack.layers.length, 0);
  const rejected = applyLayerPresentationEvent(state, { type: 'open-layer', layer: { get id() { reads++; return 'two'; } } });
  assert.equal(rejected.error.code, 'item-ceiling-exceeded'); assert.equal(reads, 0);
  const accepted = applyLayerPresentationEvent(state, { type: 'release-layer', id: 'one', generation: 1 }).value.state;
  state = applyLayerPresentationEvent(accepted, { type: 'open-layer', layer: { id: 'two' } }).value.state;
  assert.equal(state.presentations[0].generation, 2); assert.equal(state.maxItems, 1);
  assert.equal(applyLayerPresentationEvent(state, { type: 'open-layer', layer: { id: 'two' } }).ok, false);
});

test('presentation runtime admission rejects forged states without observing caller fields', () => {
  const state = createLayerPresentationState([{ id: 'dialog' }]);
  let reads = 0;
  const foreign = Object.defineProperty({}, 'stack', { get() { reads++; throw Error('not owner-issued'); } });
  for (const candidate of [foreign, { ...state }, Object.freeze({ ...state })]) {
    assert.equal(applyLayerPresentationEvent(candidate, { type: 'dismiss-top', reason: 'escape' }).error.code, 'layer-presentation-state-invalid');
  }
  assert.equal(reads, 0);
  for (const generation of [0, -1, 0.5, NaN, Infinity]) {
    for (const type of ['retain-layer', 'release-layer']) assert.equal(applyLayerPresentationEvent(state, { type, id: 'dialog', generation }).error.code, 'layer-presentation-generation-invalid');
  }
});

test('core:layer-presentation:lifetime-work reuses canonical transitions and preserves trusted ignored work at scale', () => {
  for (const size of [16, 4096, 100000]) {
    const state = createLayerPresentationState(Array.from({ length: size }, (_, id) => ({ id, mode: 'tooltip' })));
    const map = Array.prototype.map, iterator = Array.prototype[Symbol.iterator]; let scans = 0;
    Array.prototype.map = function (...args) { if (this === state.presentations || this === state.stack.layers) scans++; return Reflect.apply(map, this, args); };
    Array.prototype[Symbol.iterator] = function (...args) { if (this === state.presentations || this === state.stack.layers) scans++; return Reflect.apply(iterator, this, args); };
    try {
      const ignored = applyLayerPresentationEvent(state, { type: 'dismiss-top', reason: 'escape' }).value;
      assert.equal(ignored.state, state); assert.deepEqual(ignored.commands, []); assert.equal(scans, 0);
    } finally { Array.prototype.map = map; Array.prototype[Symbol.iterator] = iterator; }
    const event = { type: 'dismiss-top', reason: 'interact-outside' };
    let visits = 0, change;
    Array.prototype[Symbol.iterator] = function (...args) {
      const inner = Reflect.apply(iterator, this, args);
      if (this !== state.presentations) return inner;
      return { next() { const result = inner.next(); if (!result.done) visits++; return result; }, [Symbol.iterator]() { return this; } };
    };
    try { change = applyLayerPresentationEvent(state, event).value; }
    finally { Array.prototype[Symbol.iterator] = iterator; }
    assert.equal(visits, size, 'A changed generation visits each presentation exactly once');
    const legacy = applyLayerStackEvent(state.stack, event).value;
    assert.deepEqual(change.state.stack, legacy.state); assert.deepEqual(change.commands, legacy.commands);
    assert.equal(change.state.presentations.length, size - 1);
    assert.equal(change.state.presentations[0], state.presentations[0]);
  }
});

test('LAY-02, LAY-05: layer stack accepts sibling ancestry only to already-open parents', () => {
  let state = createLayerStackState();
  state = applyLayerStackEvent(state, {
    type: 'open-layer', layer: { id: 'dialog', mode: 'modal' },
  }).value.state;
  state = applyLayerStackEvent(state, {
    type: 'open-layer', layer: { id: 'popover-a', parentID: 'dialog' },
  }).value.state;
  state = applyLayerStackEvent(state, {
    type: 'open-layer', layer: { id: 'popover-b', parentID: 'dialog' },
  }).value.state;
  assert.equal(getTopLayer(state).id, 'popover-b');
  assert.deepEqual(getInteractiveLayerIDs(state), ['dialog', 'popover-a', 'popover-b']);
  assert.equal(applyLayerStackEvent(state, {
    type: 'open-layer', layer: { id: 'invalid', parentID: 'missing' },
  }).ok, false);
  assert.equal(tryCreateLayerStackState([
    { id: 'future-child', parentID: 'future-parent' },
    { id: 'future-parent' },
  ]).ok, false);
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

test('LAY-04: closing an ancestor closes sibling branches in reverse z-order', () => {
  const state = createLayerStackState([
    { id: 'dialog', mode: 'modal' },
    { id: 'popover-a', parentID: 'dialog' },
    { id: 'tooltip-a', parentID: 'popover-a', mode: 'tooltip' },
    { id: 'popover-b', parentID: 'dialog' },
    { id: 'tooltip-b', parentID: 'popover-b', mode: 'tooltip' },
    { id: 'independent' },
  ]);
  const closed = applyLayerStackEvent(state, { type: 'close-layer', id: 'dialog' }).value;
  assert.deepEqual(closed.state.layers.map((layer) => layer.id), ['independent']);
  assert.deepEqual(closed.commands, [
    { type: 'layer-closed', id: 'tooltip-b', reason: 'ancestor-closed' },
    { type: 'layer-closed', id: 'popover-b', reason: 'ancestor-closed' },
    { type: 'layer-closed', id: 'tooltip-a', reason: 'ancestor-closed' },
    { type: 'layer-closed', id: 'popover-a', reason: 'ancestor-closed' },
    { type: 'layer-closed', id: 'dialog', reason: 'programmatic' },
  ]);
});

test('LayerStack sibling descendant closure stays linear at the supported ceiling', () => {
  const size = createSequence([]).maxItems;
  const state = createLayerStackState(Array.from({ length: size }, (_, index) => ({
    id: index,
    ...(index === 0 ? {} : { parentID: index % 2 === 0 ? 0 : index - 1 }),
  })));
  const findIndex = Array.prototype.findIndex;
  const has = Set.prototype.has;
  let searches = 0;
  let membershipReads = 0;
  Array.prototype.findIndex = function (...args) {
    if (this === state.layers) searches += 1;
    return Reflect.apply(findIndex, this, args);
  };
  Set.prototype.has = function (...args) {
    membershipReads += 1;
    return Reflect.apply(has, this, args);
  };
  try {
    const closed = applyLayerStackEvent(state, { type: 'close-layer', id: 0 }).value;
    assert.equal(closed.state.layers.length, 0);
    assert.equal(closed.commands.length, size);
    assert.equal(closed.commands[0].id, size - 1);
    assert.deepEqual(closed.commands.at(-1), { type: 'layer-closed', id: 0, reason: 'programmatic' });
  } finally {
    Array.prototype.findIndex = findIndex;
    Set.prototype.has = has;
  }
  assert.equal(searches, 1);
  assert.equal(membershipReads, size - 1);
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
    [{ id: 'child', parentID: 'parent' }, { id: 'parent' }],
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

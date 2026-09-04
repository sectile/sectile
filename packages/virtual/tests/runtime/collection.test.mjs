/* Law evidence: COL-01 COL-02 COL-03 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEstimatedVirtualExtent,
  createExactVirtualExtent,
  createVirtualCollection,
  createVirtualCollectionPatch,
  createVirtualExtent,
  reconcileVirtualCollectionExtents,
  reconcileVirtualCollectionValueExtents,
  replaceVirtualCollection,
  resolveVirtualLaneGeometry,
  updateVirtualCollection,
  virtualSizePolicyRequiresMeasurement,
} from '../../.verification-dist/collection.js';
import { createExtentIndex } from '../../.verification-dist/extent-index.js';

const item = (id, label = String(id)) => Object.freeze({ id, label });
const getID = (value) => value.id;

function rejectsWithCode(operation, code) {
  assert.throws(operation, (error) => error?.cause?.code === code);
}

test('COL-01: raw projection preserves StableID distinctions and enforces ceilings before resolution', () => {
  const projection = createVirtualCollection(
    Object.freeze([item(1), item('1'), item(-1), item('-1')]),
    getID,
    { maxItems: 4 },
  );
  assert.deepEqual(projection.domain.ids, [1, '1', -1, '-1']);
  assert.equal(projection.domain.indexOf(1), 0);
  assert.equal(projection.domain.indexOf('1'), 1);

  rejectsWithCode(
    () => createVirtualCollection(
      Object.freeze([item('a'), item('a')]),
      getID,
    ),
    'duplicate-id',
  );
  rejectsWithCode(
    () => createVirtualCollection(
      Object.freeze([item(-0)]),
      getID,
    ),
    'invalid-id-type',
  );

  let calls = 0;
  rejectsWithCode(
    () => createVirtualCollection(
      Object.freeze([item('a'), item('b')]),
      (value) => {
        calls += 1;
        return value.id;
      },
      { maxItems: 1 },
    ),
    'item-ceiling-exceeded',
  );
  assert.equal(calls, 0);
});

test('COL-01: raw replacements resolve only the changed value window and reuse semantic no-ops', () => {
  const source = Object.freeze([item('a'), item('b'), item('c')]);
  let calls = 0;
  const resolver = (value) => {
    calls += 1;
    return value.id;
  };
  const previous = createVirtualCollection(source, resolver, { maxItems: 10 });
  calls = 0;
  const inserted = item('x');
  const items = Object.freeze([source[0], inserted, source[1], source[2]]);
  const next = replaceVirtualCollection(previous, items, resolver);

  assert.equal(calls, 1);
  assert.deepEqual(next.change, {
    index: 1,
    deleteCount: 0,
    inserted: ['x'],
  });
  assert.deepEqual(next.domain.ids, ['a', 'x', 'b', 'c']);
  assert.deepEqual(previous.domain.ids, ['a', 'b', 'c']);

  const equivalentArray = Object.freeze([...items]);
  assert.equal(
    replaceVirtualCollection(next, equivalentArray, resolver),
    next,
  );
});

test('COL-01: value-only replacements retain the identity owner and expose a bounded value window', () => {
  const source = Object.freeze([
    item('a', 'before'),
    item('b', 'stable'),
  ]);
  const previous = createVirtualCollection(source, getID);
  const next = replaceVirtualCollection(
    previous,
    Object.freeze([item('a', 'after'), source[1]]),
    getID,
  );

  assert.equal(next.domain, previous.domain);
  assert.equal(next.change, null);
  assert.deepEqual(next.valueChange, { index: 0, count: 1 });
});

test('COL-01: value-dependent extent repair is bounded to the changed value window', () => {
  const source = Object.freeze([
    item('a', 'aa'),
    item('b', 'bbb'),
    item('c', 'cccc'),
  ]);
  const previous = createVirtualCollection(source, getID);
  const next = replaceVirtualCollection(
    previous,
    Object.freeze([source[0], item('b', 'bbbbbb'), source[2]]),
    getID,
  );
  const state = {
    domain: previous.domain,
    extents: createExtentIndex([
      createEstimatedVirtualExtent(2, source[0], 0),
      createExactVirtualExtent(3),
      createEstimatedVirtualExtent(4, source[2], 2),
    ]),
  };
  const updates = reconcileVirtualCollectionValueExtents(
    state,
    next,
    { kind: 'estimated', estimate: (value) => value.label.length },
  );
  assert.deepEqual(updates, [
    { index: 1, extent: { kind: 'unknown', fallback: 6 } },
  ]);
  assert.deepEqual(
    reconcileVirtualCollectionValueExtents(
      state,
      next,
      { kind: 'fixed', extent: 20 },
    ),
    [],
  );
});

test('COL-02: trusted patches match raw replacement while resolving only declared identities', () => {
  const source = Object.freeze([item('a'), item('b'), item('c')]);
  let calls = 0;
  const resolver = (value) => {
    calls += 1;
    return value.id;
  };
  const previous = createVirtualCollection(source, resolver, { maxItems: 10 });
  const inserted = item('x');
  const items = Object.freeze([source[0], inserted, source[1], source[2]]);
  const raw = replaceVirtualCollection(previous, items, resolver);

  calls = 0;
  const patch = createVirtualCollectionPatch(previous, {
    items,
    index: 1,
    deleteCount: 0,
    inserted: ['x'],
  });
  const trusted = updateVirtualCollection(previous, patch);

  assert.equal(calls, 1);
  assert.deepEqual(trusted.change, raw.change);
  assert.deepEqual(trusted.domain.ids, raw.domain.ids);
  assert.equal(trusted.items, items);

  rejectsWithCode(
    () => updateVirtualCollection(previous, { kind: 'trusted-patch' }),
    'virtual-collection-patch-invalid',
  );
  const forgedProjection = Object.freeze({
    items: previous.items,
    domain: previous.domain,
    getID: previous.getID,
    change: null,
    valueChange: null,
  });
  rejectsWithCode(
    () => updateVirtualCollection(forgedProjection, { kind: 'raw', items }),
    'virtual-collection-input-invalid',
  );
  rejectsWithCode(
    () => createVirtualCollectionPatch(previous, {
      items,
      index: 1,
      deleteCount: 0,
      inserted: ['wrong'],
    }),
    'virtual-collection-patch-invalid',
  );
});

test('COL-02: extent reconciliation preserves surviving measurements by stable identity', () => {
  const source = Object.freeze([item('a'), item('b'), item('c')]);
  const previous = createVirtualCollection(source, getID);
  const next = replaceVirtualCollection(
    previous,
    Object.freeze([source[0], source[2], source[1], item('x')]),
    getID,
  );
  const extents = createExtentIndex([
    createExactVirtualExtent(10),
    createExactVirtualExtent(20),
    createExactVirtualExtent(30),
  ]);
  const patch = reconcileVirtualCollectionExtents(
    { domain: previous.domain, extents },
    next,
    { kind: 'estimated', estimate: 7 },
  );

  assert.deepEqual(patch?.patch, {
    type: 'splice',
    index: 1,
    deleteCount: 2,
    inserted: ['c', 'b', 'x'],
  });
  assert.deepEqual(patch?.insertedExtents, [
    { kind: 'exact', value: 30 },
    { kind: 'exact', value: 20 },
    { kind: 'unknown', fallback: 7 },
  ]);
  rejectsWithCode(
    () => reconcileVirtualCollectionExtents(
      {
        domain: previous.domain,
        extents: createExtentIndex([createExactVirtualExtent(10)]),
      },
      next,
      { kind: 'estimated', estimate: 7 },
    ),
    'virtual-layout-domain-mismatch',
  );
});

test('COL-03: size and lane policies resolve finite canonical geometry', () => {
  assert.deepEqual(
    createVirtualExtent({ kind: 'fixed', extent: 24 }, item('a'), 0),
    { kind: 'exact', value: 24 },
  );
  assert.deepEqual(
    createVirtualExtent(
      { kind: 'estimated', estimate: (value, index) => value.label.length + index },
      item('a', 'four'),
      2,
    ),
    { kind: 'unknown', fallback: 6 },
  );
  assert.deepEqual(
    createVirtualExtent({ kind: 'measured' }, item('a'), 0, 18),
    { kind: 'unknown', fallback: 18 },
  );
  assert.equal(
    virtualSizePolicyRequiresMeasurement({ kind: 'measured' }),
    true,
  );
  assert.equal(
    virtualSizePolicyRequiresMeasurement({ kind: 'fixed', extent: 10 }),
    false,
  );
  rejectsWithCode(
    () => createVirtualExtent({ kind: 'measured' }, item('a'), 0),
    'virtual-size-policy-invalid',
  );

  assert.deepEqual(
    resolveVirtualLaneGeometry(500, {
      kind: 'responsive',
      minExtent: 200,
      maxCount: 4,
      gap: 10,
    }),
    { count: 2, extent: 245, gap: 10 },
  );
  assert.deepEqual(
    resolveVirtualLaneGeometry(500, {
      kind: 'fixed',
      count: 3,
      gap: 10,
    }),
    { count: 3, extent: 160, gap: 10 },
  );
  assert.deepEqual(
    resolveVirtualLaneGeometry(0, {
      kind: 'responsive',
      minExtent: 200,
      maxCount: 4,
    }),
    { count: 1, extent: 0, gap: 0 },
  );
  rejectsWithCode(
    () => resolveVirtualLaneGeometry(-1, {
      kind: 'fixed',
      count: 1,
    }),
    'virtual-lane-policy-invalid',
  );

  assert.deepEqual(
    createEstimatedVirtualExtent(5, item('a'), 0),
    { kind: 'unknown', fallback: 5 },
  );
});

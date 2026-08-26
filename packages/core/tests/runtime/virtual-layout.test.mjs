/* Law evidence: VRT-01 VRT-02 VRT-03 VRT-04 VRT-05 VRT-06 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createCollectionWindowState } from '../../.verification-dist/collection-window.js';
import { createExtentIndex } from '../../.verification-dist/structures/extent-index.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import {
  applyVirtualLayoutEvent,
  collectionWindowEventForVirtualLayout,
  createVirtualLayoutState,
} from '../../.verification-dist/virtual-layout.js';

const estimated = (value) => ({ kind: 'estimated', value });
const exact = (value) => ({ kind: 'exact', value });
const domain = (size, prefix = 'item') => createSequence(
  Array.from({ length: size }, (_, index) => `${prefix}-${index}`),
  { maxItems: Math.max(size, 1) },
);

test('VRT-01: render range contains the visible range with pixel overscan', () => {
  const state = createVirtualLayoutState(
    domain(100),
    createExtentIndex(Array(100).fill(estimated(10))),
    { viewportOffset: 250, viewportExtent: 100, overscanBefore: 50, overscanAfter: 50 },
  );
  assert.deepEqual(state.visibleRange, { start: 25, end: 35 });
  assert.deepEqual(state.renderRange, { start: 20, end: 40 });
});

test('VRT-02, VRT-03: current measurements preserve the anchor and stale reports reject', () => {
  const state = createVirtualLayoutState(
    domain(6),
    createExtentIndex(Array(6).fill(estimated(10))),
    { viewportOffset: 20, viewportExtent: 20, overscanBefore: 0, overscanAfter: 0 },
  );
  const updated = applyVirtualLayoutEvent(state, {
    type: 'measurements-reported',
    generation: state.measurementGeneration,
    updates: [{ index: 0, extent: exact(20) }],
  }).value;
  assert.equal(updated.state.viewportOffset, 30);
  assert.deepEqual(updated.commands[0], {
    type: 'set-scroll-offset', offset: 30, delta: 10, reason: 'anchor-correction',
  });
  const stale = applyVirtualLayoutEvent(updated.state, {
    type: 'measurements-reported', generation: state.measurementGeneration - 1, updates: [],
  });
  assert.equal(stale.error.code, 'virtual-layout-measurement-stale');
});

test('VRT-04: sequence patches update geometry while preserving the viewport anchor', () => {
  const state = createVirtualLayoutState(
    domain(6),
    createExtentIndex(Array(6).fill(exact(10))),
    { viewportOffset: 20, viewportExtent: 10, overscanBefore: 0, overscanAfter: 0 },
  );
  const inserted = applyVirtualLayoutEvent(state, {
    type: 'sequence-patched',
    patch: { type: 'splice', index: 0, deleteCount: 0, inserted: ['before-a', 'before-b'] },
    insertedExtents: [estimated(5), estimated(5)],
  }).value;
  assert.equal(inserted.state.domainSize, 8);
  assert.equal(inserted.state.viewportOffset, 30);
  const moved = applyVirtualLayoutEvent(inserted.state, {
    type: 'sequence-patched',
    patch: { type: 'move', from: 4, to: 7, count: 1 },
  }).value;
  assert.equal(moved.state.extents.extentAt(7).value, 10);
});

test('VRT-05: target scrolling emits an explicit host offset command', () => {
  const state = createVirtualLayoutState(
    domain(20),
    createExtentIndex(Array(20).fill(exact(10))),
    { viewportExtent: 30, overscanBefore: 0, overscanAfter: 0 },
  );
  const update = applyVirtualLayoutEvent(state, {
    type: 'scroll-to-index', index: 10, align: 'center',
  }).value;
  assert.equal(update.state.viewportOffset, 90);
  assert.equal(update.commands[0].type, 'set-scroll-offset');
  assert.equal(update.commands[0].reason, 'target');
});

test('VRT-06: data loading remains a generation-bound collection-window concern', () => {
  const layout = createVirtualLayoutState(
    domain(100),
    createExtentIndex(Array(100).fill(estimated(10))),
    { viewportOffset: 300, viewportExtent: 100, overscanBefore: 0, overscanAfter: 0 },
  );
  const collection = createCollectionWindowState({ start: 0, size: 20, total: 100 });
  const event = collectionWindowEventForVirtualLayout(layout, collection, domain(20, 'loaded')).value;
  assert.deepEqual(event, { type: 'request-window', direction: 'after', anchor: 'loaded-19' });
});

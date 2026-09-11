/* Law evidence: MRY-01 MRY-02 MRY-03 MRY-04 MRY-05 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '@sectile/core/sequence';
import { createExtentIndex, createUniformExtentIndex } from '../../.verification-dist/extent-index.js';
import { masonryInternals, masonryLayoutWork } from '../../.verification-dist/internal/masonry-internals.js';
import {
  applyMasonryMeasurements,
  applyMasonryMutation,
  createMasonryLayout,
  masonryRectAt,
  queryMasonryLayout,
  restoreMasonryLayout,
  snapshotMasonryLayout,
  tryApplyMasonryMeasurements,
  tryApplyMasonryMutation,
} from '../../.verification-dist/masonry-layout.js';

const exact = (value) => ({ kind: 'exact', value });
const domain = (size) => createSequence(
  Array.from({ length: size }, (_, index) => `item-${index}`),
  { maxItems: Math.max(1, size + 16) },
);

function intersects(left, right) {
  return left.x < right.x + right.width && right.x < left.x + left.width
    && left.y < right.y + right.height && right.y < left.y + left.height;
}

function referenceShortestLanes(extents, laneCount, itemGap) {
  const laneEnds = Array(laneCount).fill(0);
  return extents.map((extent) => {
    let selected = 0;
    for (let lane = 1; lane < laneCount; lane += 1) {
      if (laneEnds[lane] < laneEnds[selected]) selected = lane;
    }
    laneEnds[selected] += extent + itemGap;
    return selected;
  });
}

test('MRY-01: shortest placement matches a reference scan and assigns every identity once', () => {
  const values = Array.from({ length: 257 }, (_, index) => 11 + ((index * 37) % 71));
  const state = createMasonryLayout(domain(values.length), createExtentIndex(values.map(exact)), {
    laneCount: 32,
    laneExtent: 40,
    laneGap: 3,
    itemGap: 5,
    placementPolicy: 'shortest',
  });
  const plan = queryMasonryLayout(state, {
    viewport: { x: 0, y: 0, width: 2_000, height: 100_000 },
  });
  assert.equal(plan.placements.length, values.length);
  assert.equal(new Set(plan.placements.map(({ id }) => id)).size, values.length);
  assert.deepEqual(plan.placements.map(({ lane }) => lane), referenceShortestLanes(values, 32, 5));
});

test('MRY-02: viewport queries equal a full rectangle scan and reverse flow reflects geometry', () => {
  const values = Array.from({ length: 96 }, (_, index) => 10 + ((index * 19) % 43));
  const input = { laneCount: 5, laneExtent: 30, laneGap: 4, itemGap: 3 };
  const forward = createMasonryLayout(domain(values.length), createExtentIndex(values.map(exact)), input);
  const reverse = createMasonryLayout(domain(values.length), createExtentIndex(values.map(exact)), { ...input, flow: 'reverse' });
  const full = queryMasonryLayout(forward, { viewport: { x: 0, y: 0, width: 200, height: 100_000 } });

  for (let step = 0; step < 32; step += 1) {
    const viewport = { x: (step * 17) % 120, y: (step * 73) % Math.max(1, full.contentSize.height), width: 67, height: 91 };
    const expected = full.placements.filter(({ rect }) => intersects(rect, viewport)).map(({ id }) => id);
    assert.deepEqual(queryMasonryLayout(forward, { viewport }).placements.map(({ id }) => id), expected);
  }

  for (let index = 0; index < values.length; index += 1) {
    const id = `item-${index}`;
    const left = masonryRectAt(forward, id);
    const right = masonryRectAt(reverse, id);
    assert.equal(left.y + right.y + left.height, full.contentSize.height);
    assert.equal(left.x, right.x);
  }
});

test('MRY-03: round-robin lane ownership survives dynamic measurements', () => {
  const values = Array.from({ length: 48 }, (_, index) => 20 + (index % 9));
  const state = createMasonryLayout(domain(values.length), createExtentIndex(values.map(exact)), {
    laneCount: 7,
    laneExtent: 50,
    placementPolicy: 'round-robin',
  });
  const measured = applyMasonryMeasurements(state, {
    generation: state.generation,
    measurements: Array.from({ length: 16 }, (_, index) => ({ index: index * 3, extent: exact(60 + index) })),
  }).state;
  const plan = queryMasonryLayout(measured, { viewport: { x: 0, y: 0, width: 400, height: 100_000 } });
  assert.deepEqual(plan.placements.map(({ index, lane }) => [index, lane]), values.map((_, index) => [index, index % 7]));
});

test('MRY-04: measurements and item mutations preserve anchors and reject stale generations', () => {
  const state = createMasonryLayout(domain(12), createExtentIndex(Array.from({ length: 12 }, () => exact(20))), {
    laneCount: 2,
    laneExtent: 40,
    itemGap: 2,
    placementPolicy: 'round-robin',
  });
  const anchor = { id: 'item-8', viewportOffset: { x: 0, y: 0 } };
  const before = masonryRectAt(state, anchor.id);
  const measured = applyMasonryMeasurements(state, {
    generation: state.generation,
    anchor,
    measurements: [{ index: 0, extent: exact(35) }],
  });
  const afterMeasurement = masonryRectAt(measured.state, anchor.id);
  assert.deepEqual(measured.scrollDelta, {
    x: afterMeasurement.x - before.x,
    y: afterMeasurement.y - before.y,
  });
  assert.equal(tryApplyMasonryMeasurements(measured.state, { generation: state.generation, measurements: [] }).ok, false);

  const inserted = applyMasonryMutation(measured.state, {
    type: 'items',
    patch: { type: 'splice', index: 0, deleteCount: 0, inserted: ['inserted'] },
    insertedExtents: [exact(10)],
  }, anchor);
  assert.equal(inserted.state.domain.at(0), 'inserted');
  assert.ok(masonryRectAt(inserted.state, anchor.id) !== null);
});

test('masonry suffix reuse stays equivalent to a fresh shortest-lane rebuild', () => {
  const values = Array.from({ length: 513 }, (_, index) => 18 + ((index * 29) % 67));
  const input = {
    laneCount: 24,
    laneExtent: 36,
    laneGap: 3,
    itemGap: 5,
    placementPolicy: 'shortest',
  };
  const state = createMasonryLayout(
    domain(values.length),
    createExtentIndex(values.map(exact)),
    input,
  );
  const measured = applyMasonryMeasurements(state, {
    generation: state.generation,
    measurements: [
      { index: 487, extent: exact(91) },
      { index: 503, extent: exact(43) },
    ],
  }).state;
  const inserted = applyMasonryMutation(measured, {
    type: 'items',
    patch: {
      type: 'splice',
      index: 500,
      deleteCount: 1,
      inserted: ['replacement'],
    },
    insertedExtents: [exact(57)],
  }).state;
  const moved = applyMasonryMutation(inserted, {
    type: 'items',
    patch: { type: 'move', from: 505, to: 493, count: 3 },
  }).state;
  const rebuilt = createMasonryLayout(moved.domain, moved.extents, input);
  const viewport = { x: 0, y: 0, width: 1_000, height: 100_000 };
  const incrementalPlan = queryMasonryLayout(moved, { viewport });
  const rebuiltPlan = queryMasonryLayout(rebuilt, { viewport });

  assert.deepEqual(
    incrementalPlan.placements.map(({ id, index, lane, rect }) => ({ id, index, lane, rect })),
    rebuiltPlan.placements.map(({ id, index, lane, rect }) => ({ id, index, lane, rect })),
  );
  assert.deepEqual(incrementalPlan.contentSize, rebuiltPlan.contentSize);
});

test('MRY-05: uniform masonry derives placements without retaining the full layout', () => {
  const size = 100_000;
  const shared = Object.freeze(exact(44));
  const input = {
    laneCount: 8,
    laneExtent: 120,
    laneGap: 4,
    itemGap: 6,
    placementPolicy: 'shortest',
  };
  const state = createMasonryLayout(
    domain(size),
    createUniformExtentIndex(size, shared, { maxItems: size + 4 }),
    input,
  );
  assert.deepEqual(masonryLayoutWork(state), {
    representation: 'uniform',
    copiedPlacements: 0,
    recomputedPlacements: 0,
    retainedPlacements: 0,
  });

  const viewport = { x: 100, y: 310_000, width: 520, height: 480 };
  const plan = queryMasonryLayout(state, { viewport, overscan: 120 });
  const reference = createMasonryLayout(
    state.domain,
    createExtentIndex(Array.from({ length: size }, () => shared), { maxItems: size + 4 }),
    input,
  );
  const referencePlan = queryMasonryLayout(reference, { viewport, overscan: 120 });
  assert.deepEqual(plan.contentSize, referencePlan.contentSize);
  assert.deepEqual(
    plan.placements.map(({ id, index, lane, rect }) => ({ id, index, lane, rect })),
    referencePlan.placements.map(({ id, index, lane, rect }) => ({ id, index, lane, rect })),
  );

  const inserted = applyMasonryMutation(state, {
    type: 'items',
    patch: { type: 'splice', index: 0, deleteCount: 0, inserted: ['inserted'] },
    insertedExtents: [shared],
  }).state;
  assert.equal(masonryLayoutWork(inserted).representation, 'uniform');
  assert.equal(masonryLayoutWork(inserted).retainedPlacements, 0);
  const removed = applyMasonryMutation(inserted, {
    type: 'items',
    patch: { type: 'splice', index: 0, deleteCount: 1, inserted: [] },
  }).state;
  const moved = applyMasonryMutation(removed, {
    type: 'items',
    patch: { type: 'move', from: 1, to: size - 2, count: 1 },
  }).state;
  assert.equal(masonryLayoutWork(removed).representation, 'uniform');
  assert.equal(masonryLayoutWork(moved).representation, 'uniform');

  const restored = restoreMasonryLayout(snapshotMasonryLayout(state));
  assert.equal(masonryLayoutWork(restored).representation, 'uniform');
  assert.deepEqual(
    queryMasonryLayout(restored, { viewport, overscan: 120 }),
    plan,
  );

  const measured = applyMasonryMeasurements(state, {
    generation: state.generation,
    measurements: [{ index: 0, extent: exact(45) }],
  }).state;
  assert.equal(masonryLayoutWork(measured).representation, 'materialized');
  assert.equal(masonryLayoutWork(measured).recomputedPlacements, size);
});

test('ISSUE-097: geometry no-ops and projection-only changes retain logical packing', () => {
  const count = 4_096;
  const values = Array.from({ length: count }, (_, index) => 20 + (index % 17));
  const input = {
    axis: 'vertical',
    flow: 'forward',
    laneCount: 8,
    laneExtent: 100,
    laneGap: 5,
    itemGap: 3,
    placementPolicy: 'shortest',
  };
  const state = createMasonryLayout(domain(count), createExtentIndex(values.map(exact)), input);
  const owner = masonryInternals(state);
  assert.ok(owner !== undefined);

  const omitted = applyMasonryMutation(state, { type: 'geometry' });
  assert.equal(omitted.state, state);
  assert.equal(omitted.state.generation, state.generation);
  assert.deepEqual(omitted.scrollDelta, { x: 0, y: 0 });
  assert.equal(masonryInternals(omitted.state), owner);

  const explicit = applyMasonryMutation(state, { type: 'geometry', ...input });
  assert.equal(explicit.state, state);
  const currentExtent = state.extents.extentAt(0);
  assert.ok(currentExtent !== null);
  assert.equal(tryApplyMasonryMeasurements(explicit.state, {
    generation: state.generation,
    measurements: [{ index: 0, extent: currentExtent }],
  }).ok, true);

  const anchor = { id: 'item-1', viewportOffset: { x: 0, y: 0 } };
  const beforeAnchor = masonryRectAt(state, anchor.id);
  const projections = [
    { mutation: { type: 'geometry', laneExtent: 101 }, input: { ...input, laneExtent: 101 } },
    { mutation: { type: 'geometry', laneGap: 7 }, input: { ...input, laneGap: 7 } },
    { mutation: { type: 'geometry', axis: 'horizontal' }, input: { ...input, axis: 'horizontal' } },
    { mutation: { type: 'geometry', flow: 'reverse' }, input: { ...input, flow: 'reverse' } },
  ];
  const viewport = { x: 0, y: 0, width: 1_000_000, height: 1_000_000 };
  for (const fixture of projections) {
    const changed = applyMasonryMutation(state, fixture.mutation, anchor);
    const nextOwner = masonryInternals(changed.state);
    assert.equal(nextOwner, owner);
    assert.equal(changed.state.generation, state.generation + 1);
    assert.deepEqual(masonryLayoutWork(changed.state), masonryLayoutWork(state));
    const afterAnchor = masonryRectAt(changed.state, anchor.id);
    assert.deepEqual(changed.scrollDelta, {
      x: afterAnchor.x - beforeAnchor.x,
      y: afterAnchor.y - beforeAnchor.y,
    });
    const reference = createMasonryLayout(state.domain, state.extents, fixture.input);
    assert.deepEqual(
      queryMasonryLayout(changed.state, { viewport }).contentSize,
      queryMasonryLayout(reference, { viewport }).contentSize,
    );
    for (const index of [0, 1, count - 1]) {
      assert.deepEqual(masonryRectAt(changed.state, `item-${index}`), masonryRectAt(reference, `item-${index}`));
    }
  }

  for (const fixture of [
    { mutation: { type: 'geometry', laneCount: 7 }, input: { ...input, laneCount: 7 } },
    { mutation: { type: 'geometry', itemGap: 4 }, input: { ...input, itemGap: 4 } },
    { mutation: { type: 'geometry', placementPolicy: 'round-robin' }, input: { ...input, placementPolicy: 'round-robin' } },
  ]) {
    const changed = applyMasonryMutation(state, fixture.mutation).state;
    assert.notEqual(masonryInternals(changed), owner);
    assert.equal(masonryLayoutWork(changed).recomputedPlacements, count);
    const reference = createMasonryLayout(state.domain, state.extents, fixture.input);
    assert.deepEqual(
      queryMasonryLayout(changed, { viewport }).placements.map(({ id, lane, rect }) => ({ id, lane, rect })),
      queryMasonryLayout(reference, { viewport }).placements.map(({ id, lane, rect }) => ({ id, lane, rect })),
    );
  }

  const uniform = createMasonryLayout(
    domain(count),
    createUniformExtentIndex(count, exact(24), { maxItems: count }),
    input,
  );
  const uniformOwner = masonryInternals(uniform);
  const uniformProjected = applyMasonryMutation(uniform, { type: 'geometry', laneExtent: 101 }).state;
  assert.equal(masonryInternals(uniformProjected), uniformOwner);
  assert.equal(masonryLayoutWork(uniformProjected).representation, 'uniform');
  assert.equal(masonryLayoutWork(uniformProjected).retainedPlacements, 0);
});

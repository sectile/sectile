import assert from 'node:assert/strict';
import test from 'node:test';
import { createGrid } from '../.verification-dist/grid.js';
import { createRange } from '../.verification-dist/range.js';
import { createSequence } from '../.verification-dist/sequence.js';
import { createTree } from '../.verification-dist/tree.js';
import { createCursorState, reconcileCursor } from '../.verification-dist/internal/cursor.js';
import {
  clearSelection,
  createSelectionState,
  reconcileSelection,
  selectInterval,
  selectOne,
  toggleMultipleSelection,
} from '../.verification-dist/internal/selection.js';
import { reconcileReferenceCursor } from '../.verification-dist/internal/reference/cursor.js';
import {
  ReferenceSelectionState,
  reconcileReferenceSelection,
  referenceClearSelection,
  referenceSelectInterval,
  referenceSelectOne,
  referenceToggleMultipleSelection,
} from '../.verification-dist/internal/reference/selection.js';
import { ReferenceGrid } from '../.verification-dist/internal/reference/grid.js';
import { ReferenceRange } from '../.verification-dist/internal/reference/range.js';
import { ReferenceSequence } from '../.verification-dist/internal/reference/sequence.js';
import { ReferenceTree } from '../.verification-dist/internal/reference/tree.js';
import { createRng, deepNormalize, unwrap } from './support.mjs';

const SEED = 0x5ec71e;
const ITERATIONS = 2_000;

test('optimized implementations are observationally equivalent to independent references', () => {
  const rng = createRng(SEED);
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) verifySequence(rng, iteration);
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) verifyRange(rng);
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) verifyGrid(rng, iteration);
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) verifyTree(rng, iteration);
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) verifyCursor(rng, iteration);
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) verifySelection(rng, iteration);
});

function verifySequence(rng, iteration) {
  const size = rng.int(0, 80);
  const ids = rng.shuffle(Array.from({ length: size }, (_, index) => `s${iteration}-${index}`));
  const optimized = unwrap(createSequence(ids));
  const reference = new ReferenceSequence(ids);
  assert.deepEqual(optimized.ids, reference.ids);
  for (let probe = -1; probe <= size; probe += Math.max(1, Math.floor(size / 7) || 1)) {
    assert.equal(optimized.at(probe), reference.at(probe));
  }
  const eligibleSet = new Set(ids.filter(() => rng.bool()));
  for (let probe = 0; probe < 12 && ids.length > 0; probe += 1) {
    const current = rng.pick(ids);
    const direction = rng.pick([-1, 1]);
    const boundary = rng.pick(['stop', 'wrap']);
    const maxScan = rng.int(0, size + 2);
    const options = { eligible: (id) => eligibleSet.has(id), maxScan };
    assert.deepEqual(
      optimized.move(current, direction, boundary, options),
      reference.move(current, direction, boundary, options),
    );
  }
  const predicate = (_, index) => index % 3 !== 1;
  assert.deepEqual(optimized.project(predicate).ids, reference.project(predicate).ids);
}

function verifyRange(rng) {
  const originInteger = rng.int(-200, 201);
  const originScale = rng.int(0, 3);
  const stepInteger = rng.int(1, 51);
  const stepScale = rng.int(0, 3);
  const origin = decimal(originInteger, originScale);
  const step = decimal(stepInteger, stepScale);
  const count = rng.int(0, 40);
  const optimized = unwrap(createRange({ origin, step, count }));
  const reference = new ReferenceRange(origin, step, count);
  for (let probe = 0; probe < 12; probe += 1) {
    const tick = rng.int(0, count + 1);
    assert.equal(optimized.valueAt(tick), reference.valueAt(tick));
    assert.deepEqual(
      deepNormalize(optimized.ratioOfTick(tick)),
      deepNormalize(reference.ratioOfTick(tick)),
    );
  }
  for (let probe = 0; probe < 18; probe += 1) {
    const sample = decimal(rng.int(-500, 501), rng.int(0, 3));
    for (const tie of ['lower', 'upper', 'even-tick']) {
      assert.equal(optimized.snap(sample, tie), reference.snap(sample, tie));
    }
    assert.equal(optimized.clamp(sample), reference.clamp(sample));
  }
  for (let denominator = 1n; denominator <= 6n; denominator += 1n) {
    const ratio = { numerator: BigInt(rng.int(-2, 9)), denominator };
    for (const tie of ['lower', 'upper', 'even-tick']) {
      assert.equal(optimized.tickFromRatio(ratio, tie), reference.tickFromRatio(ratio, tie));
    }
  }
}

function verifyGrid(rng, iteration) {
  const rows = rng.int(0, 12);
  const columns = rng.int(0, 12);
  const cells = [];
  const ragged = Array.from({ length: rows }, () => []);
  let next = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const id = rng.next() < 0.35 ? `g${iteration}-${next++}` : null;
      cells.push(id);
      ragged[row].push(id);
    }
  }
  const optimized = unwrap(createGrid(ragged, { columnCount: columns }));
  const reference = new ReferenceGrid(rows, columns, cells);
  assert.equal(optimized.size, reference.size);
  for (let row = -1; row <= rows; row += 1) {
    for (let column = -1; column <= columns; column += 1) {
      if ((row + column) % 3 === 0) assert.equal(optimized.cellAt(row, column), reference.cellAt(row, column));
    }
  }
  const ids = Array.from({ length: next }, (_, index) => `g${iteration}-${index}`);
  const eligible = new Set(ids.filter(() => rng.bool()));
  for (let probe = 0; probe < 20 && ids.length > 0; probe += 1) {
    const current = rng.pick(ids);
    const direction = rng.pick(['left', 'right', 'up', 'down']);
    const boundary = rng.pick(['stop', 'wrap-axis']);
    const maxScan = rng.int(0, Math.max(rows, columns) + 2);
    const options = { eligible: (id) => eligible.has(id), maxScan };
    assert.deepEqual(
      optimized.move(current, direction, boundary, options),
      reference.move(current, direction, boundary, options),
    );
  }
  for (const id of ids) assert.deepEqual(optimized.positionOf(id), reference.positionOf(id));
}

function verifyTree(rng, iteration) {
  const size = rng.int(0, 80);
  const nodes = [];
  for (let node = 0; node < size; node += 1) {
    const id = `t${iteration}-${node}`;
    const parentId = node === 0 || rng.next() < 0.25
      ? null
      : `t${iteration}-${rng.int(0, node)}`;
    nodes.push({ id, parentId });
  }
  // Reorder siblings while preserving each parent before children.
  const children = new Map([[null, []]]);
  for (const node of nodes) children.set(node.id, []);
  for (const node of nodes) children.get(node.parentId).push(node.id);
  for (const [key, values] of children) children.set(key, rng.shuffle(values));
  const ordered = [];
  const visit = (id) => {
    ordered.push(nodes.find((node) => node.id === id));
    for (const child of children.get(id)) visit(child);
  };
  for (const root of children.get(null)) visit(root);
  const optimized = unwrap(createTree(ordered));
  const reference = new ReferenceTree(ordered);
  assert.deepEqual(optimized.roots.ids, reference.roots.ids);
  assert.deepEqual(optimized.preorder().ids, reference.preorder().ids);
  assert.deepEqual(optimized.postorder().ids, reference.postorder().ids);
  const ids = optimized.preorder().ids;
  for (const id of ids) {
    assert.equal(optimized.parentOf(id), reference.parentOf(id));
    assert.deepEqual(optimized.childrenOf(id).ids, reference.childrenOf(id).ids);
    assert.equal(optimized.depthOf(id), reference.depthOf(id));
  }
  for (let probe = 0; probe < 10; probe += 1) {
    const requested = ids.filter(() => rng.bool());
    const optimizedExpansion = optimized.normalizeExpansion(requested);
    const referenceExpansion = reference.normalizeExpansion(requested);
    assert.deepEqual(optimizedExpansion.ids, referenceExpansion.ids);
    assert.deepEqual(optimized.visible(optimizedExpansion).ids, reference.visible(referenceExpansion).ids);
  }
}

function verifyCursor(rng, iteration) {
  const size = rng.int(0, 80);
  const ids = rng.shuffle(Array.from({ length: size }, (_, index) => `c${iteration}-${index}`));
  const domain = unwrap(createSequence(ids));
  const current = rng.pick([null, ...ids, `missing-${iteration}`]);
  const state = createCursorState(current);
  for (const fallback of ['none', 'first', 'last']) {
    assert.deepEqual(
      reconcileCursor(state, domain, fallback),
      reconcileReferenceCursor(state, domain, fallback),
    );
  }
}

function verifySelection(rng, iteration) {
  const size = rng.int(0, 80);
  const ids = rng.shuffle(Array.from({ length: size }, (_, index) => `l${iteration}-${index}`));
  const missing = `missing-${iteration}`;
  const domain = unwrap(createSequence(ids));
  const previousDomain = unwrap(createSequence([...ids, missing]));
  const mode = rng.bool() ? 'single' : 'multiple';
  const selected = mode === 'single'
    ? (rng.bool() ? [] : [rng.pick([...ids, missing])])
    : [...ids, missing].filter(() => rng.bool());
  const anchor = rng.pick([null, ...ids, missing]);
  const optimizedState = unwrap(
    createSelectionState(previousDomain, mode, { selected, anchor }),
  );
  const referenceState = new ReferenceSelectionState(selected, anchor);
  const optimized = unwrap(reconcileSelection(optimizedState, domain, mode));
  const reference = reconcileReferenceSelection(referenceState, domain, mode);
  assert.deepEqual(selectionObservation(optimized), selectionObservation(reference));
  assert.deepEqual(
    selectionObservation(clearSelection(optimized)),
    selectionObservation(referenceClearSelection(reference)),
  );

  if (ids.length === 0) return;
  const id = rng.pick(ids);
  assert.deepEqual(
    selectionObservation(selectOne(optimized, id, domain)),
    selectionObservation(referenceSelectOne(reference, id, domain)),
  );
  assert.deepEqual(
    selectionObservation(toggleMultipleSelection(optimized, id, domain)),
    selectionObservation(referenceToggleMultipleSelection(reference, id, domain)),
  );
  const extent = rng.pick(ids);
  const additive = rng.bool();
  assert.deepEqual(
    selectionObservation(selectInterval(optimized, id, extent, domain, additive)),
    selectionObservation(referenceSelectInterval(reference, id, extent, domain, additive)),
  );
}

function selectionObservation(state) {
  return { selected: state.selected, anchor: state.anchor };
}

function decimal(integer, scale) {
  const negative = integer < 0;
  const digits = Math.abs(integer).toString().padStart(scale + 1, '0');
  if (scale === 0) return `${negative ? '-' : ''}${digits}`;
  const split = digits.length - scale;
  return `${negative ? '-' : ''}${digits.slice(0, split)}.${digits.slice(split)}`;
}

import assert from 'node:assert/strict';
import { createGrid } from '../packages/primitives/.verification-dist/grid.js';
import { createRange } from '../packages/primitives/.verification-dist/range.js';
import { createSequence } from '../packages/primitives/.verification-dist/sequence.js';
import { createTree } from '../packages/primitives/.verification-dist/tree.js';
import { createCursorState, reconcileCursor } from '../packages/primitives/.verification-dist/internal/cursor.js';
import { reconcileReferenceCursor } from '../packages/primitives/.verification-dist/internal/reference/cursor.js';
import { ReferenceGrid } from '../packages/primitives/.verification-dist/internal/reference/grid.js';
import { ReferenceRange } from '../packages/primitives/.verification-dist/internal/reference/range.js';
import { ReferenceSequence } from '../packages/primitives/.verification-dist/internal/reference/sequence.js';
import { ReferenceTree } from '../packages/primitives/.verification-dist/internal/reference/tree.js';
import { createRng, deepNormalize, unwrap } from '../packages/primitives/tests/support.mjs';

const seed = 0x5ec71e;
const iterations = 2_000;
const rng = createRng(seed);
const counts = {
  sequence: { models: 0, observations: 0, movements: 0, projections: 0, invalidConstructions: 0 },
  range: { models: 0, valueObservations: 0, tickObservations: 0, ratioObservations: 0, snapObservations: 0, invalidConstructions: 0 },
  grid: { models: 0, cellObservations: 0, positionObservations: 0, projectionObservations: 0, movements: 0, invalidConstructions: 0 },
  tree: { models: 0, nodeObservations: 0, expansionObservations: 0, invalidConstructions: 0 },
  cursor: { models: 0, reconciliations: 0 },
};

for (let iteration = 0; iteration < iterations; iteration += 1) {
  const size = rng.int(0, 80);
  const ids = rng.shuffle(Array.from({ length: size }, (_, index) => `s${iteration}-${index}`));
  const optimized = unwrap(createSequence(ids));
  const reference = new ReferenceSequence(ids);
  assert.deepEqual(optimized.ids, reference.ids);
  counts.sequence.models += 1;
  for (let index = -1; index <= size; index += 1) {
    assert.equal(optimized.at(index), reference.at(index));
    counts.sequence.observations += 1;
  }
  for (const id of [...ids, `missing-${iteration}`]) {
    assert.equal(optimized.indexOf(id), reference.indexOf(id));
    assert.equal(optimized.contains(id), reference.contains(id));
    counts.sequence.observations += 2;
  }
  const eligible = new Set(ids.filter(() => rng.bool()));
  for (let probe = 0; probe < 12 && ids.length > 0; probe += 1) {
    const current = rng.pick(ids);
    const direction = rng.pick([-1, 1]);
    const boundary = rng.pick(['stop', 'wrap']);
    const maxScan = rng.int(0, size + 2);
    const options = { eligible: (id) => eligible.has(id), maxScan };
    assert.deepEqual(optimized.move(current, direction, boundary, options), reference.move(current, direction, boundary, options));
    counts.sequence.movements += 1;
  }
  for (let modulo = 2; modulo <= 5; modulo += 1) {
    const predicate = (_, index) => index % modulo !== 1;
    assert.deepEqual(optimized.project(predicate).ids, reference.project(predicate).ids);
    counts.sequence.projections += 1;
  }
}
for (const result of [
  createSequence(['a', 'a']),
  createSequence(['']),
  createSequence(['\ud800']),
  createSequence(['a', 'b'], { maxItems: 1 }),
]) {
  assert.equal(result.ok, false);
  counts.sequence.invalidConstructions += 1;
}

for (let iteration = 0; iteration < iterations; iteration += 1) {
  const origin = decimal(rng.int(-200, 201), rng.int(0, 3));
  const step = decimal(rng.int(1, 51), rng.int(0, 3));
  const count = rng.int(0, 40);
  const optimized = unwrap(createRange({ origin, step, count }));
  const reference = new ReferenceRange(origin, step, count);
  counts.range.models += 1;
  const sampledTicks = new Set([0, count]);
  while (sampledTicks.size < Math.min(12, count + 1)) sampledTicks.add(rng.int(0, count + 1));
  for (const tick of sampledTicks) {
    const value = optimized.valueAt(tick);
    assert.equal(value, reference.valueAt(tick));
    assert.equal(optimized.tickOf(value), reference.tickOf(value));
    counts.range.valueObservations += 1;
    counts.range.tickObservations += 1;
    for (const tie of ['lower', 'upper', 'even-tick']) {
      const ratio = optimized.ratioOfTick(tick);
      assert.deepEqual(deepNormalize(ratio), deepNormalize(reference.ratioOfTick(tick)));
      assert.equal(optimized.tickFromRatio(ratio, tie), reference.tickFromRatio(ratio, tie));
      counts.range.ratioObservations += 1;
    }
  }
  for (let probe = 0; probe < 12; probe += 1) {
    const sample = decimal(rng.int(-500, 501), rng.int(0, 3));
    assert.equal(optimized.clamp(sample), reference.clamp(sample));
    for (const tie of ['lower', 'upper', 'even-tick']) {
      assert.equal(optimized.snap(sample, tie), reference.snap(sample, tie));
      counts.range.snapObservations += 1;
    }
  }
}
for (const result of [
  createRange({ origin: '0', step: '0', count: 1 }),
  createRange({ origin: 'x', step: '1', count: 1 }),
  createRange({ origin: '0', step: '1', count: -1 }),
  createRange({ origin: '0', step: '1', count: 2, maxCount: 1 }),
]) {
  assert.equal(result.ok, false);
  counts.range.invalidConstructions += 1;
}

for (let iteration = 0; iteration < iterations; iteration += 1) {
  const rows = rng.int(0, 12);
  const columns = rng.int(0, 12);
  const cells = [];
  const input = Array.from({ length: rows }, () => []);
  let next = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const id = rng.next() < 0.35 ? `g${iteration}-${next++}` : null;
      cells.push(id);
      input[row].push(id);
    }
  }
  const optimized = unwrap(createGrid(input, { columnCount: columns }));
  const reference = new ReferenceGrid(rows, columns, cells);
  counts.grid.models += 1;
  for (let row = -1; row <= rows; row += 1) {
    for (let column = -1; column <= columns; column += 1) {
      assert.equal(optimized.cellAt(row, column), reference.cellAt(row, column));
      counts.grid.cellObservations += 1;
    }
    assert.deepEqual(optimized.row(row)?.ids ?? null, reference.row(row)?.ids ?? null);
    counts.grid.projectionObservations += 1;
  }
  for (let column = -1; column <= columns; column += 1) {
    assert.deepEqual(optimized.column(column)?.ids ?? null, reference.column(column)?.ids ?? null);
    counts.grid.projectionObservations += 1;
  }
  const ids = Array.from({ length: next }, (_, index) => `g${iteration}-${index}`);
  for (const id of ids) {
    assert.deepEqual(optimized.positionOf(id), reference.positionOf(id));
    counts.grid.positionObservations += 1;
  }
  const eligible = new Set(ids.filter(() => rng.bool()));
  for (let probe = 0; probe < 20 && ids.length > 0; probe += 1) {
    const current = rng.pick(ids);
    const direction = rng.pick(['left', 'right', 'up', 'down']);
    const boundary = rng.pick(['stop', 'wrap-axis']);
    const maxScan = rng.int(0, Math.max(rows, columns) + 2);
    const options = { eligible: (id) => eligible.has(id), maxScan };
    assert.deepEqual(optimized.move(current, direction, boundary, options), reference.move(current, direction, boundary, options));
    counts.grid.movements += 1;
  }
}
for (const result of [
  createGrid([['a'], ['a']]),
  createGrid([['']], {}),
  createGrid([['a', 'b']], { columnCount: 1 }),
  createGrid([['a']], { maxRows: 0 }),
]) {
  assert.equal(result.ok, false);
  counts.grid.invalidConstructions += 1;
}

for (let iteration = 0; iteration < iterations; iteration += 1) {
  const size = rng.int(0, 80);
  const initial = [];
  for (let node = 0; node < size; node += 1) {
    initial.push({
      id: `t${iteration}-${node}`,
      parentId: node === 0 || rng.next() < 0.25 ? null : `t${iteration}-${rng.int(0, node)}`,
    });
  }
  const children = new Map([[null, []]]);
  for (const node of initial) children.set(node.id, []);
  for (const node of initial) children.get(node.parentId).push(node.id);
  for (const [key, values] of children) children.set(key, rng.shuffle(values));
  const nodes = [];
  const visit = (id) => {
    nodes.push(initial.find((node) => node.id === id));
    for (const child of children.get(id)) visit(child);
  };
  for (const root of children.get(null)) visit(root);
  const optimized = unwrap(createTree(nodes));
  const reference = new ReferenceTree(nodes);
  counts.tree.models += 1;
  assert.deepEqual(optimized.roots.ids, reference.roots.ids);
  assert.deepEqual(optimized.preorder().ids, reference.preorder().ids);
  assert.deepEqual(optimized.postorder().ids, reference.postorder().ids);
  for (const id of optimized.preorder().ids) {
    assert.equal(optimized.parentOf(id), reference.parentOf(id));
    assert.deepEqual(optimized.childrenOf(id).ids, reference.childrenOf(id).ids);
    assert.equal(optimized.depthOf(id), reference.depthOf(id));
    assert.deepEqual(optimized.ancestorsOf(id), reference.ancestorsOf(id));
    counts.tree.nodeObservations += 4;
  }
  for (let probe = 0; probe < 10; probe += 1) {
    const requested = optimized.preorder().ids.filter(() => rng.bool());
    const leftExpansion = optimized.normalizeExpansion(requested);
    const rightExpansion = reference.normalizeExpansion(requested);
    assert.deepEqual(leftExpansion.ids, rightExpansion.ids);
    assert.deepEqual(optimized.visible(leftExpansion).ids, reference.visible(rightExpansion).ids);
    counts.tree.expansionObservations += 1;
  }
}
for (const result of [
  createTree([{ id: 'a', parentId: null }, { id: 'a', parentId: null }]),
  createTree([{ id: 'a', parentId: 'missing' }]),
  createTree([{ id: 'a', parentId: 'a' }]),
  createTree([{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }]),
]) {
  assert.equal(result.ok, false);
  counts.tree.invalidConstructions += 1;
}

const cursorRng = createRng(seed ^ 0xc0ffee);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const size = cursorRng.int(0, 80);
  const ids = cursorRng.shuffle(
    Array.from({ length: size }, (_, index) => `c${iteration}-${index}`),
  );
  const domain = unwrap(createSequence(ids));
  const current = cursorRng.pick([null, ...ids, `missing-${iteration}`]);
  const state = createCursorState(current);
  for (const fallback of ['none', 'first', 'last']) {
    assert.deepEqual(
      reconcileCursor(state, domain, fallback),
      reconcileReferenceCursor(state, domain, fallback),
    );
    counts.cursor.reconciliations += 1;
  }
  counts.cursor.models += 1;
}

process.stdout.write(`${JSON.stringify({ status: 'pass', seed, iterationsPerStructure: iterations, ...counts }, null, 2)}\n`);

function decimal(integer, scale) {
  const negative = integer < 0;
  const digits = Math.abs(integer).toString().padStart(scale + 1, '0');
  if (scale === 0) return `${negative ? '-' : ''}${digits}`;
  const split = digits.length - scale;
  return `${negative ? '-' : ''}${digits.slice(0, split)}.${digits.slice(split)}`;
}

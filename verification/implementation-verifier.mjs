import assert from 'node:assert/strict';
import { createGrid } from '../packages/primitives/.verification-dist/structures/grid.js';
import { createRange } from '../packages/primitives/.verification-dist/structures/range.js';
import { createSequence } from '../packages/primitives/.verification-dist/structures/sequence.js';
import { createTree } from '../packages/primitives/.verification-dist/structures/tree.js';
import { createCursorState, reconcileCursor } from '../packages/primitives/.verification-dist/internal/state/cursor.js';
import {
  createExpansionState,
  reconcileExpansion,
  setExpansionOpen,
  toggleExpansion,
} from '../packages/primitives/.verification-dist/internal/state/expansion.js';
import {
  createListboxState,
  stepListbox,
} from '../packages/primitives/.verification-dist/internal/composites/listbox.js';
import {
  clearSelection,
  createSelectionState,
  reconcileSelection,
  selectInterval,
  selectOne,
  toggleMultipleSelection,
} from '../packages/primitives/.verification-dist/internal/state/selection.js';
import {
  cancelTextComposition,
  commitTextComposition,
  createTextEditingState,
  replacePlainText,
  replaceTextState,
  startTextComposition,
  updateTextComposition,
} from '../packages/primitives/.verification-dist/internal/editing/text.js';
import { reconcileReferenceCursor } from '../packages/primitives/.verification-dist/internal/reference/state/cursor.js';
import {
  createReferenceExpansionState,
  reconcileReferenceExpansion,
  referenceSetExpansionOpen,
  referenceToggleExpansion,
} from '../packages/primitives/.verification-dist/internal/reference/state/expansion.js';
import {
  createReferenceListboxState,
  referenceStepListbox,
} from '../packages/primitives/.verification-dist/internal/reference/composites/listbox.js';
import {
  ReferenceSelectionState,
  reconcileReferenceSelection,
  referenceClearSelection,
  referenceSelectInterval,
  referenceSelectOne,
  referenceToggleMultipleSelection,
} from '../packages/primitives/.verification-dist/internal/reference/state/selection.js';
import {
  createReferenceTextEditingState,
  referenceCancelTextComposition,
  referenceCommitTextComposition,
  referenceReplacePlainText,
  referenceReplaceTextState,
  referenceStartTextComposition,
  referenceTextCodeUnitBoundaries,
  referenceUpdateTextComposition,
} from '../packages/primitives/.verification-dist/internal/reference/editing/text.js';
import { ReferenceGrid } from '../packages/primitives/.verification-dist/internal/reference/structures/grid.js';
import { ReferenceRange } from '../packages/primitives/.verification-dist/internal/reference/structures/range.js';
import { ReferenceSequence } from '../packages/primitives/.verification-dist/internal/reference/structures/sequence.js';
import { ReferenceTree } from '../packages/primitives/.verification-dist/internal/reference/structures/tree.js';
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
  selection: { models: 0, reconciliations: 0, operations: 0, invalidSnapshots: 0 },
  expansionState: { models: 0, reconciliations: 0, transitions: 0 },
  text: {
    models: 0,
    replacements: 0,
    stableTransitions: 0,
    compositionTransitions: 0,
    invalidTransitions: 0,
  },
  listbox: { models: 0, transitions: 0, accepted: 0, rejected: 0, commands: 0 },
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
      parentID: node === 0 || rng.next() < 0.25 ? null : `t${iteration}-${rng.int(0, node)}`,
    });
  }
  const children = new Map([[null, []]]);
  for (const node of initial) children.set(node.id, []);
  for (const node of initial) children.get(node.parentID).push(node.id);
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
  createTree([{ id: 'a', parentID: null }, { id: 'a', parentID: null }]),
  createTree([{ id: 'a', parentID: 'missing' }]),
  createTree([{ id: 'a', parentID: 'a' }]),
  createTree([{ id: 'a', parentID: 'b' }, { id: 'b', parentID: 'a' }]),
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

const selectionRng = createRng(seed ^ 0x5e1ec7);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const size = selectionRng.int(0, 80);
  const ids = selectionRng.shuffle(
    Array.from({ length: size }, (_, index) => `l${iteration}-${index}`),
  );
  const missing = `missing-${iteration}`;
  const domain = unwrap(createSequence(ids));
  const previousDomain = unwrap(createSequence([...ids, missing]));
  const mode = selectionRng.bool() ? 'single' : 'multiple';
  const selected = mode === 'single'
    ? (selectionRng.bool() ? [] : [selectionRng.pick([...ids, missing])])
    : [...ids, missing].filter(() => selectionRng.bool());
  const anchor = selectionRng.pick([null, ...ids, missing]);
  const optimizedState = unwrap(
    createSelectionState(previousDomain, mode, { selected, anchor }),
  );
  const referenceState = new ReferenceSelectionState(selected, anchor);
  const optimized = unwrap(reconcileSelection(optimizedState, domain, mode));
  const reference = reconcileReferenceSelection(referenceState, domain, mode);
  assert.deepEqual(selectionObservation(optimized), selectionObservation(reference));
  counts.selection.reconciliations += 1;

  assert.deepEqual(
    selectionObservation(clearSelection(optimized)),
    selectionObservation(referenceClearSelection(reference)),
  );
  counts.selection.operations += 1;

  if (ids.length > 0) {
    const id = selectionRng.pick(ids);
    const extent = selectionRng.pick(ids);
    const additive = selectionRng.bool();
    for (const [left, right] of [
      [selectOne(optimized, id, domain), referenceSelectOne(reference, id, domain)],
      [
        toggleMultipleSelection(optimized, id, domain),
        referenceToggleMultipleSelection(reference, id, domain),
      ],
      [
        selectInterval(optimized, id, extent, domain, additive),
        referenceSelectInterval(reference, id, extent, domain, additive),
      ],
    ]) {
      assert.deepEqual(selectionObservation(left), selectionObservation(right));
      counts.selection.operations += 1;
    }
  }

  if (ids.length > 1) {
    const invalid = createSelectionState(domain, 'single', { selected: ids.slice(0, 2) });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error.code, 'invalid-selection-cardinality');
    counts.selection.invalidSnapshots += 1;
  }
  counts.selection.models += 1;
}

const expansionRng = createRng(seed ^ 0xe7a0d);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const size = expansionRng.int(0, 80);
  const nodes = [];
  for (let node = 0; node < size; node += 1) {
    nodes.push({
      id: `e${iteration}-${node}`,
      parentID:
        node === 0 || expansionRng.next() < 0.25
          ? null
          : `e${iteration}-${expansionRng.int(0, node)}`,
    });
  }
  const tree = unwrap(createTree(nodes));
  const referenceTree = new ReferenceTree(nodes);
  const ids = tree.preorder().ids;
  const missing = `missing-${iteration}`;
  const requested = [...ids.filter(() => expansionRng.bool()), missing];
  const optimized = createExpansionState(tree, requested);
  const reference = createReferenceExpansionState(referenceTree, requested);
  assert.deepEqual(optimized.ids, reference.ids);
  assert.deepEqual(
    reconcileExpansion(optimized, tree).ids,
    reconcileReferenceExpansion(reference, referenceTree).ids,
  );
  counts.expansionState.reconciliations += 1;

  assert.deepEqual(
    toggleExpansion(optimized, missing, tree).ids,
    referenceToggleExpansion(reference, missing, referenceTree).ids,
  );
  counts.expansionState.transitions += 1;

  if (ids.length > 0) {
    const id = expansionRng.pick(ids);
    const open = expansionRng.bool();
    assert.deepEqual(
      setExpansionOpen(optimized, id, open, tree).ids,
      referenceSetExpansionOpen(reference, id, open, referenceTree).ids,
    );
    assert.deepEqual(
      toggleExpansion(optimized, id, tree).ids,
      referenceToggleExpansion(reference, id, referenceTree).ids,
    );
    counts.expansionState.transitions += 2;
  }
  counts.expansionState.models += 1;
}

const textRng = createRng(seed ^ 0x7e87);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const text = randomText(textRng, 12);
  const replacement = randomText(textRng, 4);
  const boundaries = referenceTextCodeUnitBoundaries(text);
  const startCodeUnitOffset = textRng.pick(boundaries);
  const endCodeUnitOffset = textRng.pick(
    boundaries.filter((offset) => offset >= startCodeUnitOffset),
  );
  assert.equal(
    unwrap(replacePlainText(text, startCodeUnitOffset, endCodeUnitOffset, replacement)),
    referenceReplacePlainText(text, startCodeUnitOffset, endCodeUnitOffset, replacement),
  );
  counts.text.replacements += 1;

  const initialSelection = {
    anchorCodeUnitOffset: textRng.pick(boundaries),
    focusCodeUnitOffset: textRng.pick(boundaries),
  };
  const optimized = unwrap(createTextEditingState(text, initialSelection));
  const reference = createReferenceTextEditingState(text, initialSelection);
  const projected = referenceReplacePlainText(
    text,
    startCodeUnitOffset,
    endCodeUnitOffset,
    replacement,
  );
  const projectedBoundaries = referenceTextCodeUnitBoundaries(projected);
  const projectedSelection = {
    anchorCodeUnitOffset: textRng.pick(projectedBoundaries),
    focusCodeUnitOffset: textRng.pick(projectedBoundaries),
  };
  assert.deepEqual(
    textObservation(
      unwrap(
        replaceTextState(
          optimized,
          startCodeUnitOffset,
          endCodeUnitOffset,
          replacement,
          projectedSelection,
        ),
      ),
    ),
    textObservation(
      referenceReplaceTextState(
        reference,
        startCodeUnitOffset,
        endCodeUnitOffset,
        replacement,
        projectedSelection,
      ),
    ),
  );
  counts.text.stableTransitions += 1;

  const started = unwrap(
    startTextComposition(
      optimized,
      startCodeUnitOffset,
      endCodeUnitOffset,
      replacement,
      projectedSelection,
    ),
  );
  const referenceStarted = referenceStartTextComposition(
    reference,
    startCodeUnitOffset,
    endCodeUnitOffset,
    replacement,
    projectedSelection,
  );
  assert.deepEqual(textObservation(started), textObservation(referenceStarted));
  counts.text.compositionTransitions += 1;

  const second = randomText(textRng, 4);
  const secondProjected = referenceReplacePlainText(
    text,
    startCodeUnitOffset,
    endCodeUnitOffset,
    second,
  );
  const secondBoundaries = referenceTextCodeUnitBoundaries(secondProjected);
  const secondSelection = {
    anchorCodeUnitOffset: textRng.pick(secondBoundaries),
    focusCodeUnitOffset: textRng.pick(secondBoundaries),
  };
  const updated = unwrap(updateTextComposition(started, second, secondSelection));
  const referenceUpdated = referenceUpdateTextComposition(
    referenceStarted,
    second,
    secondSelection,
  );
  assert.deepEqual(textObservation(updated), textObservation(referenceUpdated));
  counts.text.compositionTransitions += 1;
  assert.deepEqual(
    textObservation(unwrap(commitTextComposition(updated))),
    textObservation(referenceCommitTextComposition(referenceUpdated)),
  );
  counts.text.compositionTransitions += 1;
  assert.deepEqual(
    textObservation(unwrap(cancelTextComposition(updated))),
    textObservation(referenceCancelTextComposition(referenceUpdated)),
  );
  counts.text.compositionTransitions += 1;

  const invalid = updateTextComposition(optimized, second, secondSelection);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'composition-inactive');
  counts.text.invalidTransitions += 1;
  counts.text.models += 1;
}

const listboxRng = createRng(seed ^ 0x1157b0);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const ids = listboxRng.shuffle(
    Array.from({ length: listboxRng.int(0, 40) }, (_, index) => `b${iteration}-${index}`),
  );
  const domain = unwrap(createSequence(ids));
  const eligible = new Set(ids.filter(() => listboxRng.bool()));
  const input = {
    current: listboxRng.pick([null, ...ids]),
    selected: ids.filter(() => listboxRng.bool()),
    anchor: listboxRng.pick([null, ...ids]),
  };
  let optimized = unwrap(createListboxState(domain, input));
  let reference = createReferenceListboxState(domain, input);
  const policies = {
    eligible: (id) => eligible.has(id),
    selectionFollowsFocus: listboxRng.bool(),
    boundary: listboxRng.pick(['stop', 'wrap']),
    maxScan: listboxRng.int(0, ids.length + 1),
  };
  for (let step = 0; step < 10; step += 1) {
    const event = listboxRng.pick(['next', 'previous', 'toggle', 'activate', 'clear']);
    const left = stepListbox(domain, optimized, event, policies);
    const right = referenceStepListbox(domain, reference, event, policies);
    assert.deepEqual(listboxResultObservation(left), referenceListboxResultObservation(right));
    counts.listbox.transitions += 1;
    if (left.ok && right.ok) {
      optimized = left.value.state;
      reference = right.value.state;
      counts.listbox.accepted += 1;
      counts.listbox.commands += left.value.commands.length;
    } else {
      counts.listbox.rejected += 1;
    }
  }
  counts.listbox.models += 1;
}

process.stdout.write(`${JSON.stringify({ status: 'pass', seed, iterationsPerStructure: iterations, ...counts }, null, 2)}\n`);

function selectionObservation(state) {
  return { selected: state.selected, anchor: state.anchor };
}

function listboxResultObservation(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        selected: result.value.state.selection.selected,
        anchor: result.value.state.selection.anchor,
        commands: result.value.commands,
      }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function referenceListboxResultObservation(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        selected: result.value.state.selection.selected,
        anchor: result.value.state.selection.anchor,
        commands: result.value.commands,
      }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}

function textObservation(state) {
  return {
    text: state.snapshot.text,
    anchor: state.snapshot.selection.anchorCodeUnitOffset,
    focus: state.snapshot.selection.focusCodeUnitOffset,
    composition: state.composition === null
      ? null
      : {
          baselineText: state.composition.baseline.text,
          baselineAnchor: state.composition.baseline.selection.anchorCodeUnitOffset,
          baselineFocus: state.composition.baseline.selection.focusCodeUnitOffset,
          start: state.composition.startCodeUnitOffset,
          end: state.composition.endCodeUnitOffset,
          composingText: state.composition.composingText,
        },
  };
}

function randomText(rng, maxLength) {
  const scalars = ['a', '가', '😀', '\u0301', '\u200d', '🇰', '🇷'];
  return Array.from({ length: rng.int(0, maxLength + 1) }, () => rng.pick(scalars)).join('');
}

function decimal(integer, scale) {
  const negative = integer < 0;
  const digits = Math.abs(integer).toString().padStart(scale + 1, '0');
  if (scale === 0) return `${negative ? '-' : ''}${digits}`;
  const split = digits.length - scale;
  return `${negative ? '-' : ''}${digits.slice(0, split)}.${digits.slice(split)}`;
}

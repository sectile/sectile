import assert from 'node:assert/strict';
import { createGrid, tryCreateGrid } from '../.verification-dist/structures/grid.js';
import { createRange, tryCreateRange } from '../.verification-dist/structures/range.js';
import { createSequence, tryCreateSequence } from '../.verification-dist/structures/sequence.js';
import { createTree, tryCreateTree } from '../.verification-dist/structures/tree.js';
import { createCursorState, reconcileCursor } from '../.verification-dist/internal/state/cursor.js';
import {
  createExpansionState,
  reconcileExpansion,
  setExpansionOpen,
  toggleExpansion,
} from '../.verification-dist/internal/state/expansion.js';
import {
  createListboxState,
  applyListboxEvent,
} from '../.verification-dist/internal/composites/listbox.js';
import {
  createLinearChoiceState,
  applyLinearChoiceEvent,
} from '../.verification-dist/internal/composites/linear-choice.js';
import {
  createLinearActionState,
  applyLinearActionEvent,
} from '../.verification-dist/internal/composites/linear-action.js';
import {
  createCalendarState,
  applyCalendarEvent,
} from '../.verification-dist/internal/composites/calendar.js';
import {
  acceptComboboxCandidate,
  applyComboboxEvent,
  createComboboxState,
} from '../.verification-dist/internal/composites/combobox.js';
import {
  createSliderState,
  applySliderEvent,
} from '../.verification-dist/internal/composites/slider.js';
import {
  createTreeViewState,
  applyTreeViewEvent,
} from '../.verification-dist/internal/composites/tree-view.js';
import {
  createRevisionSnapshot,
  applyRevisionedEvent,
} from '../.verification-dist/internal/runtime/revision.js';
import {
  clearSelection,
  createSelectionState,
  reconcileSelection,
  selectInterval,
  selectOne,
  toggleMultipleSelection,
} from '../.verification-dist/internal/state/selection.js';
import {
  cancelTextComposition,
  commitTextComposition,
  createTextEditingState,
  replacePlainText,
  replaceTextState,
  startTextComposition,
  updateTextComposition,
} from '../.verification-dist/internal/editing/text.js';
import { reconcileReferenceCursor } from '../.verification-dist/internal/reference/state/cursor.js';
import {
  createReferenceExpansionState,
  reconcileReferenceExpansion,
  referenceSetExpansionOpen,
  referenceToggleExpansion,
} from '../.verification-dist/internal/reference/state/expansion.js';
import {
  createReferenceListboxState,
  applyReferenceListboxEvent,
} from '../.verification-dist/internal/reference/composites/listbox.js';
import {
  createReferenceLinearChoiceState,
  applyReferenceLinearChoiceEvent,
} from '../.verification-dist/internal/reference/composites/linear-choice.js';
import {
  createReferenceLinearActionState,
  applyReferenceLinearActionEvent,
} from '../.verification-dist/internal/reference/composites/linear-action.js';
import {
  createReferenceCalendarState,
  applyReferenceCalendarEvent,
} from '../.verification-dist/internal/reference/composites/calendar.js';
import {
  createReferenceComboboxState,
  referenceApplyComboboxEvent,
  referenceAcceptCombobox,
} from '../.verification-dist/internal/reference/composites/combobox.js';
import {
  createReferenceSliderState,
  applyReferenceSliderEvent,
} from '../.verification-dist/internal/reference/composites/slider.js';
import {
  createReferenceTreeViewState,
  applyReferenceTreeViewEvent,
} from '../.verification-dist/internal/reference/composites/tree-view.js';
import {
  ReferenceSelectionState,
  reconcileReferenceSelection,
  referenceClearSelection,
  referenceSelectInterval,
  referenceSelectOne,
  referenceToggleMultipleSelection,
} from '../.verification-dist/internal/reference/state/selection.js';
import {
  createReferenceTextEditingState,
  referenceCancelTextComposition,
  referenceCommitTextComposition,
  referenceReplacePlainText,
  referenceReplaceTextState,
  referenceStartTextComposition,
  referenceTextCodeUnitBoundaries,
  referenceUpdateTextComposition,
} from '../.verification-dist/internal/reference/editing/text.js';
import { ReferenceGrid } from '../.verification-dist/internal/reference/structures/grid.js';
import { ReferenceRange } from '../.verification-dist/internal/reference/structures/range.js';
import { ReferenceSequence } from '../.verification-dist/internal/reference/structures/sequence.js';
import { ReferenceTree } from '../.verification-dist/internal/reference/structures/tree.js';
import {
  calendarResultObservation,
  comboboxResultObservation,
  createRng,
  decimal,
  deepNormalize,
  listboxResultObservation,
  powerset,
  randomText,
  referenceCalendarResultObservation,
  referenceComboboxResultObservation,
  referenceListboxResultObservation,
  referenceSliderResultObservation,
  referenceTreeViewResultObservation,
  selectionObservation,
  sliderResultObservation,
  textObservation,
  treeViewResultObservation,
  unwrap,
} from '../tests/support.mjs';

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
  linearChoice: { models: 0, transitions: 0, accepted: 0, rejected: 0, commands: 0 },
  linearAction: { models: 0, transitions: 0, accepted: 0, rejected: 0, commands: 0 },
  slider: { models: 0, transitions: 0, commands: 0 },
  calendar: { models: 0, transitions: 0, accepted: 0, rejected: 0, commands: 0 },
  treeView: { models: 0, transitions: 0, accepted: 0, rejected: 0, commands: 0 },
  combobox: { models: 0, accepted: 0, rejected: 0, commands: 0 },
  revision: { cases: 0 },
};

for (let iteration = 0; iteration < iterations; iteration += 1) {
  const size = rng.int(0, 80);
  const ids = rng.shuffle(Array.from({ length: size }, (_, index) => `s${iteration}-${index}`));
  const optimized = createSequence(ids);
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
  tryCreateSequence(['a', 'a']),
  tryCreateSequence(['']),
  tryCreateSequence(['\ud800']),
  tryCreateSequence(['a', 'b'], { maxItems: 1 }),
]) {
  assert.equal(result.ok, false);
  counts.sequence.invalidConstructions += 1;
}

for (let iteration = 0; iteration < iterations; iteration += 1) {
  const origin = decimal(rng.int(-200, 201), rng.int(0, 3));
  const step = decimal(rng.int(1, 51), rng.int(0, 3));
  const count = rng.int(0, 40);
  const optimized = createRange({ origin, step, count });
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
  tryCreateRange({ origin: '0', step: '0', count: 1 }),
  tryCreateRange({ origin: 'x', step: '1', count: 1 }),
  tryCreateRange({ origin: '0', step: '1', count: -1 }),
  tryCreateRange({ origin: '0', step: '1', count: 2, maxCount: 1 }),
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
  const optimized = createGrid(input, { columnCount: columns });
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
  tryCreateGrid([['a'], ['a']]),
  tryCreateGrid([['']], {}),
  tryCreateGrid([['a', 'b']], { columnCount: 1 }),
  tryCreateGrid([['a']], { maxRows: 0 }),
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
  const optimized = createTree(nodes);
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
  tryCreateTree([{ id: 'a', parentID: null }, { id: 'a', parentID: null }]),
  tryCreateTree([{ id: 'a', parentID: 'missing' }]),
  tryCreateTree([{ id: 'a', parentID: 'a' }]),
  tryCreateTree([{ id: 'a', parentID: 'b' }, { id: 'b', parentID: 'a' }]),
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
  const domain = createSequence(ids);
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
  const domain = createSequence(ids);
  const previousDomain = createSequence([...ids, missing]);
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
  const tree = createTree(nodes);
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
  const optimized = createTextEditingState(text, initialSelection);
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
  const domain = createSequence(ids);
  const eligible = new Set(ids.filter(() => listboxRng.bool()));
  const input = {
    current: listboxRng.pick([null, ...ids]),
    selected: ids.filter(() => listboxRng.bool()),
    anchor: listboxRng.pick([null, ...ids]),
  };
  let optimized = createListboxState(domain, input, 'multiple');
  let reference = createReferenceListboxState(domain, input, 'multiple');
  const policies = {
    eligible: (id) => eligible.has(id),
    selectionFollowsFocus: listboxRng.bool(),
    boundary: listboxRng.pick(['stop', 'wrap']),
    maxScan: listboxRng.int(0, ids.length + 1),
    selectionMode: 'multiple',
  };
  for (let step = 0; step < 10; step += 1) {
    const target = listboxRng.pick([...ids, `missing-${iteration}`]);
    const event = listboxRng.pick([
      'next',
      'previous',
      'toggle',
      'activate',
      'clear',
      { type: 'focus', id: target },
      { type: 'toggle', id: target },
      { type: 'activate', id: target },
    ]);
    const left = applyListboxEvent(domain, optimized, event, policies);
    const right = applyReferenceListboxEvent(domain, reference, event, policies);
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

const linearChoiceRng = createRng(seed ^ 0x1c401ce);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const ids = Array.from(
    { length: linearChoiceRng.int(0, 40) },
    (_, index) => `lc${iteration}-${index}`,
  );
  const domain = createSequence(ids);
  const selected = ids.length > 0 && linearChoiceRng.bool()
    ? [linearChoiceRng.pick(ids)]
    : [];
  const input = { selected, current: linearChoiceRng.pick([null, ...ids]) };
  let optimized = unwrap(createLinearChoiceState(domain, input));
  let reference = createReferenceLinearChoiceState(domain, input);
  const eligible = new Set(ids.filter(() => linearChoiceRng.bool()));
  const policies = {
    eligible: (id) => eligible.has(id),
    selectionFollowsFocus: linearChoiceRng.bool(),
    boundary: linearChoiceRng.pick(['stop', 'wrap']),
    maxScan: linearChoiceRng.int(0, ids.length + 1),
  };
  for (let step = 0; step < 10; step += 1) {
    const target = linearChoiceRng.pick([...ids, `missing-${iteration}`]);
    const event = linearChoiceRng.pick([
      'next', 'previous', 'first', 'last', 'select', 'activate',
      { type: 'focus', id: target },
      { type: 'select', id: target },
      { type: 'activate', id: target },
    ]);
    const left = applyLinearChoiceEvent(domain, optimized, event, policies);
    const right = applyReferenceLinearChoiceEvent(domain, reference, event, policies);
    assert.deepEqual(linearChoiceObservation(left), referenceLinearChoiceObservation(right));
    counts.linearChoice.transitions += 1;
    if (left.ok && right.ok) {
      optimized = left.value.state;
      reference = right.value.state;
      counts.linearChoice.accepted += 1;
      counts.linearChoice.commands += left.value.commands.length;
    } else counts.linearChoice.rejected += 1;
  }
  counts.linearChoice.models += 1;
}

const linearActionRng = createRng(seed ^ 0x1ac710);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const ids = Array.from(
    { length: linearActionRng.int(0, 40) },
    (_, index) => `la${iteration}-${index}`,
  );
  const domain = createSequence(ids);
  const input = { current: linearActionRng.pick([null, ...ids]) };
  let optimized = createLinearActionState(domain, input);
  let reference = createReferenceLinearActionState(domain, input);
  const eligible = new Set(ids.filter(() => linearActionRng.bool()));
  const policies = {
    eligible: (id) => eligible.has(id),
    boundary: linearActionRng.pick(['stop', 'wrap']),
    maxScan: linearActionRng.int(0, ids.length + 1),
  };
  for (let step = 0; step < 10; step += 1) {
    const target = linearActionRng.pick([...ids, `missing-${iteration}`]);
    const event = linearActionRng.pick([
      'next', 'previous', 'first', 'last', 'invoke',
      { type: 'focus', id: target }, { type: 'invoke', id: target },
    ]);
    const left = applyLinearActionEvent(domain, optimized, event, policies);
    const right = applyReferenceLinearActionEvent(domain, reference, event, policies);
    assert.deepEqual(linearActionObservation(left), referenceLinearActionObservation(right));
    counts.linearAction.transitions += 1;
    if (left.ok && right.ok) {
      optimized = left.value.state;
      reference = right.value.state;
      counts.linearAction.accepted += 1;
      counts.linearAction.commands += left.value.commands.length;
    } else counts.linearAction.rejected += 1;
  }
  counts.linearAction.models += 1;
}

const sliderRng = createRng(seed ^ 0x511de);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const count = sliderRng.int(0, 81);
  const range = createRange({ origin: '-2', step: '0.5', count });
  const initial = sliderRng.int(0, count + 1);
  let optimized = createSliderState(range, initial);
  let reference = createReferenceSliderState(range, initial);
  for (let step = 0; step < 10; step += 1) {
    const target = sliderRng.int(-1, count + 2);
    const event = sliderRng.pick([
      'increment',
      'decrement',
      'page-up',
      'page-down',
      'home',
      'end',
      { type: 'set-tick', tick: target },
    ]);
    const page = sliderRng.int(1, count + 4);
    const left = applySliderEvent(range, optimized, event, page);
    const right = applyReferenceSliderEvent(range, reference, event, page);
    assert.deepEqual(sliderResultObservation(left), referenceSliderResultObservation(right));
    counts.slider.transitions += 1;
    if (left.ok && right.ok) {
      optimized = left.value.state;
      reference = right.value.state;
      counts.slider.commands += left.value.commands.length;
    }
  }
  counts.slider.models += 1;
}

const calendarRng = createRng(seed ^ 0xca1e);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const rowCount = calendarRng.int(0, 8);
  const columnCount = calendarRng.int(0, 8);
  const ids = [];
  const rows = Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: columnCount }, (_, column) => {
      if (!calendarRng.bool()) return null;
      const id = `c${iteration}-${row}-${column}`;
      ids.push(id);
      return id;
    }));
  const grid = createGrid(rows, { columnCount });
  const current = calendarRng.pick([null, ...ids]);
  const selected = ids.length > 0 && calendarRng.bool() ? [calendarRng.pick(ids)] : [];
  const input = { current, selected, anchor: selected[0] ?? null };
  let optimized = createCalendarState(grid, input);
  let reference = createReferenceCalendarState(grid, input);
  const eligible = new Set(ids.filter(() => calendarRng.bool()));
  const policies = {
    eligible: (id) => eligible.has(id),
    boundary: calendarRng.pick(['stop', 'wrap-axis']),
    maxScan: calendarRng.int(0, Math.max(rowCount, columnCount) + 2),
  };
  for (let step = 0; step < 10; step += 1) {
    const target = calendarRng.pick([...ids, `missing-${iteration}`]);
    const event = calendarRng.pick([
      'left',
      'right',
      'up',
      'down',
      'select',
      'previous-page',
      'next-page',
      { type: 'select', id: target },
    ]);
    const left = applyCalendarEvent(grid, optimized, event, policies);
    const right = applyReferenceCalendarEvent(grid, reference, event, policies);
    assert.deepEqual(calendarResultObservation(left), referenceCalendarResultObservation(right));
    counts.calendar.transitions += 1;
    if (left.ok && right.ok) {
      optimized = left.value.state;
      reference = right.value.state;
      counts.calendar.accepted += 1;
      counts.calendar.commands += left.value.commands.length;
    } else {
      counts.calendar.rejected += 1;
    }
  }
  counts.calendar.models += 1;
}

const treeViewRng = createRng(seed ^ 0x7ee);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const size = treeViewRng.int(0, 40);
  const nodes = [];
  for (let node = 0; node < size; node += 1) {
    nodes.push({
      id: `v${iteration}-${node}`,
      parentID:
        node === 0 || treeViewRng.next() < 0.25
          ? null
          : `v${iteration}-${treeViewRng.int(0, node)}`,
    });
  }
  const tree = createTree(nodes);
  const ids = tree.preorder().ids;
  const branches = ids.filter((id) => tree.childrenOf(id).size > 0);
  const expanded = branches.filter(() => treeViewRng.bool());
  const visible = tree.visible(expanded).ids;
  const input = {
    expanded,
    current: treeViewRng.pick([null, ...visible]),
    selected: ids.filter(() => treeViewRng.bool()),
    anchor: treeViewRng.pick([null, ...ids]),
  };
  let optimized = createTreeViewState(tree, input);
  let reference = createReferenceTreeViewState(tree, input);
  for (let step = 0; step < 10; step += 1) {
    const target = treeViewRng.pick([...ids, `missing-${iteration}`]);
    const branch = treeViewRng.pick([...branches, `missing-${iteration}`]);
    const event = treeViewRng.pick([
      'next',
      'previous',
      'right',
      'left',
      'toggle-select',
      { type: 'focus', id: target },
      { type: 'toggle-select', id: target },
      { type: 'set-expanded', id: branch, open: treeViewRng.bool() },
    ]);
    const left = applyTreeViewEvent(tree, optimized, event);
    const right = applyReferenceTreeViewEvent(tree, reference, event);
    assert.deepEqual(treeViewResultObservation(left), referenceTreeViewResultObservation(right));
    counts.treeView.transitions += 1;
    if (left.ok && right.ok) {
      optimized = left.value.state;
      reference = right.value.state;
      counts.treeView.accepted += 1;
      counts.treeView.commands += left.value.commands.length;
    } else {
      counts.treeView.rejected += 1;
    }
  }
  counts.treeView.models += 1;
}

const comboboxRng = createRng(seed ^ 0xc0b0);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const ids = Array.from(
    { length: comboboxRng.int(0, 40) },
    (_, index) => `o${iteration}-${index}`,
  );
  const domain = createSequence(ids);
  const labels = new Map(ids.map((id) => [id, randomText(comboboxRng, 6)]));
  let text = createTextEditingState(randomText(comboboxRng, 6));
  if (comboboxRng.bool()) {
    const offset = text.snapshot.text.length;
    text = unwrap(startTextComposition(
      text,
      offset,
      offset,
      '가',
      { anchorCodeUnitOffset: offset + 1, focusCodeUnitOffset: offset + 1 },
    ));
  }
  const input = { popupOpen: true, current: comboboxRng.pick([null, ...ids]) };
  const optimized = createComboboxState(domain, text, input);
  const reference = createReferenceComboboxState(domain, text, input);
  const target = comboboxRng.pick([...ids, `missing-${iteration}`]);
  const direct = comboboxRng.bool();
  const left = direct
    ? applyComboboxEvent(domain, labels, optimized, { type: 'accept', id: target })
    : acceptComboboxCandidate(domain, labels, optimized);
  const right = direct
    ? referenceApplyComboboxEvent(domain, labels, reference, { type: 'accept', id: target })
    : referenceAcceptCombobox(domain, labels, reference);
  assert.deepEqual(comboboxResultObservation(left), referenceComboboxResultObservation(right));
  if (left.ok && right.ok) {
    counts.combobox.accepted += 1;
    counts.combobox.commands += left.value.commands.length;
  } else {
    counts.combobox.rejected += 1;
  }
  counts.combobox.models += 1;
}

for (let size = 0; size <= 4; size += 1) {
  const ids = Array.from({ length: size }, (_, index) => `r${index}`);
  const domain = createSequence(ids);
  for (const eligibleIDs of powerset(ids)) {
    const eligible = new Set(eligibleIDs);
    const state = createListboxState(domain);
    const base = createRevisionSnapshot(state, 7);
    const reducer = (current, event) => applyListboxEvent(domain, current, event, {
      eligible: (id) => eligible.has(id),
      selectionFollowsFocus: false,
      boundary: 'stop',
    });
    const stale = applyRevisionedEvent(base, 6, 'next', reducer);
    assert.equal(stale.ok, false);
    assert.equal(stale.error.code, 'stale-revision');
    assert.equal(stale.snapshot, base);
    counts.revision.cases += 1;

    const failed = applyRevisionedEvent(base, 7, 'toggle', reducer);
    assert.equal(failed.ok, false);
    assert.equal(failed.error.code, 'no-cursor');
    assert.equal(failed.snapshot, base);
    counts.revision.cases += 1;

    const accepted = applyRevisionedEvent(base, 7, 'next', reducer);
    assert.equal(accepted.ok, true);
    assert.equal(accepted.snapshot.revision, 8);
    counts.revision.cases += 1;

    const repeated = applyRevisionedEvent(accepted.snapshot, 7, 'next', reducer);
    assert.equal(repeated.ok, false);
    assert.equal(repeated.error.code, 'stale-revision');
    assert.equal(repeated.snapshot, accepted.snapshot);
    counts.revision.cases += 1;
  }
}

process.stdout.write(`${JSON.stringify({ status: 'pass', seed, iterationsPerStructure: iterations, ...counts }, null, 2)}\n`);

function linearChoiceObservation(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        selected: result.value.state.selection.selected,
        commands: result.value.commands,
      }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function referenceLinearChoiceObservation(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        selected: result.value.state.selection.selected,
        commands: result.value.commands,
      }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}

function linearActionObservation(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        commands: result.value.commands,
      }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function referenceLinearActionObservation(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        commands: result.value.commands,
      }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}

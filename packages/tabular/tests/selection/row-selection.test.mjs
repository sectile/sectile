import assert from 'node:assert/strict';
import test from 'node:test';
import { createTabularModel } from '../../.verification-dist/model.js';
import {
  createExplicitRowSelection,
  createGroupLeafSelectionTarget,
  reconcileAuthoritativeRowRemoval,
  reconcileRowSelectionBinding,
  selectAllMatchingRows,
  setVisibleRowSelectionRange,
  toggleExplicitRowSelection,
} from '../../.verification-dist/internal/selection.js';

const limits = createTabularModel({ columns: [] }).limits;

test('TAB-SEL-01: explicit selection toggles without depending on current visibility', () => {
  const initial = createExplicitRowSelection(['off-page', 'visible'], limits);
  assert.equal(initial.ok, true);
  const added = toggleExplicitRowSelection(initial.value, 'new-page', limits);
  assert.equal(added.ok, true);
  assert.deepEqual(added.value.rowIDs, ['off-page', 'visible', 'new-page']);
  const removed = toggleExplicitRowSelection(added.value, 'visible', limits);
  assert.equal(removed.ok, true);
  assert.deepEqual(removed.value.rowIDs, ['off-page', 'new-page']);
});

test('TAB-SEL-02: all-matching selection binds to source and query, not access or expansion', () => {
  const all = selectAllMatchingRows(3, 8);
  assert.equal(all.ok, true);
  assert.equal(reconcileRowSelectionBinding(all.value, 3, 8, false), all.value);
  assert.deepEqual(reconcileRowSelectionBinding(all.value, 3, 9, false), { kind: 'explicit-rows', rowIDs: [] });
  assert.deepEqual(reconcileRowSelectionBinding(all.value, 4, 8, false), { kind: 'explicit-rows', rowIDs: [] });
});

test('TAB-SEL-03: source replacement clears both selection modes', () => {
  const explicit = createExplicitRowSelection(['a'], limits);
  const all = selectAllMatchingRows(0, 0);
  assert.equal(explicit.ok && all.ok, true);
  assert.deepEqual(reconcileRowSelectionBinding(explicit.value, 1, 0, true), { kind: 'explicit-rows', rowIDs: [] });
  assert.deepEqual(reconcileRowSelectionBinding(all.value, 1, 0, true), { kind: 'explicit-rows', rowIDs: [] });
});

test('TAB-SEL-04: authoritative deletion reconciles selected IDs and exclusions only', () => {
  const explicit = createExplicitRowSelection(['a', 'b', 'c'], limits);
  const all = selectAllMatchingRows(1, 2);
  const excluded = toggleExplicitRowSelection(all.value, 'b', limits);
  assert.equal(explicit.ok && all.ok && excluded.ok, true);
  assert.deepEqual(reconcileAuthoritativeRowRemoval(explicit.value, ['b']), { kind: 'explicit-rows', rowIDs: ['a', 'c'] });
  assert.deepEqual(reconcileAuthoritativeRowRemoval(excluded.value, ['b']), {
    kind: 'all-matching', sourceGeneration: 1, queryRevision: 2, excludedRowIDs: [],
  });
  assert.equal(reconcileAuthoritativeRowRemoval(explicit.value, ['not-present']), explicit.value);
});

test('TAB-SEL-05: group bulk intent carries leaf binding and never stores a synthetic group ID', () => {
  const all = selectAllMatchingRows(2, 5);
  const excluded = toggleExplicitRowSelection(all.value, 'leaf-7', limits);
  const target = createGroupLeafSelectionTarget(excluded.value, 'group:team-a', 2, 5, limits);
  assert.equal(target.ok, true);
  assert.deepEqual(target.value, {
    kind: 'group-leaves', sourceGeneration: 2, queryRevision: 5,
    groupID: 'group:team-a', excludedRowIDs: ['leaf-7'],
  });
  assert.equal('rowIDs' in target.value, false);
});

test('TAB-SEL-06: selection identity and exclusion ceilings reject atomically', () => {
  const tiny = { ...limits, maxSelectionIDs: 1 };
  const tooMany = createExplicitRowSelection(['a', 'b'], tiny);
  assert.equal(tooMany.ok, false);
  assert.equal(tooMany.error.code, 'selection-id-ceiling-exceeded');
  const duplicate = createExplicitRowSelection(['a', 'a'], limits);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error.code, 'duplicate-identity');
});

test('TAB-SEL-07: visible ranges apply one selected state in either direction', () => {
  const initial = createExplicitRowSelection(['off-page', 'b'], limits);
  assert.equal(initial.ok, true);
  const selected = setVisibleRowSelectionRange(initial.value, ['a', 'b', 'c', 'd'], 'b', 'd', true, limits);
  assert.equal(selected.ok, true);
  assert.deepEqual(selected.value, { kind: 'explicit-rows', rowIDs: ['off-page', 'b', 'c', 'd'] });
  const deselected = setVisibleRowSelectionRange(selected.value, ['a', 'b', 'c', 'd'], 'd', 'b', false, limits);
  assert.equal(deselected.ok, true);
  assert.deepEqual(deselected.value, { kind: 'explicit-rows', rowIDs: ['off-page'] });
});

test('TAB-SEL-08: all-matching ranges update exclusions and reject hidden endpoints atomically', () => {
  const all = selectAllMatchingRows(2, 4);
  const excluded = setVisibleRowSelectionRange(all.value, ['a', 'b', 'c'], 'a', 'c', false, limits);
  assert.equal(excluded.ok, true);
  assert.deepEqual(excluded.value, {
    kind: 'all-matching', sourceGeneration: 2, queryRevision: 4, excludedRowIDs: ['a', 'b', 'c'],
  });
  const selected = setVisibleRowSelectionRange(excluded.value, ['a', 'b', 'c'], 'b', 'c', true, limits);
  assert.equal(selected.ok, true);
  assert.deepEqual(selected.value.excludedRowIDs, ['a']);
  const rejected = setVisibleRowSelectionRange(selected.value, ['a', 'b', 'c'], 'missing', 'c', true, limits);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'invalid-selection-range');
  assert.deepEqual(selected.value.excludedRowIDs, ['a']);
});

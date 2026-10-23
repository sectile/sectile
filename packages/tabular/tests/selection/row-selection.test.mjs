import assert from 'node:assert/strict';
import test from 'node:test';
import { createTabularModel } from '../../.verification-dist/model/state.js';
import { createDataTable, getAllMatchingSelectionState } from '../../.verification-dist/profiles/table.js';
import {
  createExplicitRowSelection,
  createGroupLeafSelectionTarget,
  reconcileAuthoritativeRowRemoval,
  reconcileRowSelectionBinding,
  selectAllMatchingRows,
  setIndexedVisibleRowSelectionRange,
  setVisibleRowSelectionRange,
  toggleExplicitRowSelection,
} from '../../.verification-dist/model/selection.js';

const limits = createTabularModel({ columns: [] }).limits;

function bulkSnapshot(selection, total, rows = [{ kind: 'leaf', id: 'a', cells: { name: 'A' } }, { kind: 'leaf', id: 'b', cells: { name: 'B' } }], stale = false) {
  const table = createDataTable({ columns: [{ id: 'name' }], initialValues: { rowSelection: selection,
    accessState: { kind: 'page', page: 1, itemsPerPage: Math.max(1, rows.length), visibleRowCount: null, pagination: null },
  } });
  try {
    if (total !== 'no-view') {
      const request = table.getSnapshot().state.requestState.pendingRequest;
      assert.notEqual(request, null);
      assert.equal(table.synchronizeView({ ...request, viewRevision: 1,
        matchingLeafCount: total === 'unknown' ? { kind: 'unknown' } : { kind: 'known', value: total },
        visibleRowCount: { kind: 'known', value: rows.length }, rows,
        columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name' }], headers: [] }, removedRowIDs: [],
      }).ok, true);
    }
    if (stale) assert.equal(table.requestView().ok, true);
    return table.getSnapshot();
  } finally { table.dispose(); }
}

test('TAB-SEL-09: all-matching state distinguishes matching totals, visibility and exclusions', () => {
  const explicit = rowIDs => ({ kind: 'explicit-rows', rowIDs });
  const all = excludedRowIDs => ({ kind: 'all-matching', sourceGeneration: 0, queryRevision: 0, excludedRowIDs });
  const cases = [
    ['no selection', explicit([]), 2, 'unchecked'],
    ['partial visible selection', explicit(['a']), 2, 'indeterminate'],
    ['complete matching result', explicit(['a', 'b']), 2, 'checked'],
    ['off-page only selection', explicit(['elsewhere']), 2, 'unchecked'],
    ['visible page is not the whole result', explicit(['a', 'b']), 5, 'indeterminate'],
    ['unknown matching total', explicit(['a', 'b']), 'unknown', 'indeterminate'],
    ['all matching', all([]), 2, 'checked'],
    ['one exclusion', all(['a']), 2, 'indeterminate'],
    ['all excluded', all(['a', 'b']), 2, 'unchecked'],
    ['unknown total with exclusions', all(['a', 'b']), 'unknown', 'indeterminate'],
    ['no view with explicit selection', explicit(['a']), 'no-view', 'unchecked'],
    ['no view with all matching', all([]), 'no-view', 'checked'],
    ['no view with exclusions', all(['a']), 'no-view', 'indeterminate'],
  ];
  for (const [label, selection, total, expected] of cases)
    assert.equal(getAllMatchingSelectionState(bulkSnapshot(selection, total)), expected, label);
  for (const selection of [explicit(['a']), all([])])
    assert.equal(getAllMatchingSelectionState(bulkSnapshot(selection, 0, [])), 'unchecked', 'known empty overrides selection mode');
  const grouped = bulkSnapshot(explicit(['a', 'b']), 2, [
    { kind: 'group', id: 'team', parentGroupID: null, depth: 0, expanded: true, cells: { name: 'Team' } },
    { kind: 'leaf', id: 'a', cells: { name: 'A' } }, { kind: 'leaf', id: 'b', cells: { name: 'B' } },
  ]);
  assert.equal(getAllMatchingSelectionState(grouped), 'checked', 'group rows do not inflate the matching leaf count');
  const stale = bulkSnapshot(explicit(['a', 'b']), 2, undefined, true);
  assert.equal(stale.state.acceptedViewState.kind, 'stale');
  assert.equal(getAllMatchingSelectionState(stale), 'checked', 'retained stale view keeps its display contract');
});

test('TAB-SEL-10: detached selection normalization does not multiply by visible rows', t => {
  const counts = [];
  for (const visible of [1, 1_000]) {
    const ids = Array.from({ length: 128 }, (_, index) => `row-${index}`);
    const snapshot = bulkSnapshot({ kind: 'explicit-rows', rowIDs: ids }, visible,
      Array.from({ length: visible }, (_, index) => ({ kind: 'leaf', id: `row-${index}`, cells: { name: String(index) } })));
    let reads = 0;
    const detachedIDs = ids.map((_, index) => `row-${index}`);
    for (let index = 0; index < detachedIDs.length; index += 1) Object.defineProperty(detachedIDs, index, {
      enumerable: true, get() { reads += 1; return `row-${index}`; },
    });
    const detached = { ...snapshot, state: { ...snapshot.state, rowSelection: { kind: 'explicit-rows', rowIDs: Object.freeze(detachedIDs) } } };
    assert.equal(getAllMatchingSelectionState(detached), visible === 1 ? 'checked' : 'indeterminate');
    counts.push(reads);
  }
  assert.ok(counts[0] > 0, 'the detached normalization path is exercised');
  assert.equal(counts[1], counts[0], 'selected-ID reads stay independent of visible row cardinality');
  t.diagnostic(JSON.stringify({ selectionIDs: 128, visibleRows: [1, 1_000], selectedIDReads: counts }));
});

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
  const all = selectAllMatchingRows(3, 8, limits);
  assert.equal(all.ok, true);
  assert.equal(reconcileRowSelectionBinding(all.value, 3, 8, false), all.value);
  assert.deepEqual(reconcileRowSelectionBinding(all.value, 3, 9, false), { kind: 'explicit-rows', rowIDs: [] });
  assert.deepEqual(reconcileRowSelectionBinding(all.value, 4, 8, false), { kind: 'explicit-rows', rowIDs: [] });
});

test('TAB-SEL-03: source replacement clears both selection modes', () => {
  const explicit = createExplicitRowSelection(['a'], limits);
  const all = selectAllMatchingRows(0, 0, limits);
  assert.equal(explicit.ok && all.ok, true);
  assert.deepEqual(reconcileRowSelectionBinding(explicit.value, 1, 0, true), { kind: 'explicit-rows', rowIDs: [] });
  assert.deepEqual(reconcileRowSelectionBinding(all.value, 1, 0, true), { kind: 'explicit-rows', rowIDs: [] });
});

test('TAB-SEL-04: authoritative deletion reconciles selected IDs and exclusions only', () => {
  const explicit = createExplicitRowSelection(['a', 'b', 'c'], limits);
  const all = selectAllMatchingRows(1, 2, limits);
  const excluded = toggleExplicitRowSelection(all.value, 'b', limits);
  assert.equal(explicit.ok && all.ok && excluded.ok, true);
  assert.deepEqual(reconcileAuthoritativeRowRemoval(explicit.value, ['b']), { kind: 'explicit-rows', rowIDs: ['a', 'c'] });
  assert.deepEqual(reconcileAuthoritativeRowRemoval(excluded.value, ['b']), {
    kind: 'all-matching', sourceGeneration: 1, queryRevision: 2, excludedRowIDs: [],
  });
  assert.equal(reconcileAuthoritativeRowRemoval(explicit.value, ['not-present']), explicit.value);
});

test('TAB-SEL-05: group bulk intent carries leaf binding and never stores a synthetic group ID', () => {
  const all = selectAllMatchingRows(2, 5, limits);
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
  const all = selectAllMatchingRows(2, 4, limits);
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

test('ISSUE-062: indexed range work depends on the selected interval, not visible cardinality', () => {
  class CountingMap extends Map {
    gets = 0;
    get(key) {
      this.gets += 1;
      return super.get(key);
    }
  }
  for (const size of [1_000, 10_000, 100_000]) {
    const sourceRows = Array.from({ length: size }, (_, index) => ({
      kind: 'leaf', id: `row-${index}`, cells: {},
    }));
    let rowReads = 0;
    const rows = new Proxy(sourceRows, {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/u.test(key)) rowReads += 1;
        return Reflect.get(target, key, receiver);
      },
    });
    const indexes = new CountingMap();
    for (let index = 0; index < size; index += 1) indexes.set(`row-${index}`, index);
    const initial = createExplicitRowSelection([], limits);
    assert.equal(initial.ok, true);
    const selected = setIndexedVisibleRowSelectionRange(
      initial.value,
      rows,
      indexes,
      `row-${size - 2}`,
      `row-${size - 1}`,
      true,
      limits,
    );
    assert.equal(selected.ok, true);
    assert.deepEqual(selected.value.rowIDs, [`row-${size - 2}`, `row-${size - 1}`]);
    assert.equal(indexes.gets, 2);
    assert.equal(rowReads, 6);
  }
});

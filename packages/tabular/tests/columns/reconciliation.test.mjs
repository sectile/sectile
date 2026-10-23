import assert from 'node:assert/strict';
import test from 'node:test';
import { createTabularModel, projectTabularHeaders } from '../../.verification-dist/model/state.js';
import {
  createTabularColumnState,
  pinTabularColumn,
  projectTabularColumnPartitions,
  reconcileTabularColumns,
  setTabularColumnVisibility,
} from '../../.verification-dist/model/columns.js';

const limits = createTabularModel({ columns: [] }).limits;

test('header layout preserves grouped spans, uneven depth and visible column order', () => {
  const schema = { columns: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], headers: [
    { kind: 'group', id: 'team', children: [
      { kind: 'group', id: 'identity', children: [{ kind: 'column', id: 'a-header', columnID: 'a' }] },
      { kind: 'column', id: 'b-header', columnID: 'b' },
    ] },
    { kind: 'column', id: 'c-header', columnID: 'c' },
  ] };
  assert.deepEqual(projectTabularHeaders(schema, new Map([['c', 1], ['a', 2], ['b', 3]])), [
    { headerNodeID: 'a-header', columnID: 'a', columnIndex: 2, colSpan: 1, rowSpan: 1, depth: 2 },
    { headerNodeID: 'identity', columnID: null, columnIndex: 2, colSpan: 1, rowSpan: 1, depth: 1 },
    { headerNodeID: 'b-header', columnID: 'b', columnIndex: 3, colSpan: 1, rowSpan: 2, depth: 1 },
    { headerNodeID: 'team', columnID: null, columnIndex: 2, colSpan: 2, rowSpan: 1, depth: 0 },
    { headerNodeID: 'c-header', columnID: 'c', columnIndex: 1, colSpan: 1, rowSpan: 3, depth: 0 },
  ]);
  assert.deepEqual(projectTabularHeaders(schema, new Map([['b', 1], ['c', 2]])), [
    { headerNodeID: 'b-header', columnID: 'b', columnIndex: 1, colSpan: 1, rowSpan: 2, depth: 1 },
    { headerNodeID: 'team', columnID: null, columnIndex: 1, colSpan: 1, rowSpan: 1, depth: 0 },
    { headerNodeID: 'c-header', columnID: 'c', columnIndex: 2, colSpan: 1, rowSpan: 3, depth: 0 },
  ]);
  assert.deepEqual(projectTabularHeaders(schema, new Map()), []);
});

test('wide default header layout performs one index lookup per leaf and freezes its result', () => {
  const columns = Array.from({ length: 10_000 }, (_, index) => ({ id: `c${index}`, headerNodeID: `h${index}` }));
  let lookups = 0;
  class Indexes extends Map { get(key) { lookups++; return super.get(key); } }
  const indexes = new Indexes(columns.map((column, index) => [column.id, index + 1]));
  const layout = projectTabularHeaders({ columns, headers: [] }, indexes);
  assert.equal(lookups, columns.length);
  assert.equal(layout.length, columns.length);
  assert.deepEqual(layout.at(-1), { headerNodeID: 'h9999', columnID: 'c9999', columnIndex: 10_000, colSpan: 1, rowSpan: 1, depth: 0 });
  assert.equal(Object.isFrozen(layout), true);
  assert.ok(layout.every(Object.isFrozen));
});

test('TAB-COL-01: surviving columns preserve relative order across static and pivot schema changes', () => {
  const before = [{ id: 'a' }, { id: 'pivot:x' }, { id: 'b' }];
  const next = [{ id: 'a' }, { id: 'b' }, { id: 'pivot:y' }];
  const state = {
    order: ['b', 'pivot:x', 'a'], hidden: [], pinnedStart: [], pinnedEnd: [],
  };
  const result = reconcileTabularColumns(before, state, next, limits);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.order, ['b', 'a', 'pivot:y']);
});

test('TAB-COL-02: removed state disappears and inserted defaults apply deterministically', () => {
  const before = [{ id: 'removed' }, { id: 'kept' }];
  const state = {
    order: ['removed', 'kept'], hidden: ['removed', 'kept'], pinnedStart: ['removed'], pinnedEnd: ['kept'],
  };
  const next = [
    { id: 'kept' },
    { id: 'new-hidden', initialVisible: false, initialPin: 'start' },
    { id: 'new-end', initialPin: 'end' },
  ];
  const result = reconcileTabularColumns(before, state, next, limits);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    order: ['kept', 'new-hidden', 'new-end'],
    hidden: ['kept', 'new-hidden'],
    pinnedStart: ['new-hidden'],
    pinnedEnd: ['kept', 'new-end'],
  });
});

test('TAB-COL-03: hidden columns retain logical pin assignment but leave visible partitions', () => {
  let state = createTabularColumnState([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  state = pinTabularColumn(state, 'a', 'start');
  state = pinTabularColumn(state, 'c', 'end');
  state = setTabularColumnVisibility(state, 'a', false);
  assert.deepEqual(state.pinnedStart, ['a']);
  assert.deepEqual(projectTabularColumnPartitions(state), { start: [], center: ['b'], end: ['c'] });
});

test('TAB-COL-04: all-pinned and center-only schemas are lawful degenerate partitions', () => {
  const center = createTabularColumnState([{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(projectTabularColumnPartitions(center), { start: [], center: ['a', 'b'], end: [] });
  const allPinned = pinTabularColumn(pinTabularColumn(center, 'a', 'start'), 'b', 'end');
  assert.deepEqual(projectTabularColumnPartitions(allPinned), { start: ['a'], center: [], end: ['b'] });
});

test('TAB-COL-05: duplicate dynamic columns and ceilings reject without partial state', () => {
  const state = createTabularColumnState([{ id: 'a' }]);
  const duplicate = reconcileTabularColumns([{ id: 'a' }], state, [{ id: 'a' }, { id: 'a' }], limits);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error.code, 'duplicate-identity');
  const ceiling = reconcileTabularColumns([{ id: 'a' }], state, [{ id: 'a' }, { id: 'b' }], { ...limits, maxColumns: 1 });
  assert.equal(ceiling.ok, false);
  assert.equal(ceiling.error.code, 'column-ceiling-exceeded');
  assert.deepEqual(state.order, ['a']);
});

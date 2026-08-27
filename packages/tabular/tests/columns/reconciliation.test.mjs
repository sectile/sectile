import assert from 'node:assert/strict';
import test from 'node:test';
import { createTabularModel } from '../../.verification-dist/model.js';
import {
  createTabularColumnState,
  pinTabularColumn,
  projectTabularColumnPartitions,
  reconcileTabularColumns,
  setTabularColumnVisibility,
} from '../../.verification-dist/internal/columns.js';

const limits = createTabularModel({ columns: [] }).limits;

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

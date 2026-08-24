/* Composite evidence: grid navigation, separate cursor/selection authority, external page commands */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCalendarState,
  applyCalendarEvent, tryCreateCalendarState
} from '../../.verification-dist/internal/composites/calendar.js';
import {
  createReferenceCalendarState,
  applyReferenceCalendarEvent,
} from '../../.verification-dist/internal/reference/composites/calendar.js';
import { createGrid } from '../../.verification-dist/structures/grid.js';
import { powerset, unwrap } from '../support.mjs';

const EVENTS = ['left', 'right', 'up', 'down', 'select', 'previous-page', 'next-page'];

test('calendar direct selection targets an eligible cell', () => {
  const grid = createGrid([['a', 'b']]);
  const state = createCalendarState(grid);
  const selected = unwrap(applyCalendarEvent(grid, state, { type: 'select', id: 'b' }));
  assert.equal(selected.state.cursor.current, 'b');
  assert.deepEqual(selected.state.selection.selected, ['b']);
  assert.deepEqual(selected.commands, [{ type: 'focus', id: 'b' }]);
  assert.equal(
    applyCalendarEvent(grid, state, { type: 'select', id: 'b' }, { eligible: () => false })
      .error.code,
    'calendar-target-unavailable',
  );
});

test('calendar composition matches its reference across bounded grid views', () => {
  let models = 0;
  let transitions = 0;
  for (let rows = 0; rows <= 2; rows += 1) {
    for (let columns = 0; columns <= 2; columns += 1) {
      for (let mask = 0; mask < 2 ** (rows * columns); mask += 1) {
        const cells = [];
        const ids = [];
        for (let row = 0; row < rows; row += 1) {
          const values = [];
          for (let column = 0; column < columns; column += 1) {
            const index = row * columns + column;
            const id = (mask & 2 ** index) === 0 ? null : `d${ids.length}`;
            values.push(id);
            if (id !== null) ids.push(id);
          }
          cells.push(values);
        }
        const grid = createGrid(cells, { columnCount: columns });
        for (const eligibleIDs of powerset(ids)) {
          const eligible = new Set(eligibleIDs);
          for (const current of [null, ...ids]) {
            for (const boundary of ['stop', 'wrap-axis']) {
              const state = createCalendarState(grid, { current });
              assert.deepEqual(
                stateObservation(state),
                stateObservation(createReferenceCalendarState(grid, { current })),
              );
              const policies = { eligible: (id) => eligible.has(id), boundary };
              models += 1;
              for (const event of EVENTS) {
                const left = applyCalendarEvent(grid, state, event, policies);
                const repeated = applyCalendarEvent(grid, state, event, policies);
                const reference = applyReferenceCalendarEvent(grid, state, event, policies);
                assert.deepEqual(observe(left), observe(repeated));
                assert.deepEqual(observe(left), observeReference(reference));
                if (left.ok) assertState(left.value.state, ids);
                else {
                  assert.equal(left.error.code, 'no-cursor');
                  assertState(state, ids);
                }
                transitions += 1;
              }
            }
          }
        }
      }
    }
  }
  assert.equal(models, 698);
  assert.equal(transitions, 4_886);
});

test('calendar movement, selection, and page authority remain distinct', () => {
  const grid = createGrid([
    ['a', null, 'c'],
    ['d', 'e', 'f'],
  ]);
  const empty = createCalendarState(grid);
  const initial = unwrap(applyCalendarEvent(grid, empty, 'right'));
  assert.equal(initial.state.cursor.current, 'a');
  assert.deepEqual(initial.commands, [{ type: 'focus', id: 'a' }]);

  const skipped = unwrap(applyCalendarEvent(grid, initial.state, 'right', {
    eligible: (id) => id === 'c',
  }));
  assert.equal(skipped.state.cursor.current, 'c');
  assert.deepEqual(skipped.state.selection.selected, []);

  const selected = unwrap(applyCalendarEvent(grid, skipped.state, 'select'));
  assert.deepEqual(selected.state.selection.selected, ['c']);
  assert.equal(selected.state.selection.anchor, 'c');
  assert.deepEqual(selected.commands, []);

  const down = unwrap(applyCalendarEvent(grid, selected.state, 'down'));
  assert.equal(down.state.cursor.current, 'f');
  assert.deepEqual(down.state.selection.selected, ['c']);

  const page = unwrap(applyCalendarEvent(grid, down.state, 'next-page'));
  assert.equal(page.state, down.state);
  assert.deepEqual(page.commands, [{ type: 'request-page', direction: 1, from: 'f' }]);
  assert.equal(Object.isFrozen(page.commands[0]), true);
});

test('calendar rejects malformed state and policies without partial effects', () => {
  const grid = createGrid([['a', null, 'b']]);
  const empty = createCalendarState(grid);
  assert.equal(tryCreateCalendarState(grid, { current: 'missing' }).error.code, 'calendar-cursor-outside-grid');
  assert.equal(tryCreateCalendarState(grid, { selected: ['a', 'b'] }).error.code, 'invalid-selection-cardinality');

  const invalidState = Object.freeze({
    cursor: Object.freeze({ current: 'missing' }),
    selection: empty.selection,
  });
  assert.equal(applyCalendarEvent(grid, invalidState, 'right').error.code, 'calendar-cursor-outside-grid');
  assert.equal(applyCalendarEvent(grid, empty, 'select').error.code, 'no-cursor');
  assert.equal(applyCalendarEvent(grid, empty, 'unknown').error.code, 'invalid-calendar-event');
  assert.equal(applyCalendarEvent(grid, empty, 'right', { boundary: 'wrap' }).error.code, 'invalid-calendar-boundary');
  assert.equal(applyCalendarEvent(grid, empty, 'right', { eligible: true }).error.code, 'invalid-eligibility-policy');

  const ceiling = applyCalendarEvent(grid, empty, 'right', {
    eligible: (id) => id === 'b',
    maxScan: 1,
  });
  assert.equal(ceiling.ok, false);
  assert.equal(ceiling.error.class, 'resource-rejection');
  assert.equal(ceiling.error.code, 'scan-ceiling-reached');
  assert.equal(empty.cursor.current, null);
  assert.deepEqual(empty.selection.selected, []);
});

function assertState(state, ids) {
  assert.equal(state.cursor.current === null || ids.includes(state.cursor.current), true);
  assert.equal(state.selection.selected.length <= 1, true);
  assert.equal(state.selection.selected.every((id) => ids.includes(id)), true);
}

function stateObservation(state) {
  return {
    current: state.cursor.current,
    selected: state.selection.selected,
    anchor: state.selection.anchor,
  };
}

function observe(result) {
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

function observeReference(result) {
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

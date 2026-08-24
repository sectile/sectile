import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createGrid } from '@sectile/core/grid';
import {
  createCalendar,
  tryCreateCalendar,
  createCalendarController,
  toCalendarEffect,
  toCalendarEvent,
} from '../dist/calendar.js';

test('terminal calendar facade constructs the grid and owns page requests', () => {
  const pages = [];
  let updates = 0;
  const connection = createCalendar({
    rows: [['a', 'b'], ['c', 'd']],
    defaultHighlightedValue: 'a',
    onPageRequest: (request) => pages.push(request),
    onUpdate: () => { updates += 1; },
  });
  assert.equal(connection.grid.columnCount, 2);
  assert.equal(connection.handleKeyboardInput({ key: 'page-down' }), true);
  assert.equal(connection.handleKeyboardInput({ key: 'tab' }), false);
  assert.deepEqual(pages, [{ direction: 1, from: 'a' }]);
  assert.equal(updates, 1);

  const invalid = tryCreateCalendar({ rows: [['a'], ['a']] });
  assert.equal(invalid.ok, false);
});

test('terminal keys map onto calendar semantic events', () => {
  assert.equal(toCalendarEvent({ key: 'left' }), 'left');
  assert.equal(toCalendarEvent({ key: 'down' }), 'down');
  assert.equal(toCalendarEvent({ key: 'space' }), 'select');
  assert.equal(toCalendarEvent({ key: 'page-up' }), 'previous-page');
  assert.equal(toCalendarEvent({ key: 'page-down' }), 'next-page');
  assert.equal(toCalendarEvent({ key: 'tab' }), null);
});

test('terminal calendar commands project into highlight and page effects', () => {
  assert.deepEqual(toCalendarEffect({ type: 'focus', id: 'a' }), {
    type: 'move-highlight',
    id: 'a',
  });
  assert.deepEqual(toCalendarEffect({ type: 'request-page', direction: -1, from: null }), {
    type: 'request-page',
    direction: -1,
    from: null,
  });
});

test('terminal calendar supports mixed controlled state', () => {
  const values = [];
  const controller = unwrap(createCalendarController({
    grid: grid(),
    value: null,
    defaultHighlightedValue: 'a',
    onValueChange(change) {
      values.push(change);
    },
  }));
  const moved = controller.handleKeyboardInput({ key: 'right' });
  assert.equal(moved.ok, true);
  assert.equal(moved.snapshot.state.cursor.current, 'b');
  const selected = controller.handleKeyboardInput({ key: 'enter' });
  assert.equal(selected.ok, true);
  assert.deepEqual(selected.snapshot.state.selection.selected, []);
  assert.deepEqual(values, [{ value: 'b', previousValue: null }]);
  assert.deepEqual(
    unwrap(controller.syncControlledValues({ value: 'b' })).state.selection.selected,
    ['b'],
  );
});

test('unsupported terminal calendar input is failure-atomic', () => {
  const controller = unwrap(createCalendarController({ grid: grid() }));
  const initial = controller.getSnapshot();
  const result = controller.handleKeyboardInput({ key: 'tab' });
  assert.equal(result.ok, false);
  assert.equal(result.snapshot, initial);
  assert.deepEqual(result.commands, []);
});

function grid() {
  return createGrid([['a', 'b'], ['c', 'd']]);
}

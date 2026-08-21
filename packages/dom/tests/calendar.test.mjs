import assert from 'node:assert/strict';
import test from 'node:test';
import { createGrid } from '@sectile/primitives/grid';
import {
  createCalendarController,
  toCalendarEffect,
  toCalendarEvent,
} from '../dist/calendar.js';

test('DOM keys map onto calendar semantic events', () => {
  assert.equal(toCalendarEvent({ key: 'ArrowLeft' }), 'left');
  assert.equal(toCalendarEvent({ key: 'ArrowDown' }), 'down');
  assert.equal(toCalendarEvent({ key: 'Enter' }), 'select');
  assert.equal(toCalendarEvent({ key: 'PageUp' }), 'previous-page');
  assert.equal(toCalendarEvent({ key: 'PageDown' }), 'next-page');
  assert.equal(toCalendarEvent({ key: 'ArrowRight', ctrlKey: true }), null);
});

test('DOM calendar commands project into focus and page effects', () => {
  assert.deepEqual(toCalendarEffect({ type: 'focus', id: 'a' }), {
    type: 'focus-element',
    id: 'a',
  });
  assert.deepEqual(toCalendarEffect({ type: 'request-page', direction: 1, from: 'a' }), {
    type: 'request-page',
    direction: 1,
    from: 'a',
  });
});

test('uncontrolled DOM calendar owns highlight and selection', () => {
  const controller = unwrap(createCalendarController({
    grid: grid(),
    defaultHighlightedValue: 'a',
  }));
  const moved = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(moved.ok, true);
  assert.equal(moved.snapshot.state.cursor.current, 'b');
  const selected = controller.handleKeyboardInput({ key: 'Enter' });
  assert.equal(selected.ok, true);
  assert.deepEqual(selected.snapshot.state.selection.selected, ['b']);
  const paged = controller.handleKeyboardInput({ key: 'PageDown' });
  assert.equal(paged.ok, true);
  assert.deepEqual(paged.commands, [{ type: 'request-page', direction: 1, from: 'b' }]);
});

test('controlled DOM calendar emits proposals until synchronized', () => {
  const values = [];
  const highlights = [];
  const controller = unwrap(createCalendarController({
    grid: grid(),
    value: 'a',
    highlightedValue: 'a',
    onValueChange(change) {
      values.push(change);
    },
    onHighlightedValueChange(change) {
      highlights.push(change);
    },
  }));
  const moved = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(moved.ok, true);
  assert.equal(moved.snapshot.state.cursor.current, 'a');
  assert.deepEqual(highlights, [{ value: 'b', previousValue: 'a' }]);
  unwrap(controller.syncControlledValues({ value: 'a', highlightedValue: 'b' }));
  const selected = controller.handleKeyboardInput({ key: 'Enter' });
  assert.equal(selected.ok, true);
  assert.deepEqual(selected.snapshot.state.selection.selected, ['a']);
  assert.deepEqual(values, [{ value: 'b', previousValue: 'a' }]);
});

function grid() {
  return unwrap(createGrid([['a', 'b'], ['c', 'd']]));
}

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}

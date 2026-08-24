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

test('DOM calendar facade constructs the grid and owns ARIA, focus, and page requests', () => {
  const root = new FakeElement();
  const pages = [];
  const connection = createCalendar({
    rows: [['a', 'b'], ['c', 'd']],
    root,
    defaultHighlightedValue: 'a',
    onPageRequest: (request) => pages.push(request),
  });
  connection.setCalendarAttributes('Dates');
  assert.equal(connection.grid.rowCount, 2);
  assert.equal(root.attributes.get('role'), 'grid');
  assert.equal(root.attributes.get('aria-colcount'), '2');
  const cell = new FakeElement();
  connection.setCellAttributes(cell, { id: 'a', rowIndex: 1, columnIndex: 1 });
  assert.equal(cell.attributes.get('role'), 'gridcell');
  assert.equal(cell.tabIndex, 0);
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('PageDown')), true);
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Tab')), false);
  assert.deepEqual(pages, [{ direction: 1, from: 'a' }]);
  connection.disconnect();

  const invalid = tryCreateCalendar({ rows: [['a'], ['a']], root: new FakeElement() });
  assert.equal(invalid.ok, false);
});

test('DOM keys map onto calendar semantic events', () => {
  assert.equal(toCalendarEvent({ key: 'ArrowLeft' }), 'left');
  assert.equal(toCalendarEvent({ key: 'ArrowDown' }), 'down');
  assert.equal(toCalendarEvent({ key: 'Enter' }), 'select');
  assert.equal(toCalendarEvent({ key: 'PageUp' }), 'previous-page');
  assert.equal(toCalendarEvent({ key: 'PageDown' }), 'next-page');
  assert.equal(toCalendarEvent({ key: 'ArrowRight', ctrlKey: true }), null);
});

test('DOM calendar delegates cell clicks into direct selection', () => {
  const root = new FakeElement();
  const connection = createCalendar({ rows: [['a', 'b']], root });
  const cell = new FakeElement();
  connection.setCellAttributes(cell, { id: 'b', rowIndex: 1, columnIndex: 2 });
  root.emit('click', { target: cell });
  assert.equal(connection.getSnapshot().state.cursor.current, 'b');
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['b']);
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
  return createGrid([['a', 'b'], ['c', 'd']]);
}

function keyboardEvent(key) {
  return { key, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} };
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  tabIndex = -1;

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelectorAll() {
    return [];
  }

  focus() {}
}

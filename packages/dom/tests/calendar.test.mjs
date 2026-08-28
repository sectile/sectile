import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDateValue } from '@sectile/temporal/date-field';
import { createCalendar, toCalendarEvent } from '../.verification-dist/calendar.js';

test('DOM calendar owns date navigation, selection, and ARIA projection', () => {
  const root = new FakeElement();
  const connection = createCalendar({
    root,
    defaultHighlightedValue: date(2024, 1, 31),
    label: 'Dates',
  });
  assert.equal(root.attributes.get('role'), 'grid');
  assert.equal(root.attributes.get('aria-label'), 'Dates');
  assert.equal(connection.getMonth().length, 6);

  const cell = new FakeElement();
  connection.setCellAttributes(cell, date(2024, 2, 1));
  assert.equal(cell.attributes.get('role'), 'gridcell');
  assert.equal(cell.attributes.get('aria-selected'), 'false');

  assert.equal(connection.handleKeyboardEvent(keyboardEvent('ArrowRight')), true);
  assert.equal(formatDateValue(connection.getSnapshot().state.highlighted), '2024-02-01');
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Enter')), true);
  assert.equal(formatDateValue(connection.getSnapshot().state.value), '2024-02-01');
  connection.disconnect();
});

test('DOM keys map to calendar units including week edges and shifted years', () => {
  assert.equal(toCalendarEvent(keyboardEvent('ArrowLeft')), 'previous-day');
  assert.equal(toCalendarEvent(keyboardEvent('ArrowDown')), 'next-week');
  assert.equal(toCalendarEvent(keyboardEvent('Home')), 'start-of-week');
  assert.equal(toCalendarEvent(keyboardEvent('End')), 'end-of-week');
  assert.equal(toCalendarEvent(keyboardEvent('PageUp')), 'previous-month');
  assert.equal(toCalendarEvent(keyboardEvent('PageDown', true)), 'next-year');
  assert.equal(toCalendarEvent(keyboardEvent('ArrowRight', false, true)), null);
});

test('controlled DOM calendar emits proposals until synchronized', () => {
  const values = [];
  const highlights = [];
  const connection = createCalendar({
    root: new FakeElement(),
    value: date(2024, 1, 31),
    highlightedValue: date(2024, 1, 31),
    onValueChange: (value) => values.push(value === null ? null : formatDateValue(value)),
    onHighlightedValueChange: (value) => highlights.push(formatDateValue(value)),
  });
  connection.handleKeyboardEvent(keyboardEvent('ArrowRight'));
  assert.equal(formatDateValue(connection.getSnapshot().state.highlighted), '2024-01-31');
  assert.deepEqual(highlights, ['2024-02-01']);
  connection.update({ value: date(2024, 1, 31), highlightedValue: date(2024, 2, 1) });
  connection.handleKeyboardEvent(keyboardEvent('Enter'));
  assert.equal(formatDateValue(connection.getSnapshot().state.value), '2024-01-31');
  assert.deepEqual(values, ['2024-02-01']);
});

function date(year, month, day) { return Object.freeze({ year, month, day }); }
function keyboardEvent(key, shiftKey = false, ctrlKey = false) {
  return { key, shiftKey, altKey: false, ctrlKey, metaKey: false, preventDefault() {} };
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
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  contains() { return true; }
  focus() {}
}

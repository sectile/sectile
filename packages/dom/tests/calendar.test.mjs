import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDateValue } from '@sectile/temporal/date-field';
import { createCalendar, toCalendarEvent } from '../.verification-dist/temporal/calendar.js';

test('calendar reconstruction preserves view while explicit controlled highlight takes precedence', () => {
  let calendar = createCalendar({ root: new FakeElement(), referenceDate: date(2026, 8, 1) });
  try {
    calendar.handleEvent('next-month'); calendar.handleEvent({ type: 'set-view-mode', value: 'year' });
    const state = calendar.getSnapshot().state; calendar.disconnect();
    calendar = createCalendar({ root: new FakeElement(), defaultState: state });
    assert.deepEqual(calendar.getSnapshot().state, state); calendar.disconnect();
    calendar = createCalendar({ root: new FakeElement(), defaultState: state, highlightedValue: date(2027, 2, 1), value: null });
    assert.deepEqual(calendar.getSnapshot().state.view, { year: 2027, month: 2 });
    assert.equal(calendar.getSnapshot().state.viewMode, 'year'); assert.equal(calendar.getSnapshot().state.value, null);
    assert.throws(() => createCalendar({ root: new FakeElement(), defaultState: { ...state, highlighted: date(2026, 13, 1) } }));
  } finally { calendar.disconnect(); }
});

test('inline calendar pauses observation without a popup layer and rejects stale focus', async () => {
  const root = new FakeElement(); let failUpdate = false; const failure = new Error('Calendar projection failed');
  root.querySelector = () => root;
  const calendar = createCalendar({ root, referenceDate: date(2026, 1, 1), onUpdate: () => { if (failUpdate) throw failure; } });
  const listeners = () => [...root.listeners.values()].reduce((sum, values) => sum + values.size, 0);
  try {
    calendar.handleEvent('next-day'); const snapshot = calendar.getSnapshot();
    calendar.suspend(); calendar.resume(); await Promise.resolve(); assert.equal(root.focusCount, 0);
    for (let cycle = 0; cycle < 3; cycle++) {
      calendar.suspend(); calendar.suspend(); assert.equal(listeners(), 0); assert.equal(calendar.getActive(), false);
      assert.equal(calendar.handleKeyboardEvent(keyboardEvent('ArrowRight')), false); calendar.focusCurrent(); assert.equal(root.focusCount, 0); assert.equal(calendar.getSnapshot(), snapshot);
      calendar.resume(); calendar.resume(); assert.equal(listeners(), 2); assert.equal(calendar.getActive(), true);
    }
    failUpdate = true; assert.throws(() => calendar.suspend(), error => error === failure); assert.equal(listeners(), 0);
    assert.throws(() => calendar.resume(), error => error === failure); assert.equal(listeners(), 0);
    failUpdate = false; calendar.resume(); failUpdate = true;
    assert.throws(() => calendar.disconnect(), error => error === failure); calendar.resume(); calendar.refresh(); assert.equal(listeners(), 0); assert.equal(calendar.getActive(), false);
  } finally { failUpdate = false; calendar.disconnect(); }
});

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

test('ISSUE-138: unavailable highlighted dates use the grid root as the keyboard entry', () => {
  const root = new FakeElement();
  const blocked = date(2026, 9, 15);
  const available = date(2026, 9, 16);
  const connection = createCalendar({
    root,
    defaultHighlightedValue: blocked,
    policies: { unavailable: (value) => formatDateValue(value) === '2026-09-15' },
  });
  const blockedCell = new FakeElement();
  const availableCell = new FakeElement();
  connection.setCellAttributes(blockedCell, blocked);
  connection.setCellAttributes(availableCell, available);

  assert.deepEqual([root.tabIndex, blockedCell.tabIndex, availableCell.tabIndex], [0, -1, -1]);
  assert.equal(blockedCell.disabled, true);
  connection.focusCurrent();
  assert.equal(root.focusCount, 1);

  assert.equal(connection.handleKeyboardEvent(keyboardEvent('ArrowRight')), true);
  assert.equal(formatDateValue(connection.getSnapshot().state.highlighted), '2026-09-16');
  connection.setCellAttributes(availableCell, available);
  assert.deepEqual([root.tabIndex, availableCell.tabIndex], [-1, 0]);
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
  disabled = false;
  focusCount = 0;
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
  focus() { this.focusCount += 1; }
}

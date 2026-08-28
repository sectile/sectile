import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDateValue } from '@sectile/temporal/date-field';
import { createCalendar, toCalendarEvent } from '../.verification-dist/calendar.js';

test('terminal calendar navigates and selects across month boundaries', () => {
  let updates = 0;
  const connection = createCalendar({
    defaultHighlightedValue: date(2024, 1, 31),
    onUpdate: () => { updates += 1; },
  });
  assert.equal(connection.getMonth().length, 6);
  assert.equal(connection.handleKeyboardInput({ key: 'right' }), true);
  assert.equal(formatDateValue(connection.getSnapshot().state.highlighted), '2024-02-01');
  assert.equal(connection.handleKeyboardInput({ key: 'enter' }), true);
  assert.equal(formatDateValue(connection.getSnapshot().state.value), '2024-02-01');
  assert.equal(updates, 2);
});

test('terminal keys map to calendar units including week edges and shifted years', () => {
  assert.equal(toCalendarEvent({ key: 'left' }), 'previous-day');
  assert.equal(toCalendarEvent({ key: 'down' }), 'next-week');
  assert.equal(toCalendarEvent({ key: 'home' }), 'start-of-week');
  assert.equal(toCalendarEvent({ key: 'end' }), 'end-of-week');
  assert.equal(toCalendarEvent({ key: 'page-up' }), 'previous-month');
  assert.equal(toCalendarEvent({ key: 'page-down', shiftKey: true }), 'next-year');
  assert.equal(toCalendarEvent({ key: 'tab' }), null);
});

test('terminal calendar supports mixed controlled state', () => {
  const values = [];
  const connection = createCalendar({
    value: null,
    defaultHighlightedValue: date(2024, 1, 31),
    onValueChange: (value) => values.push(value === null ? null : formatDateValue(value)),
  });
  connection.handleKeyboardInput({ key: 'right' });
  assert.equal(formatDateValue(connection.getSnapshot().state.highlighted), '2024-02-01');
  connection.handleKeyboardInput({ key: 'enter' });
  assert.equal(connection.getSnapshot().state.value, null);
  assert.deepEqual(values, ['2024-02-01']);
  connection.update({ value: date(2024, 2, 1) });
  assert.equal(formatDateValue(connection.getSnapshot().state.value), '2024-02-01');
});

function date(year, month, day) { return Object.freeze({ year, month, day }); }

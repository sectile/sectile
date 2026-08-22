import test from 'node:test';
import assert from 'node:assert/strict';
import { createDateValue, formatDateValue } from '../../.verification-dist/date-field.js';
import { applyDatePickerEvent, createDatePickerMonth, createDatePickerState } from '../../.verification-dist/date-picker.js';
import { applyDateRangePickerEvent, createDateRangePickerState } from '../../.verification-dist/date-range-picker.js';

const date = (year, month, day) => createDateValue(year, month, day).value;

test('date picker moves by semantic calendar units and selects atomically', () => {
  let state = createDatePickerState({ highlighted: date(2024, 1, 31), open: true }).value;
  state = applyDatePickerEvent(state, 'next-month').value.state;
  assert.equal(formatDateValue(state.highlighted), '2024-02-29');
  const selected = applyDatePickerEvent(state, 'select-highlighted');
  assert.equal(formatDateValue(selected.value.state.value), '2024-02-29');
  assert.equal(selected.value.state.open, false);
  assert.deepEqual(selected.value.commands.map(({ type }) => type), ['value-committed', 'highlight-changed', 'open-changed']);
});

test('date picker month projection is a stable six by seven grid', () => {
  const month = createDatePickerMonth({ year: 2026, month: 8 }).value;
  assert.equal(month.length, 6);
  assert.equal(month.every((row) => row.length === 7), true);
  assert.equal(formatDateValue(month[0][0]), '2026-07-27');
  assert.equal(formatDateValue(month[5][6]), '2026-09-06');
});

test('date picker skips unavailable dates under a bounded scan', () => {
  const state = createDatePickerState({ highlighted: date(2026, 8, 21) }).value;
  const result = applyDatePickerEvent(state, 'next-day', { unavailable: (value) => value.day === 22 || value.day === 23 });
  assert.equal(formatDateValue(result.value.state.highlighted), '2026-08-24');
});

test('range picker keeps an anchor, normalizes direction, then closes', () => {
  let state = createDateRangePickerState({ calendar: { highlighted: date(2026, 8, 22), open: true } }).value;
  state = applyDateRangePickerEvent(state, { type: 'select', value: date(2026, 8, 22) }).value.state;
  assert.equal(formatDateValue(state.anchor), '2026-08-22');
  const completed = applyDateRangePickerEvent(state, { type: 'select', value: date(2026, 8, 18) });
  assert.equal(formatDateValue(completed.value.state.value.start), '2026-08-18');
  assert.equal(formatDateValue(completed.value.state.value.end), '2026-08-22');
  assert.equal(completed.value.state.calendar.open, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createDateValue, formatDateValue } from '../../.verification-dist/date-field.js';
import { createDateTimeValue, formatDateTimeRange, formatDateTimeValue } from '../../.verification-dist/date-time-field.js';
import { applyDatePickerEvent, createDatePickerMonth, createDatePickerState, createDatePickerWeek, createDatePickerYear } from '../../.verification-dist/date-picker.js';
import { applyDateRangePickerEvent, createDateRangePickerState } from '../../.verification-dist/date-range-picker.js';
import { createYearPickerPage } from '../../.verification-dist/year-picker.js';
import { applyDateTimePickerEvent, createDateTimePickerState } from '../../.verification-dist/date-time-picker.js';
import { applyDateTimeRangePickerEvent, createDateTimeRangePickerState } from '../../.verification-dist/date-time-range-picker.js';
import { createTimeValue } from '../../.verification-dist/time-field.js';

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

test('year picker projects a compact page around the active year', () => {
  const page = createYearPickerPage(2026);
  assert.equal(page.ok, true);
  assert.equal(page.value.length, 3);
  assert.deepEqual(page.value.flat().map(({ year }) => year), [
    2020, 2021, 2022, 2023, 2024, 2025,
    2026, 2027, 2028, 2029, 2030, 2031,
  ]);
  assert.equal(createYearPickerPage(2026, 0).ok, false);
});

test('date picker month projection is a stable six by seven grid', () => {
  const month = createDatePickerMonth({ year: 2026, month: 8 }).value;
  assert.equal(month.length, 6);
  assert.equal(month.every((row) => row.length === 7), true);
  assert.equal(formatDateValue(month[0][0]), '2026-07-27');
  assert.equal(formatDateValue(month[5][6]), '2026-09-06');
});

test('date picker exposes week and year projections', () => {
  const week = createDatePickerWeek(date(2026, 8, 22)).value;
  const year = createDatePickerYear(2026).value;
  assert.deepEqual(week.map(formatDateValue), ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23']);
  assert.equal(year.length, 4);
  assert.deepEqual(year.flat(), Array.from({ length: 12 }, (_, index) => ({ year: 2026, month: index + 1 })));
});

test('date picker changes view mode and selects a month without committing a date', () => {
  let state = createDatePickerState({ highlighted: date(2026, 8, 31), viewMode: 'year', open: true }).value;
  const selected = applyDatePickerEvent(state, { type: 'select-month', value: { year: 2026, month: 2 } });
  state = selected.value.state;
  assert.equal(state.viewMode, 'month');
  assert.equal(formatDateValue(state.highlighted), '2026-02-28');
  assert.equal(state.value, null);
  assert.deepEqual(selected.value.commands.map(({ type }) => type), ['highlight-changed', 'view-mode-changed']);
  const week = applyDatePickerEvent(state, { type: 'set-view-mode', value: 'week' });
  assert.equal(week.value.state.viewMode, 'week');
});

test('date picker month selection never escapes an unavailable month', () => {
  const state = createDatePickerState({ highlighted: date(2026, 8, 31), viewMode: 'year' }).value;
  const selected = applyDatePickerEvent(state, { type: 'select-month', value: { year: 2026, month: 2 } }, {
    unavailable: (value) => value.year === 2026 && value.month === 2,
  });
  assert.equal(selected.ok, false);
  assert.equal(selected.error.code, 'date-picker-month-unavailable');
});

test('date picker skips unavailable dates under a bounded scan', () => {
  const state = createDatePickerState({ highlighted: date(2026, 8, 21) }).value;
  const result = applyDatePickerEvent(state, 'next-day', { unavailable: (value) => value.day === 22 || value.day === 23 });
  assert.equal(formatDateValue(result.value.state.highlighted), '2026-08-24');
});

test('range picker keeps an anchor, normalizes direction, and stays open', () => {
  let state = createDateRangePickerState({ calendar: { highlighted: date(2026, 8, 22), open: true } }).value;
  state = applyDateRangePickerEvent(state, { type: 'select', value: date(2026, 8, 22) }).value.state;
  assert.equal(formatDateValue(state.anchor), '2026-08-22');
  const completed = applyDateRangePickerEvent(state, { type: 'select', value: date(2026, 8, 18) });
  assert.equal(formatDateValue(completed.value.state.value.start), '2026-08-18');
  assert.equal(formatDateValue(completed.value.state.value.end), '2026-08-22');
  assert.equal(completed.value.state.calendar.open, true);
  assert.equal(completed.value.commands.some(({ type }) => type === 'open-changed'), false);
});

test('date-time picker combines calendar selection with its wall-clock time', () => {
  let state = createDateTimePickerState({
    value: createDateTimeValue(date(2026, 8, 22), createTimeValue(16, 30).value).value,
    calendar: { open: true },
  }).value;
  state = applyDateTimePickerEvent(state, { type: 'select-date', value: date(2026, 8, 25) }).value.state;
  assert.equal(formatDateTimeValue(state.value), '2026-08-25T16:30');
  assert.equal(state.calendar.open, true);
  state = applyDateTimePickerEvent(state, { type: 'set-time', value: createTimeValue(18, 45).value }).value.state;
  assert.equal(formatDateTimeValue(state.value), '2026-08-25T18:45');
});

test('date-time range picker owns independent endpoint times', () => {
  let state = createDateTimeRangePickerState({
    startTime: createTimeValue(9, 15).value,
    endTime: createTimeValue(17, 45).value,
    calendar: { highlighted: date(2026, 8, 22), open: true },
  }).value;
  state = applyDateTimeRangePickerEvent(state, { type: 'select-date', value: date(2026, 8, 25) }).value.state;
  const completed = applyDateTimeRangePickerEvent(state, { type: 'select-date', value: date(2026, 8, 28) });
  assert.equal(formatDateTimeRange(completed.value.state.value), '2026-08-25T09:15/2026-08-28T17:45');
  assert.equal(completed.value.state.calendar.open, true);
});

test('date-time range picker rejects an inverted same-day time range', () => {
  let state = createDateTimeRangePickerState({
    startTime: createTimeValue(18, 0).value,
    endTime: createTimeValue(9, 0).value,
    calendar: { highlighted: date(2026, 8, 22), open: true },
  }).value;
  state = applyDateTimeRangePickerEvent(state, 'select-highlighted').value.state;
  const rejected = applyDateTimeRangePickerEvent(state, 'select-highlighted');
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'inverted-date-time-range');
});

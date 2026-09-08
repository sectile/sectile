import test from 'node:test';
import assert from 'node:assert/strict';
import { createDateValue, formatDateValue } from '../../.verification-dist/date-field.js';
import { createDateTimeValue, formatDateTimeRange, formatDateTimeValue } from '../../.verification-dist/date-time-field.js';
import { createCalendarMonth, createCalendarWeek, createCalendarYear } from '../../.verification-dist/calendar.js';
import { applyDatePickerEvent, createDatePickerState } from '../../.verification-dist/date-picker.js';
import { applyDateRangePickerEvent, createDateRangePickerState } from '../../.verification-dist/date-range-picker.js';
import { applyMonthPickerEvent, createMonthPickerState, createMonthPickerValue } from '../../.verification-dist/month-picker.js';
import { applyMonthRangePickerEvent, createMonthRangePickerState } from '../../.verification-dist/month-range-picker.js';
import { applyYearPickerEvent, createYearPickerPage, createYearPickerState, createYearPickerValue, tryCreateYearPickerPage, MAX_YEAR_PICKER_PAGE_SIZE } from '../../.verification-dist/year-picker.js';
import { applyYearRangePickerEvent, createYearRangePickerState } from '../../.verification-dist/year-range-picker.js';
import { applyDateTimePickerEvent, createDateTimePickerState } from '../../.verification-dist/date-time-picker.js';
import { applyDateTimeRangePickerEvent, createDateTimeRangePickerState } from '../../.verification-dist/date-time-range-picker.js';
import { createTimeValue } from '../../.verification-dist/time-field.js';

const date = (year, month, day) => createDateValue(year, month, day);

test('date picker moves by semantic calendar units and selects atomically', () => {
  let state = createDatePickerState({ highlighted: date(2024, 1, 31), open: true });
  state = applyDatePickerEvent(state, 'next-month').value.state;
  assert.equal(formatDateValue(state.highlighted), '2024-02-29');
  const selected = applyDatePickerEvent(state, 'select-highlighted');
  assert.equal(formatDateValue(selected.value.state.value), '2024-02-29');
  assert.equal(selected.value.state.open, false);
  assert.deepEqual(selected.value.commands.map(({ type }) => type), ['value-committed', 'highlight-changed', 'open-changed']);
});

test('month and year pickers normalize committed values in Temporal', () => {
  assert.deepEqual(createMonthPickerValue(2026, 9), date(2026, 9, 1));
  let month = createMonthPickerState({ value: date(2026, 8, 15), highlighted: date(2026, 8, 15), open: true });
  assert.equal(formatDateValue(month.value), '2026-08-01');
  const selectedMonth = applyMonthPickerEvent(month, { type: 'select-month', value: { year: 2026, month: 9 } });
  assert.equal(formatDateValue(selectedMonth.value.state.value), '2026-09-01');
  assert.equal(selectedMonth.value.commands.some(({ type }) => type === 'value-committed'), true);

  assert.deepEqual(createYearPickerValue(2026), date(2026, 1, 1));
  let year = createYearPickerState({ value: date(2026, 8, 15), highlighted: date(2026, 8, 15), open: true });
  assert.equal(formatDateValue(year.value), '2026-01-01');
  const selectedYear = applyYearPickerEvent(year, { type: 'select-year', value: { year: 2027 } });
  assert.equal(formatDateValue(selectedYear.value.state.value), '2027-01-01');
  assert.equal(selectedYear.value.commands.some(({ type }) => type === 'value-committed'), true);
});

test('month and year range pickers normalize both committed endpoints', () => {
  let month = createMonthRangePickerState({ calendar: { highlighted: date(2026, 8, 15), open: true } });
  month = applyMonthRangePickerEvent(month, { type: 'select-month', value: { year: 2026, month: 8 } }).value.state;
  const monthRange = applyMonthRangePickerEvent(month, { type: 'select-month', value: { year: 2026, month: 10 } });
  assert.equal(formatDateValue(monthRange.value.state.value.start), '2026-08-01');
  assert.equal(formatDateValue(monthRange.value.state.value.end), '2026-10-01');

  let year = createYearRangePickerState({ calendar: { highlighted: date(2026, 8, 15), open: true } });
  year = applyYearRangePickerEvent(year, { type: 'select-year', value: { year: 2025 } }).value.state;
  const yearRange = applyYearRangePickerEvent(year, { type: 'select-year', value: { year: 2027 } });
  assert.equal(formatDateValue(yearRange.value.state.value.start), '2025-01-01');
  assert.equal(formatDateValue(yearRange.value.state.value.end), '2027-01-01');
});

test('period navigation uses canonical month and year grid strides in scalar and range pickers', () => {
  const directions = ['previous', 'next', 'above', 'below', 'previous-page', 'next-page', 'start', 'end'];
  for (const [unit, create, apply, range] of [
    ['month', createMonthPickerState, applyMonthPickerEvent, false],
    ['year', createYearPickerState, applyYearPickerEvent, false],
    ['month', createMonthRangePickerState, applyMonthRangePickerEvent, true],
    ['year', createYearRangePickerState, applyYearRangePickerEvent, true],
  ]) {
    const expected = unit === 'month'
      ? [[2026, 7], [2026, 9], [2026, 5], [2026, 11], [2025, 8], [2027, 8], [2026, 1], [2026, 12]]
      : [2025, 2027, 2022, 2030, 2014, 2038, 2024, 2027].map((year) => [year, 1]);
    const initial = { highlighted: date(2026, 8, 15), open: true };
    const state = create(range ? { calendar: initial } : initial);
    for (const [index, direction] of directions.entries()) {
      const result = apply(state, { type: 'navigate-period', unit, direction, referenceYear: 2026 });
      assert.equal(result.ok, true, `${unit} ${direction}`);
      const calendar = range ? result.value.state.calendar : result.value.state;
      assert.deepEqual(calendar.highlighted, date(...expected[index], 1));
      assert.equal(calendar.open, true);
      assert.equal(result.value.state.value, null);
    }
  }
});

test('period navigation checks canonical availability within maxScan', () => {
  const state = createMonthPickerState({ highlighted: date(2026, 8, 15) });
  const event = { type: 'navigate-period', unit: 'month', direction: 'next' };
  const next = applyMonthPickerEvent(state, event, { min: date(2026, 9, 15) });
  assert.equal(next.ok, true);
  assert.deepEqual(next.value.state.highlighted, date(2026, 10, 1));
  let calls = 0;
  const exhausted = applyMonthPickerEvent(state, event, { maxScan: 3, unavailable: () => { calls += 1; return true; } });
  assert.equal(exhausted.ok, false);
  assert.equal(exhausted.error.code, 'calendar-scan-exhausted');
  assert.equal(calls, 3);
  assert.deepEqual(state.highlighted, date(2026, 8, 15));
});

test('period navigation validates calendar policies before evaluating candidates', () => {
  for (const [create, apply, range, unit] of [
    [createMonthPickerState, applyMonthPickerEvent, false, 'month'],
    [createYearPickerState, applyYearPickerEvent, false, 'year'],
    [createMonthRangePickerState, applyMonthRangePickerEvent, true, 'month'],
    [createYearRangePickerState, applyYearRangePickerEvent, true, 'year'],
  ]) {
    const initial = { highlighted: date(2026, 8, 15), open: true };
    const state = create(range ? { calendar: initial } : initial);
    const before = structuredClone(state);
    for (const [policies, code] of [
      [{ min: date(2027, 1, 1), max: date(2026, 1, 1) }, 'inverted-calendar-bounds'],
      [{ unavailable: true }, 'invalid-calendar-unavailable-policy'],
      [{ maxScan: 0 }, 'invalid-calendar-max-scan'],
    ]) {
      const result = apply(state, { type: 'navigate-period', unit, direction: 'next' }, policies);
      assert.equal(result.ok, false);
      assert.equal(result.error.code, code);
      assert.deepEqual(state, before);
    }
  }
});

test('period canonical values govern exact and mid-period availability boundaries', () => {
  for (const [create, apply, event, canonical, mid] of [
    [createMonthPickerState, applyMonthPickerEvent, { type: 'select-month', value: { year: 2026, month: 9 } }, date(2026, 9, 1), date(2026, 9, 15)],
    [createYearPickerState, applyYearPickerEvent, { type: 'select-year', value: { year: 2026 } }, date(2026, 1, 1), date(2026, 7, 1)],
  ]) {
    const state = create({ highlighted: date(2026, 8, 15) });
    assert.equal(apply(state, event, { min: mid }).ok, false);
    assert.equal(apply(state, event, { unavailable: (value) => value.day === 1 }).ok, false);
    const accepted = apply(state, event, { min: canonical, max: mid });
    assert.equal(accepted.ok, true);
    assert.deepEqual(accepted.value.state.value, canonical);
  }
});

test('year picker projects a compact page around the active year', () => {
  const page = createYearPickerPage(2026);
  assert.equal(page.length, 3);
  assert.deepEqual(page.flat().map(({ year }) => year), [
    2020, 2021, 2022, 2023, 2024, 2025,
    2026, 2027, 2028, 2029, 2030, 2031,
  ]);
  assert.equal(tryCreateYearPickerPage(2026, 0).ok, false);
});

test('ISSUE-040: year pages reject excessive cardinality before projection allocation', () => {
  const freeze = Object.freeze;
  let projectionFreezes = 0;
  Object.freeze = (value) => {
    if (Array.isArray(value) || (value !== null && typeof value === 'object' && Object.hasOwn(value, 'year'))) {
      projectionFreezes += 1;
      throw new Error('An excessive year page started building projection output.');
    }
    return freeze(value);
  };
  try {
    for (const size of [MAX_YEAR_PICKER_PAGE_SIZE + 1, 1_000_000, Number.MAX_SAFE_INTEGER]) {
      const rejected = tryCreateYearPickerPage(2026, size);
      assert.equal(rejected.ok, false);
      assert.equal(rejected.error.class, 'resource-rejection');
      assert.equal(rejected.error.code, 'year-picker-page-size-exceeded');
    }
    assert.equal(projectionFreezes, 0);
  } finally { Object.freeze = freeze; }
  for (const size of [1, 3, 4, 5, 12, 99, MAX_YEAR_PICKER_PAGE_SIZE]) {
    const result = tryCreateYearPickerPage(2026, size);
    assert.equal(result.ok, true);
    const cells = result.value.flat();
    assert.equal(cells.length, size);
    assert.equal(result.value.length, Math.ceil(size / 4));
    assert.equal(Object.isFrozen(result.value), true);
    assert.equal(result.value.every(Object.isFrozen), true);
    assert.equal(cells.every((value, index) => Object.isFrozen(value) && value.year === 2026 - Math.floor(size / 2) + index), true);
  }
});

test('date picker month projection is a stable six by seven grid', () => {
  const month = createCalendarMonth({ year: 2026, month: 8 });
  assert.equal(month.length, 6);
  assert.equal(month.every((row) => row.length === 7), true);
  assert.equal(formatDateValue(month[0][0]), '2026-07-27');
  assert.equal(formatDateValue(month[5][6]), '2026-09-06');
});

test('date picker exposes week and year projections', () => {
  const week = createCalendarWeek(date(2026, 8, 22));
  const year = createCalendarYear(2026);
  assert.deepEqual(week.map(formatDateValue), ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23']);
  assert.equal(year.length, 4);
  assert.deepEqual(year.flat(), Array.from({ length: 12 }, (_, index) => ({ year: 2026, month: index + 1 })));
});

test('date picker changes view mode and selects a month without committing a date', () => {
  let state = createDatePickerState({ highlighted: date(2026, 8, 31), viewMode: 'year', open: true });
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
  const state = createDatePickerState({ highlighted: date(2026, 8, 31), viewMode: 'year' });
  const selected = applyDatePickerEvent(state, { type: 'select-month', value: { year: 2026, month: 2 } }, {
    unavailable: (value) => value.year === 2026 && value.month === 2,
  });
  assert.equal(selected.ok, false);
  assert.equal(selected.error.code, 'calendar-month-unavailable');
});

test('date picker skips unavailable dates under a bounded scan', () => {
  const state = createDatePickerState({ highlighted: date(2026, 8, 21) });
  const result = applyDatePickerEvent(state, 'next-day', { unavailable: (value) => value.day === 22 || value.day === 23 });
  assert.equal(formatDateValue(result.value.state.highlighted), '2026-08-24');
});

test('range picker keeps an anchor, normalizes direction, and stays open', () => {
  let state = createDateRangePickerState({ calendar: { highlighted: date(2026, 8, 22), open: true } });
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
    value: createDateTimeValue(date(2026, 8, 22), createTimeValue(16, 30)),
    calendar: { open: true },
  });
  state = applyDateTimePickerEvent(state, { type: 'select-date', value: date(2026, 8, 25) }).value.state;
  assert.equal(formatDateTimeValue(state.value), '2026-08-25T16:30');
  assert.equal(state.calendar.open, true);
  state = applyDateTimePickerEvent(state, { type: 'set-time', value: createTimeValue(18, 45) }).value.state;
  assert.equal(formatDateTimeValue(state.value), '2026-08-25T18:45');
});

test('date-time range picker owns independent endpoint times', () => {
  let state = createDateTimeRangePickerState({
    startTime: createTimeValue(9, 15),
    endTime: createTimeValue(17, 45),
    calendar: { highlighted: date(2026, 8, 22), open: true },
  });
  state = applyDateTimeRangePickerEvent(state, { type: 'select-date', value: date(2026, 8, 25) }).value.state;
  const completed = applyDateTimeRangePickerEvent(state, { type: 'select-date', value: date(2026, 8, 28) });
  assert.equal(formatDateTimeRange(completed.value.state.value), '2026-08-25T09:15/2026-08-28T17:45');
  assert.equal(completed.value.state.calendar.open, true);
});

test('date-time range picker rejects an inverted same-day time range', () => {
  let state = createDateTimeRangePickerState({
    startTime: createTimeValue(18, 0),
    endTime: createTimeValue(9, 0),
    calendar: { highlighted: date(2026, 8, 22), open: true },
  });
  state = applyDateTimeRangePickerEvent(state, 'select-highlighted').value.state;
  const rejected = applyDateTimeRangePickerEvent(state, 'select-highlighted');
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'inverted-date-time-range');
});

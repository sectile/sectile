/* Law evidence: TMP-01 TMP-02 TMP-03 TMP-04 TMP-05 TMP-06 TMP-07 TMP-08 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDateDays,
  addDateMonths,
  addDateYears,
  compareDateValues,
  createDateValue,
  differenceInDateDays,
  formatDateValue,
  parseDateValue,
  tryCreateDateValue,
} from '../../.verification-dist/date-field.js';
import {
  applyCalendarEvent,
  createCalendarMonth,
  createCalendarState,
  createCalendarWeek,
  tryCreateCalendarState,
} from '../../.verification-dist/calendar.js';

const date = (year, month, day) => createDateValue(year, month, day);

test('TMP-01: canonical ISO date formatting and parsing are inverse', () => {
  for (let year = 1; year <= 9_999; year += 137) {
    for (let month = 1; month <= 12; month += 1) {
      const value = date(year, month, 1 + ((year + month) % 27));
      assert.deepEqual(parseDateValue(formatDateValue(value)).value, value);
    }
  }
});

test('TMP-02: day addition and signed difference are inverse inside the domain', () => {
  const starts = [date(1, 1, 1), date(1900, 2, 28), date(2000, 2, 29), date(9998, 12, 31)];
  for (const start of starts) {
    for (const delta of [-365, -31, -1, 0, 1, 31, 365]) {
      const moved = addDateDays(start, delta);
      if (!moved.ok) continue;
      assert.equal(differenceInDateDays(moved.value, start), delta);
      assert.deepEqual(addDateDays(moved.value, -delta).value, start);
    }
  }
});

test('TMP-03: month and year changes use explicit end-of-month clamping', () => {
  assert.deepEqual(addDateMonths(date(2024, 1, 31), 1).value, date(2024, 2, 29));
  assert.deepEqual(addDateMonths(date(2023, 1, 31), 1).value, date(2023, 2, 28));
  assert.deepEqual(addDateYears(date(2024, 2, 29), 1).value, date(2025, 2, 28));
});

test('TMP-04: Gregorian century leap rules are exact', () => {
  assert.equal(tryCreateDateValue(1900, 2, 29).ok, false);
  assert.equal(tryCreateDateValue(2000, 2, 29).ok, true);
  assert.equal(tryCreateDateValue(2100, 2, 29).ok, false);
  assert.equal(tryCreateDateValue(2400, 2, 29).ok, true);
});

test('TMP-05: week and month projections have fixed contiguous cardinality', () => {
  const highlight = date(2026, 8, 26);
  const week = createCalendarWeek(highlight, 1);
  const month = createCalendarMonth({ year: 2026, month: 8 }, 1).flat();
  assert.equal(week.length, 7);
  assert.equal(month.length, 42);
  for (const values of [week, month]) {
    for (let index = 1; index < values.length; index += 1) {
      assert.equal(differenceInDateDays(values[index], values[index - 1]), 1);
    }
  }
});

test('TMP-06: empty calendars require an injected reference date', () => {
  const missing = tryCreateCalendarState();
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'calendar-reference-date-required');
  const referenceDate = date(2026, 8, 26);
  const state = createCalendarState({ referenceDate });
  assert.equal(compareDateValues(state.highlighted, referenceDate), 0);
  assert.deepEqual(state.view, { year: 2026, month: 8 });
});

test('calendar canonicalizes mutable value inputs before storing them', () => {
  const input = { year: 2024, month: 2, day: 29 };
  const state = createCalendarState({ value: input });
  input.year = 2023;

  assert.deepEqual(state.value, { year: 2024, month: 2, day: 29 });
  assert.deepEqual(state.highlighted, state.value);
  assert.equal(Object.isFrozen(state.value), true);
  assert.equal(Object.isFrozen(state.highlighted), true);
  assert.notEqual(state.value, input);
});

test('TMP-07: unavailable scans stop at the declared ceiling', () => {
  const state = createCalendarState({ referenceDate: date(2026, 8, 26) });
  const moved = applyCalendarEvent(state, 'next-day', {
    unavailable: () => true,
    maxScan: 4,
  });
  assert.equal(moved.ok, false);
  assert.equal(moved.error.code, 'calendar-scan-exhausted');
});

test('TMP-08: supported year boundaries reject overflow without mutation', () => {
  const below = addDateDays(date(1, 1, 1), -1);
  const above = addDateDays(date(9_999, 12, 31), 1);
  assert.equal(below.ok, false);
  assert.equal(above.ok, false);
  assert.equal(below.error.code, 'date-outside-supported-range');
  assert.equal(above.error.code, 'date-outside-supported-range');
});

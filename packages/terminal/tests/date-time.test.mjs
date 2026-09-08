import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimeValue, formatTimeValue } from '@sectile/temporal/time-field';
import { createDateRange, createDateValue, formatDateValue } from '@sectile/temporal/date-field';
import { createDateTimeRange, createDateTimeValue, formatDateTimeRange, formatDateTimeValue } from '@sectile/temporal/date-time-field';
import { createTimeField } from '../.verification-dist/time-field.js';
import { createTimeRangeField } from '../.verification-dist/time-range-field.js';
import { createDateTimeField } from '../.verification-dist/date-time-field.js';
import { createDatePicker } from '../.verification-dist/date-picker.js';
import { createMonthPicker } from '../.verification-dist/month-picker.js';
import { createYearPicker } from '../.verification-dist/year-picker.js';
import { createDateRangePicker } from '../.verification-dist/date-range-picker.js';
import { createMonthRangePicker } from '../.verification-dist/month-range-picker.js';
import { createYearRangePicker } from '../.verification-dist/year-range-picker.js';
import { createDateRangeField } from '../.verification-dist/date-range-field.js';
import { createDateTimePicker } from '../.verification-dist/date-time-picker.js';
import { createDateTimeRangePicker } from '../.verification-dist/date-time-range-picker.js';

test('terminal time field maps vertical keys to the active segment', () => {
  const field = createTimeField({ defaultValue: createTimeValue(10, 30), policies: { step: { minute: 15 } } });
  field.handleKeyboardInput({ key: 'home' });
  field.handleKeyboardInput({ key: 'right' });
  field.handleKeyboardInput({ key: 'right' });
  field.handleKeyboardInput({ key: 'right' });
  field.handleKeyboardInput({ key: 'up' });
  assert.equal(formatTimeValue(field.getValue()), '10:45');
});

test('terminal date range field switches endpoints and commits a complete range', () => {
  const field = createDateRangeField();
  field.handleEvent({ type: 'field', endpoint: 'start', event: { type: 'set-value', value: createDateValue(2026, 8, 22) } });
  assert.equal(field.getValue(), null);
  field.handleKeyboardInput({ key: 'tab' });
  field.handleEvent({ type: 'field', endpoint: 'end', event: { type: 'set-value', value: createDateValue(2026, 8, 28) } });
  assert.equal(formatDateValue(field.getValue().start), '2026-08-22');
  assert.equal(formatDateValue(field.getValue().end), '2026-08-28');
  assert.equal(field.getSnapshot().state.active, 'end');
});

test('terminal time range field switches endpoints and commits a complete range', () => {
  const field = createTimeRangeField();
  field.handleEvent({ type: 'field', endpoint: 'start', event: { type: 'set-value', value: createTimeValue(9, 30) } });
  field.handleKeyboardInput({ key: 'tab' });
  field.handleEvent({ type: 'field', endpoint: 'end', event: { type: 'set-value', value: createTimeValue(17, 45) } });
  assert.equal(formatTimeValue(field.getValue().start), '09:30');
  assert.equal(formatTimeValue(field.getValue().end), '17:45');
});

test('terminal date-time field carries time segments across civil day boundaries', () => {
  const field = createDateTimeField({
    defaultValue: createDateTimeValue(
      createDateValue(2024, 1, 31),
      createTimeValue(23, 45),
    ),
    policies: { step: { minute: 30 } },
  });
  field.handleKeyboardInput({ key: 'home' });
  for (let index = 0; index < 14; index += 1) field.handleKeyboardInput({ key: 'right' });
  field.handleKeyboardInput({ key: 'up' });
  assert.equal(formatDateTimeValue(field.getValue()), '2024-02-01T00:15');
});

test('terminal date picker projects supported boundary months without throwing', () => {
  for (const [value, weekStartsOn] of [[createDateValue(1, 1, 1), 7], [createDateValue(9_999, 12, 31), 1]]) {
    const picker = createDatePicker({ defaultValue: value, defaultHighlightedValue: value, defaultOpen: true, policies: { weekStartsOn } });
    const month = picker.getMonth().flat();
    assert.equal(month.length, 42);
    assert.equal(month.some((cell) => cell.year === value.year && cell.month === value.month && cell.day === value.day), true);
    assert.equal(month.some((cell) => cell.outsideSupportedRange === true), true);
  }
});

test('terminal period picker keyboards navigate cells and commit canonical values', () => {
  for (const [create, unit, range] of [
    [createMonthPicker, 'month', false], [createYearPicker, 'year', false],
    [createMonthRangePicker, 'month', true], [createYearRangePicker, 'year', true],
  ]) {
    const changes = [];
    const picker = create({ defaultHighlightedValue: createDateValue(2026, 8, 15), defaultOpen: true, onValueChange: (value) => changes.push(value) });
    assert.equal(picker.handleKeyboardInput({ key: 'right' }), true);
    let snapshot = picker.getSnapshot().state;
    const next = unit === 'month' ? createDateValue(2026, 9, 1) : createDateValue(2027, 1, 1);
    assert.deepEqual((range ? snapshot.calendar : snapshot).highlighted, next);
    assert.equal(picker.handleKeyboardInput({ key: 'enter' }), true);
    if (range) assert.equal(picker.handleKeyboardInput({ key: 'space' }), true);
    assert.deepEqual(changes.at(-1), range ? { start: next, end: next } : next);
    assert.equal(picker.handleKeyboardInput({ key: 'down' }), true);
    snapshot = picker.getSnapshot().state;
    assert.deepEqual((range ? snapshot.calendar : snapshot).highlighted, unit === 'month' ? createDateValue(2026, 12, 1) : createDateValue(2031, 1, 1));
  }
});

test('terminal month and year picker hosts publish Temporal-normalized values', () => {
  const monthChanges = [];
  const month = createMonthPicker({ defaultValue: createDateValue(2026, 8, 15), onValueChange: (value) => monthChanges.push(value) });
  assert.equal(formatDateValue(month.getSnapshot().state.value), '2026-08-01');
  assert.equal(month.handleEvent({ type: 'select-month', value: { year: 2026, month: 9 } }), true);
  assert.equal(formatDateValue(month.getSnapshot().state.value), '2026-09-01');
  assert.deepEqual(monthChanges.map(formatDateValue), ['2026-09-01']);

  const yearChanges = [];
  const year = createYearPicker({ defaultValue: createDateValue(2026, 8, 15), onValueChange: (value) => yearChanges.push(value) });
  assert.equal(formatDateValue(year.getSnapshot().state.value), '2026-01-01');
  assert.equal(year.handleEvent({ type: 'select', value: createDateValue(2027, 8, 15) }), true);
  assert.equal(formatDateValue(year.getSnapshot().state.value), '2027-01-01');
  assert.deepEqual(yearChanges.map(formatDateValue), ['2027-01-01']);
});

test('terminal month and year range picker hosts publish normalized endpoint ranges', () => {
  const month = createMonthRangePicker({ defaultHighlightedValue: createDateValue(2026, 8, 15) });
  assert.equal(month.handleEvent({ type: 'select-month', value: { year: 2026, month: 8 } }), true);
  assert.equal(month.handleEvent({ type: 'select-month', value: { year: 2026, month: 10 } }), true);
  assert.equal(formatDateValue(month.getSnapshot().state.value.start), '2026-08-01');
  assert.equal(formatDateValue(month.getSnapshot().state.value.end), '2026-10-01');

  const year = createYearRangePicker({ defaultHighlightedValue: createDateValue(2026, 8, 15) });
  assert.equal(year.handleEvent({ type: 'select', value: createDateValue(2025, 8, 15) }), true);
  assert.equal(year.handleEvent({ type: 'select', value: createDateValue(2027, 8, 15) }), true);
  assert.equal(formatDateValue(year.getSnapshot().state.value.start), '2025-01-01');
  assert.equal(formatDateValue(year.getSnapshot().state.value.end), '2027-01-01');
});

test('terminal controlled range picker exposes highlight changes and stays open after commit', () => {
  const initialHighlight = createDateValue(2026, 8, 22);
  let value = createDateRange(
    createDateValue(2026, 8, 18),
    initialHighlight,
  );
  let highlightedValue = initialHighlight;
  let open = true;
  const picker = createDateRangePicker({
    value,
    highlightedValue,
    open,
    onValueChange: (next) => { value = next; },
    onHighlightedValueChange: (next) => { highlightedValue = next; },
    onOpenChange: (next) => { open = next; },
  });

  picker.handleEvent({ type: 'select', value: createDateValue(2026, 8, 25) });
  picker.syncControlledValues({ value, highlightedValue, open });
  picker.handleEvent({ type: 'select', value: createDateValue(2026, 8, 28) });
  picker.syncControlledValues({ value, highlightedValue, open });

  assert.equal(formatDateValue(picker.getSnapshot().state.value.start), '2026-08-25');
  assert.equal(formatDateValue(picker.getSnapshot().state.value.end), '2026-08-28');
  assert.equal(formatDateValue(picker.getSnapshot().state.calendar.highlighted), '2026-08-28');
  assert.equal(picker.getSnapshot().state.calendar.open, true);
  assert.equal(open, true);
});

test('terminal date-time picker composes calendar and wall-clock selection', () => {
  const picker = createDateTimePicker({
    defaultValue: createDateTimeValue(
      createDateValue(2026, 8, 22),
      createTimeValue(16, 30),
    ),
    defaultOpen: true,
  });
  picker.handleEvent({ type: 'select-date', value: createDateValue(2026, 8, 25) });
  picker.handleEvent({ type: 'set-time', value: createTimeValue(18, 45) });
  picker.handleKeyboardInput({ key: 'up', altKey: true });
  assert.equal(formatDateTimeValue(picker.getSnapshot().state.value), '2026-08-25T18:46');
});

test('terminal date-time range picker updates independent endpoint times', () => {
  const picker = createDateTimeRangePicker({
    defaultValue: createDateTimeRange(
      createDateTimeValue(createDateValue(2026, 8, 25), createTimeValue(9, 0)),
      createDateTimeValue(createDateValue(2026, 8, 28), createTimeValue(17, 0)),
    ),
    defaultOpen: true,
  });
  picker.handleEvent({ type: 'set-start-time', value: createTimeValue(10, 15) });
  picker.handleEvent({ type: 'set-end-time', value: createTimeValue(18, 45) });
  picker.handleKeyboardInput({ key: 'up', altKey: true, shiftKey: true });
  assert.equal(
    formatDateTimeRange(picker.getSnapshot().state.value),
    '2026-08-25T10:15/2026-08-28T18:46',
  );
});

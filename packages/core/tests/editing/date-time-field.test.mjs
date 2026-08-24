import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDateDays,
  addDateMonths,
  applyDateFieldEvent,
  createDateFieldState,
  createDateRange,
  createDateValue,
  dateDayOfWeek,
  formatDateValue,
  parseDateValue,
  tryCreateDateRange,
  tryCreateDateValue,
} from '../../.verification-dist/date-field.js';
import {
  addTimeMilliseconds,
  applyTimeFieldEvent,
  createTimeFieldState,
  createTimeValue,
  formatTimeValue,
  parseTimeValue,
} from '../../.verification-dist/time-field.js';
import {
  addDateTimeMilliseconds,
  applyDateTimeFieldEvent,
  createDateTimeFieldState,
  createDateTimeValue,
  dateTimeSegmentAt,
  formatDateTimeValue,
  parseDateTimeValue,
} from '../../.verification-dist/date-time-field.js';

const date = (year, month, day) => createDateValue(year, month, day);
const time = (hour, minute, second = 0, millisecond = 0) => createTimeValue(hour, minute, second, millisecond);
const dateTime = (year, month, day, hour, minute, second = 0, millisecond = 0) =>
  createDateTimeValue(date(year, month, day), time(hour, minute, second, millisecond));

test('date values are strict Gregorian calendar values without host time', () => {
  assert.equal(formatDateValue(createDateValue(2024, 2, 29)), '2024-02-29');
  assert.equal(tryCreateDateValue(2023, 2, 29).error.code, 'invalid-date-day');
  assert.equal(parseDateValue('2026-08-22').ok, true);
  assert.equal(parseDateValue('2026-8-22').error.code, 'invalid-date-format');
  assert.equal(formatDateValue(date(2026, 8, 22)), '2026-08-22');
  assert.equal(dateDayOfWeek(date(1970, 1, 1)), 4);
});

test('date arithmetic clamps month fields and crosses calendar boundaries exactly', () => {
  assert.equal(formatDateValue(addDateMonths(date(2024, 1, 31), 1).value), '2024-02-29');
  assert.equal(formatDateValue(addDateDays(date(2024, 2, 28), 2).value), '2024-03-01');
  assert.equal(formatDateValue(addDateDays(date(2024, 3, 1), -2).value), '2024-02-28');
  assert.equal(tryCreateDateRange(date(2026, 8, 22), date(2026, 8, 21)).error.code, 'inverted-date-range');
});

test('date field preserves drafts, commits atomically, and adjusts the active segment', () => {
  let state = createDateFieldState(date(2024, 1, 31));
  state = applyDateFieldEvent(state, {
    type: 'text',
    event: { type: 'replace', startCodeUnitOffset: 5, endCodeUnitOffset: 7, text: '02', selection: { anchorCodeUnitOffset: 7, focusCodeUnitOffset: 7 } },
  }).value.state;
  assert.equal(state.value.month, 1);
  assert.equal(applyDateFieldEvent(state, 'commit').error.code, 'invalid-date-day');

  state = createDateFieldState(date(2024, 1, 31), createDateFieldState(date(2024, 1, 31)).inputState);
  state = applyDateFieldEvent(state, { type: 'text', event: { type: 'replace', startCodeUnitOffset: 5, endCodeUnitOffset: 5, text: '', selection: { anchorCodeUnitOffset: 5, focusCodeUnitOffset: 5 } } }).value.state;
  const incremented = applyDateFieldEvent(state, 'increment-segment');
  assert.equal(formatDateValue(incremented.value.state.value), '2024-02-29');
  assert.deepEqual(incremented.value.state.inputState.snapshot.selection, {
    anchorCodeUnitOffset: 5,
    direction: 'forward',
    endCodeUnitOffset: 7,
    focusCodeUnitOffset: 7,
    startCodeUnitOffset: 5,
  });

  const oversized = applyDateFieldEvent(state, {
    type: 'text',
    event: { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: 10, text: '2024-01-311', selection: { anchorCodeUnitOffset: 11, focusCodeUnitOffset: 11 } },
  });
  assert.equal(oversized.error.code, 'date-field-draft-too-long');

  const invalidDraft = applyDateFieldEvent(state, {
    type: 'text',
    event: { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: state.inputState.snapshot.text.length, text: '2024-34-31', selection: { anchorCodeUnitOffset: 7, focusCodeUnitOffset: 7 } },
  }).value.state;
  const recoveredStep = applyDateFieldEvent(invalidDraft, 'increment-segment');
  assert.equal(formatDateValue(recoveredStep.value.state.value), '2024-02-29');
  assert.equal(recoveredStep.value.state.inputState.snapshot.text, '2024-02-29');
  assert.equal(formatDateValue(invalidDraft.value), '2024-01-31');
});

test('time values use a 24-hour wall clock and wrap inside one day', () => {
  assert.equal(formatTimeValue(time(9, 5)), '09:05');
  assert.equal(formatTimeValue(time(9, 5, 7, 25)), '09:05:07.025');
  assert.equal(parseTimeValue('24:00').error.code, 'invalid-time-hour');
  assert.equal(formatTimeValue(addTimeMilliseconds(time(23, 59, 59, 999), 1).value), '00:00');
});

test('time field commits, bounds, and adjusts its caret segment', () => {
  let state = createTimeFieldState(time(10, 30));
  state = applyTimeFieldEvent(state, { type: 'text', event: { type: 'replace', startCodeUnitOffset: 3, endCodeUnitOffset: 3, text: '', selection: { anchorCodeUnitOffset: 3, focusCodeUnitOffset: 3 } } }).value.state;
  const next = applyTimeFieldEvent(state, 'increment-segment', { step: { minute: 15 } });
  assert.equal(formatTimeValue(next.value.state.value), '10:45');
  assert.equal(applyTimeFieldEvent(next.value.state, { type: 'set-value', value: time(8, 0) }, { min: time(9, 0) }).error.code, 'time-field-value-below-minimum');

  const oversized = applyTimeFieldEvent(state, {
    type: 'text',
    event: { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: 5, text: '10:30:00.0000', selection: { anchorCodeUnitOffset: 13, focusCodeUnitOffset: 13 } },
  });
  assert.equal(oversized.error.code, 'time-field-draft-too-long');

  const invalidDraft = applyTimeFieldEvent(state, {
    type: 'text',
    event: { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: state.inputState.snapshot.text.length, text: '34:30', selection: { anchorCodeUnitOffset: 2, focusCodeUnitOffset: 2 } },
  }).value.state;
  const recoveredStep = applyTimeFieldEvent(invalidDraft, 'increment-segment');
  assert.equal(formatTimeValue(recoveredStep.value.state.value), '11:30');
  assert.equal(recoveredStep.value.state.inputState.snapshot.text, '11:30');
  assert.equal(formatTimeValue(invalidDraft.value), '10:30');
});

test('date-time values remain timezone-free and use a strict ISO-like separator', () => {
  const value = dateTime(2026, 8, 22, 16, 3);
  assert.equal(formatDateTimeValue(value), '2026-08-22T16:03');
  assert.deepEqual(parseDateTimeValue('2026-08-22T16:03').value, value);
  assert.equal(parseDateTimeValue('2026-08-22 16:03').error.code, 'invalid-date-time-format');
  assert.equal(parseDateTimeValue('2026-02-30T16:03').error.code, 'invalid-date-day');
});

test('date-time arithmetic carries wall-clock changes across civil day boundaries', () => {
  const forward = addDateTimeMilliseconds(dateTime(2024, 2, 28, 23, 59, 59, 999), 1);
  assert.equal(formatDateTimeValue(forward.value), '2024-02-29T00:00');

  const backward = addDateTimeMilliseconds(dateTime(2024, 3, 1, 0, 0), -1);
  assert.equal(formatDateTimeValue(backward.value), '2024-02-29T23:59:59.999');
});

test('date-time field steps the active segment and recovers invalid drafts atomically', () => {
  let state = createDateTimeFieldState(dateTime(2024, 1, 31, 23, 45));
  state = applyDateTimeFieldEvent(state, {
    type: 'text',
    event: {
      type: 'replace',
      startCodeUnitOffset: 14,
      endCodeUnitOffset: 14,
      text: '',
      selection: { anchorCodeUnitOffset: 14, focusCodeUnitOffset: 14 },
    },
  }).value.state;
  const next = applyDateTimeFieldEvent(state, 'increment-segment', { step: { minute: 30 } });
  assert.equal(formatDateTimeValue(next.value.state.value), '2024-02-01T00:15');
  assert.equal(dateTimeSegmentAt(14), 'minute');
  assert.deepEqual(next.value.state.inputState.snapshot.selection, {
    anchorCodeUnitOffset: 14,
    direction: 'forward',
    endCodeUnitOffset: 16,
    focusCodeUnitOffset: 16,
    startCodeUnitOffset: 14,
  });

  const invalidDraft = applyDateTimeFieldEvent(next.value.state, {
    type: 'text',
    event: {
      type: 'replace',
      startCodeUnitOffset: 0,
      endCodeUnitOffset: next.value.state.inputState.snapshot.text.length,
      text: '2024-34-01T00:15',
      selection: { anchorCodeUnitOffset: 7, focusCodeUnitOffset: 7 },
    },
  }).value.state;
  const recovered = applyDateTimeFieldEvent(invalidDraft, 'increment-segment');
  assert.equal(formatDateTimeValue(recovered.value.state.value), '2024-03-01T00:15');
  assert.equal(recovered.value.state.inputState.snapshot.text, '2024-03-01T00:15');
  assert.equal(formatDateTimeValue(invalidDraft.value), '2024-02-01T00:15');
});

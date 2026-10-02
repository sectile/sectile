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
} from '../../.verification-dist/fields/date.js';
import {
  addTimeMilliseconds,
  applyTimeFieldEvent,
  createTimeFieldState,
  createTimeValue,
  formatTimeValue,
  parseTimeValue,
} from '../../.verification-dist/fields/time.js';
import {
  addDateTimeMilliseconds,
  applyDateTimeFieldEvent,
  createDateTimeFieldState,
  createDateTimeValue,
  dateTimeSegmentAt,
  formatDateTimeValue,
  parseDateTimeValue,
} from '../../.verification-dist/fields/date-time.js';

const date = (year, month, day) => createDateValue(year, month, day);
const time = (hour, minute, second = 0, millisecond = 0) => createTimeValue(hour, minute, second, millisecond);

test('time formatting captures extended fields once and preserves all formats', () => {
  for (const [second, millisecond, expected] of [
    [0, 0, '03:25'], [45, 0, '03:25:45'], [0, 7, '03:25:00.007'], [45, 678, '03:25:45.678'],
  ]) {
    let secondReads = 0;
    let millisecondReads = 0;
    assert.equal(formatTimeValue({ hour: 3, minute: 25,
      get second() { secondReads += 1; return secondReads === 1 ? second : 59; },
      get millisecond() { millisecondReads += 1; return millisecondReads === 1 ? millisecond : 999; },
    }), expected);
    assert.equal(secondReads, 1);
    assert.equal(millisecondReads, 1);
  }
});

test('wall-clock deltas and segment steps are exact at safe-integer limits', () => {
  const value = time(3, 25, 45, 678);
  const day = 86_400_000n;
  const start = 12_345_678n;
  for (const amount of [Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, 1, -1]) {
    const result = addTimeMilliseconds(value, amount);
    assert.equal(result.ok, true);
    const expected = Number(((start + BigInt(amount)) % day + day) % day);
    const actual = result.value;
    assert.equal(((actual.hour * 60 + actual.minute) * 60 + actual.second) * 1000 + actual.millisecond, expected);
  }
  for (const [segment, offset, unit] of [['hour', 0, 3_600_000], ['minute', 3, 60_000], ['second', 6, 1000], ['millisecond', 9, 1]]) {
    let state = createTimeFieldState(value);
    const selected = applyTimeFieldEvent(state, { type: 'text', event: {
      type: 'replace', startCodeUnitOffset: offset, endCodeUnitOffset: offset, text: '',
      selection: { anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset },
    } });
    assert.equal(selected.ok, true);
    state = selected.value.state;
    const result = applyTimeFieldEvent(state, 'increment-segment', { step: { [segment]: Number.MAX_SAFE_INTEGER } });
    assert.equal(result.ok, true);
    const expected = Number((start + BigInt(unit) * BigInt(Number.MAX_SAFE_INTEGER)) % day);
    const actual = result.value.state.value;
    assert.equal(((actual.hour * 60 + actual.minute) * 60 + actual.second) * 1000 + actual.millisecond, expected);
  }
});
test('field bounds enforce the validated capture for all three temporal fields', () => {
  const configurations = [
    [createDateFieldState, applyDateFieldEvent, date(2024, 6, 1), date(2024, 5, 1), date(2024, 7, 1), 'year'],
    [createTimeFieldState, applyTimeFieldEvent, time(12, 0), time(11, 0), time(13, 0), 'hour'],
    [createDateTimeFieldState, applyDateTimeFieldEvent,
      createDateTimeValue(date(2024, 6, 1), time(12, 0)),
      createDateTimeValue(date(2024, 5, 1), time(12, 0)),
      createDateTimeValue(date(2024, 7, 1), time(12, 0)), 'date'],
  ];
  for (const [create, apply, value, minimum, maximum, key] of configurations) {
    let minReads = 0;
    let maxReads = 0;
    let componentReads = 0;
    const min = { ...minimum, get [key]() { componentReads += 1; return componentReads === 1 ? minimum[key] : undefined; } };
    const result = apply(create(value), { type: 'set-value', value }, {
      get min() { minReads += 1; return minReads === 1 ? min : maximum; },
      get max() { maxReads += 1; return maxReads === 1 ? maximum : minimum; },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.value.state.value, value);
    assert.equal(minReads, 1);
    assert.equal(maxReads, 1);
    assert.equal(componentReads, 1);
  }
});

const dateTime = (year, month, day, hour, minute, second = 0, millisecond = 0) =>
  createDateTimeValue(date(year, month, day), time(hour, minute, second, millisecond));

test('date-time stepping consumes a validated step getter only once', () => {
  const state = createDateTimeFieldState(dateTime(2024, 6, 1, 12, 0));
  let reads = 0;
  const step = { get minute() { reads += 1; return reads === 1 ? 2 : NaN; } };
  const selected = applyDateTimeFieldEvent(state, { type: 'text', event: {
    type: 'replace', startCodeUnitOffset: 14, endCodeUnitOffset: 14, text: '',
    selection: { anchorCodeUnitOffset: 14, focusCodeUnitOffset: 14 },
  } });
  assert.equal(selected.ok, true);
  const result = applyDateTimeFieldEvent(selected.value.state, 'increment-segment', { step });
  assert.equal(result.ok, true);
  assert.equal(result.value.state.value.time.minute, 2);
  assert.equal(reads, 1);
  const rejected = applyDateTimeFieldEvent(state, 'increment-segment', { step: { minute: NaN } });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'invalid-date-time-field-step');
});

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

test('time field keeps active optional segments represented while repeated adjustment crosses zero', () => {
  let seconds = createTimeFieldState(time(10, 30, 1));
  seconds = applyTimeFieldEvent(seconds, {
    type: 'text',
    event: { type: 'replace', startCodeUnitOffset: 6, endCodeUnitOffset: 6, text: '', selection: { anchorCodeUnitOffset: 6, focusCodeUnitOffset: 6 } },
  }).value.state;
  const secondZero = applyTimeFieldEvent(seconds, 'decrement-segment');
  assert.equal(formatTimeValue(secondZero.value.state.value), '10:30');
  assert.equal(secondZero.value.state.inputState.snapshot.text, '10:30:00');
  assert.equal(secondZero.value.state.inputState.snapshot.selection.startCodeUnitOffset, 6);
  assert.equal(secondZero.value.state.inputState.snapshot.selection.focusCodeUnitOffset, 8);
  const secondPrevious = applyTimeFieldEvent(secondZero.value.state, 'decrement-segment');
  assert.equal(formatTimeValue(secondPrevious.value.state.value), '10:29:59');

  let secondForward = createTimeFieldState(time(10, 30, 59));
  secondForward = applyTimeFieldEvent(secondForward, {
    type: 'text',
    event: { type: 'replace', startCodeUnitOffset: 6, endCodeUnitOffset: 6, text: '', selection: { anchorCodeUnitOffset: 6, focusCodeUnitOffset: 6 } },
  }).value.state;
  const nextMinute = applyTimeFieldEvent(secondForward, 'increment-segment');
  assert.equal(nextMinute.value.state.inputState.snapshot.text, '10:31:00');
  assert.equal(formatTimeValue(applyTimeFieldEvent(nextMinute.value.state, 'increment-segment').value.state.value), '10:31:01');

  let milliseconds = createTimeFieldState(time(10, 30, 1, 1));
  milliseconds = applyTimeFieldEvent(milliseconds, {
    type: 'text',
    event: { type: 'replace', startCodeUnitOffset: 9, endCodeUnitOffset: 9, text: '', selection: { anchorCodeUnitOffset: 9, focusCodeUnitOffset: 9 } },
  }).value.state;
  const millisecondZero = applyTimeFieldEvent(milliseconds, 'decrement-segment');
  assert.equal(millisecondZero.value.state.inputState.snapshot.text, '10:30:01.000');
  assert.equal(millisecondZero.value.state.inputState.snapshot.selection.startCodeUnitOffset, 9);
  assert.equal(millisecondZero.value.state.inputState.snapshot.selection.focusCodeUnitOffset, 12);
  assert.equal(formatTimeValue(applyTimeFieldEvent(millisecondZero.value.state, 'decrement-segment').value.state.value), '10:30:00.999');

  let millisecondForward = createTimeFieldState(time(10, 30, 1, 999));
  millisecondForward = applyTimeFieldEvent(millisecondForward, {
    type: 'text',
    event: { type: 'replace', startCodeUnitOffset: 9, endCodeUnitOffset: 9, text: '', selection: { anchorCodeUnitOffset: 9, focusCodeUnitOffset: 9 } },
  }).value.state;
  const nextSecond = applyTimeFieldEvent(millisecondForward, 'increment-segment');
  assert.equal(nextSecond.value.state.inputState.snapshot.text, '10:30:02.000');
  assert.equal(formatTimeValue(applyTimeFieldEvent(nextSecond.value.state, 'increment-segment').value.state.value), '10:30:02.001');

  assert.equal(formatTimeValue(time(10, 30)), '10:30');
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

test('date-time field preserves active seconds and milliseconds through zero and civil day carry', () => {
  let seconds = createDateTimeFieldState(dateTime(2024, 1, 31, 23, 59, 59));
  seconds = applyDateTimeFieldEvent(seconds, {
    type: 'text',
    event: {
      type: 'replace',
      startCodeUnitOffset: 17,
      endCodeUnitOffset: 17,
      text: '',
      selection: { anchorCodeUnitOffset: 17, focusCodeUnitOffset: 17 },
    },
  }).value.state;
  const nextDay = applyDateTimeFieldEvent(seconds, 'increment-segment');
  assert.equal(formatDateTimeValue(nextDay.value.state.value), '2024-02-01T00:00');
  assert.equal(nextDay.value.state.inputState.snapshot.text, '2024-02-01T00:00:00');
  assert.equal(nextDay.value.state.inputState.snapshot.selection.startCodeUnitOffset, 17);
  assert.equal(nextDay.value.state.inputState.snapshot.selection.focusCodeUnitOffset, 19);
  assert.equal(
    formatDateTimeValue(applyDateTimeFieldEvent(nextDay.value.state, 'increment-segment').value.state.value),
    '2024-02-01T00:00:01',
  );

  let milliseconds = createDateTimeFieldState(dateTime(2024, 1, 31, 23, 59, 59, 999));
  milliseconds = applyDateTimeFieldEvent(milliseconds, {
    type: 'text',
    event: {
      type: 'replace',
      startCodeUnitOffset: 20,
      endCodeUnitOffset: 20,
      text: '',
      selection: { anchorCodeUnitOffset: 20, focusCodeUnitOffset: 20 },
    },
  }).value.state;
  const midnight = applyDateTimeFieldEvent(milliseconds, 'increment-segment');
  assert.equal(midnight.value.state.inputState.snapshot.text, '2024-02-01T00:00:00.000');
  assert.equal(midnight.value.state.inputState.snapshot.selection.startCodeUnitOffset, 20);
  assert.equal(midnight.value.state.inputState.snapshot.selection.focusCodeUnitOffset, 23);
  assert.equal(
    formatDateTimeValue(applyDateTimeFieldEvent(midnight.value.state, 'increment-segment').value.state.value),
    '2024-02-01T00:00:00.001',
  );
});

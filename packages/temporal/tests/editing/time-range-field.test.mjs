import assert from 'node:assert/strict';
import test from 'node:test';
import { applyTimeRangeFieldEvent, createTimeRangeFieldState, reformatTimeRangeFieldState } from '../../.verification-dist/fields/time-range.js';
import { createTimeValue, createTimeFieldFormat, formatTimeValue } from '../../.verification-dist/fields/time.js';
import { createTextEditingState } from '@sectile/core/text';
const time = (hour, minute, second = 0, millisecond = 0) => createTimeValue(hour, minute, second, millisecond);

test('time range retains endpoint formats and switches settled endpoints atomically', () => {
  const half = createTimeFieldFormat({ precision: 'minute', hourCycle: 'h12' });
  const full = createTimeFieldFormat({ precision: 'minute', hourCycle: 'h23' });
  const range = { start: time(9, 30), end: time(17, 45) };
  const state = createTimeRangeFieldState({ value: range, startFormat: half, endFormat: half, active: 'end' });
  const focused = applyTimeRangeFieldEvent(state, { type: 'focus', endpoint: 'start' }).value.state;
  assert.equal(focused.start.format, half); assert.equal(focused.end.format, half);
  const converted = reformatTimeRangeFieldState(state, full);
  assert.equal(converted.ok, true); assert.deepEqual(converted.value.value, range); assert.equal(converted.value.active, 'end');
  assert.equal(converted.value.start.inputState.snapshot.text, '09:30'); assert.equal(converted.value.end.inputState.snapshot.text, '17:45');
  const changed = applyTimeRangeFieldEvent(converted.value, { type: 'field', endpoint: 'end', event: { type: 'set-value', value: time(18, 0) } });
  assert.equal(changed.ok, true); assert.equal(changed.value.state.end.format, full); assert.equal(changed.value.state.start.format, full);
  assert.equal(changed.value.state.end.inputState.snapshot.text, '18:00');
  const dirty = createTimeRangeFieldState({ value: range, startFormat: half, endFormat: half, endInputState: createTextEditingState('05:') });
  const rejected = reformatTimeRangeFieldState(dirty, full);
  assert.equal(rejected.ok, false); assert.equal(rejected.error.code, 'time-field-format-draft-active');
  assert.equal(dirty.start.inputState.snapshot.text, '09:30 AM'); assert.equal(dirty.end.inputState.snapshot.text, '05:');
  const cancelled = applyTimeRangeFieldEvent(dirty, 'cancel');
  assert.equal(cancelled.ok, true); assert.equal(cancelled.value.state.end.inputState.snapshot.text, '05:45 PM');
  assert.equal(cancelled.value.state.end.format, half);
  const composing = applyTimeRangeFieldEvent(state, { type: 'field', endpoint: 'end', event: { type: 'text', event: {
    type: 'composition-start', startCodeUnitOffset: 0, endCodeUnitOffset: 0, text: '', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 },
  } } }).value.state;
  assert.equal(reformatTimeRangeFieldState(composing, full).error.code, 'time-field-format-draft-active');
  assert.equal(composing.start.inputState.snapshot.text, '09:30 AM'); assert.notEqual(composing.end.inputState.composition, null);
  const precise = createTimeFieldFormat({ precision: 'second' });
  const withSeconds = createTimeRangeFieldState({ value: { start: time(9, 30), end: time(17, 45, 1) }, startFormat: precise, endFormat: precise });
  assert.equal(reformatTimeRangeFieldState(withSeconds, full).error.code, 'time-field-format-precision-loss');
  assert.equal(withSeconds.start.format, precise); assert.equal(withSeconds.end.inputState.snapshot.text, '17:45:01');
  const partial = reformatTimeRangeFieldState(createTimeRangeFieldState({ startValue: time(9, 30), startFormat: half }), full);
  assert.equal(partial.ok, true); assert.equal(partial.value.value, null); assert.equal(partial.value.end.value, null);
});

test('time range field exposes only complete ordered wall-clock ranges', () => {
  let state = createTimeRangeFieldState();
  state = applyTimeRangeFieldEvent(state, { type: 'field', endpoint: 'start', event: { type: 'set-value', value: time(9, 30) } }).value.state;
  assert.equal(state.value, null);
  const update = applyTimeRangeFieldEvent(state, { type: 'field', endpoint: 'end', event: { type: 'set-value', value: time(17, 45) } });
  assert.equal(formatTimeValue(update.value.state.value.start), '09:30');
  assert.equal(formatTimeValue(update.value.state.value.end), '17:45');
});

test('time range field rejects inverted endpoint changes atomically', () => {
  const state = createTimeRangeFieldState({ value: { start: time(9, 30), end: time(17, 45) } });
  const rejected = applyTimeRangeFieldEvent(state, { type: 'field', endpoint: 'end', event: { type: 'set-value', value: time(8, 0) } });
  assert.equal(rejected.error.code, 'inverted-time-range-field');
  assert.equal(formatTimeValue(state.value.end), '17:45');
});

test('required time range field rejects clearing a committed range', () => {
  const state = createTimeRangeFieldState({ value: { start: time(9, 30), end: time(17, 45) } });
  const direct = applyTimeRangeFieldEvent(state, { type: 'field', endpoint: 'start', event: { type: 'set-value', value: null } }, { required: true });
  assert.equal(direct.ok, false);
  assert.equal(direct.error.code, 'time-range-field-value-required');
  assert.equal(formatTimeValue(state.value.start), '09:30');

  const cleared = applyTimeRangeFieldEvent(state, { type: 'field', endpoint: 'start', event: { type: 'text', event: { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: 5, text: '', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 } } } }, { required: true });
  assert.equal(cleared.ok, true);
  assert.equal(formatTimeValue(cleared.value.state.value.start), '09:30');
  const committed = applyTimeRangeFieldEvent(cleared.value.state, { type: 'field', endpoint: 'start', event: 'commit' }, { required: true });
  assert.equal(committed.ok, false);
  assert.equal(committed.error.code, 'time-range-field-value-required');
});

test('time range field endpoint adjustment preserves an active zero-valued seconds segment', () => {
  let state = createTimeRangeFieldState({ value: { start: time(10, 30, 1), end: time(10, 40) } });
  state = applyTimeRangeFieldEvent(state, {
    type: 'field',
    endpoint: 'start',
    event: {
      type: 'text',
      event: {
        type: 'replace',
        startCodeUnitOffset: 6,
        endCodeUnitOffset: 6,
        text: '',
        selection: { anchorCodeUnitOffset: 6, focusCodeUnitOffset: 6 },
      },
    },
  }).value.state;

  const zero = applyTimeRangeFieldEvent(state, { type: 'field', endpoint: 'start', event: 'decrement-segment' });
  assert.equal(zero.value.state.start.inputState.snapshot.text, '10:30:00');
  assert.equal(zero.value.state.start.inputState.snapshot.selection.focusCodeUnitOffset, 8);
  assert.equal(formatTimeValue(zero.value.state.value.start), '10:30');

  const previous = applyTimeRangeFieldEvent(zero.value.state, { type: 'field', endpoint: 'start', event: 'decrement-segment' });
  assert.equal(formatTimeValue(previous.value.state.value.start), '10:29:59');
});

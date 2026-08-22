import assert from 'node:assert/strict';
import test from 'node:test';
import { applyTimeRangeFieldEvent, createTimeRangeFieldState } from '../../.verification-dist/time-range-field.js';
import { createTimeValue, formatTimeValue } from '../../.verification-dist/time-field.js';
const time = (hour, minute) => createTimeValue(hour, minute).value;

test('time range field exposes only complete ordered wall-clock ranges', () => {
  let state = createTimeRangeFieldState().value;
  state = applyTimeRangeFieldEvent(state, { type: 'field', endpoint: 'start', event: { type: 'set-value', value: time(9, 30) } }).value.state;
  assert.equal(state.value, null);
  const update = applyTimeRangeFieldEvent(state, { type: 'field', endpoint: 'end', event: { type: 'set-value', value: time(17, 45) } });
  assert.equal(formatTimeValue(update.value.state.value.start), '09:30');
  assert.equal(formatTimeValue(update.value.state.value.end), '17:45');
});

test('time range field rejects inverted endpoint changes atomically', () => {
  const state = createTimeRangeFieldState({ value: { start: time(9, 30), end: time(17, 45) } }).value;
  const rejected = applyTimeRangeFieldEvent(state, { type: 'field', endpoint: 'end', event: { type: 'set-value', value: time(8, 0) } });
  assert.equal(rejected.error.code, 'inverted-time-range-field');
  assert.equal(formatTimeValue(state.value.end), '17:45');
});

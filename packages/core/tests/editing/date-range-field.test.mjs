import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDateRangeFieldEvent, createDateRangeFieldState } from '../../.verification-dist/date-range-field.js';
import { createDateValue, formatDateValue } from '../../.verification-dist/date-field.js';

const date = (year, month, day) => createDateValue(year, month, day).value;

test('date range field exposes only complete ordered ranges', () => {
  let state = createDateRangeFieldState().value;
  let update = applyDateRangeFieldEvent(state, { type: 'field', endpoint: 'start', event: { type: 'set-value', value: date(2026, 8, 22) } });
  assert.equal(update.ok, true);
  state = update.value.state;
  assert.equal(state.value, null);
  assert.equal(formatDateValue(state.start.value), '2026-08-22');

  update = applyDateRangeFieldEvent(state, { type: 'field', endpoint: 'end', event: { type: 'set-value', value: date(2026, 8, 28) } });
  assert.equal(formatDateValue(update.value.state.value.start), '2026-08-22');
  assert.equal(formatDateValue(update.value.state.value.end), '2026-08-28');
  assert.deepEqual(update.value.commands.at(-1), { type: 'range-committed', value: update.value.state.value });
});

test('date range field rejects inverted endpoint changes atomically', () => {
  const state = createDateRangeFieldState({
    value: { start: date(2026, 8, 22), end: date(2026, 8, 28) },
  }).value;
  const rejected = applyDateRangeFieldEvent(state, { type: 'field', endpoint: 'end', event: { type: 'set-value', value: date(2026, 8, 20) } });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'inverted-date-range-field');
  assert.equal(formatDateValue(state.value.end), '2026-08-28');
});

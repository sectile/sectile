import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDateRangeFieldEvent, createDateRangeFieldState, reformatDateRangeFieldState } from '../../.verification-dist/fields/date-range.js';
import { createDateValue, createDateFieldFormat, formatDateValue } from '../../.verification-dist/fields/date.js';
import { createTextEditingState } from '@sectile/core/text';

const date = (year, month, day) => createDateValue(year, month, day);

test('range editing retains both admitted formats and projects them atomically', () => {
  const us = createDateFieldFormat({ order: ['month', 'day', 'year'], literals: ['', '/', '/', ''] });
  const gb = createDateFieldFormat({ order: ['day', 'month', 'year'], literals: ['', '/', '/', ''] });
  const range = { start: date(2026, 10, 14), end: date(2026, 11, 1) };
  let state = createDateRangeFieldState({ value: range, startFormat: us, endFormat: us, active: 'end' });
  const focused = applyDateRangeFieldEvent(state, { type: 'focus', endpoint: 'end' });
  assert.equal(focused.ok, true); state = focused.value.state;
  assert.equal(state.start.format, us); assert.equal(state.end.format, us);
  const converted = reformatDateRangeFieldState(state, gb); assert.equal(converted.ok, true);
  assert.equal(converted.value.start.inputState.snapshot.text, '14/10/2026'); assert.equal(converted.value.end.inputState.snapshot.text, '01/11/2026');
  assert.equal(converted.value.active, 'end'); assert.deepEqual(converted.value.value, range);
  const changed = applyDateRangeFieldEvent(converted.value, { type: 'field', endpoint: 'end', event: { type: 'set-value', value: date(2026, 11, 2) } });
  assert.equal(changed.ok, true); assert.equal(changed.value.state.end.inputState.snapshot.text, '02/11/2026'); assert.equal(changed.value.state.start.format, gb);
  const dirty = createDateRangeFieldState({ value: range, startFormat: us, endFormat: us, endInputState: createTextEditingState('11/') });
  const rejected = reformatDateRangeFieldState(dirty, gb); assert.equal(rejected.ok, false); assert.equal(rejected.error.code, 'date-field-format-draft-active');
  assert.equal(dirty.start.inputState.snapshot.text, '10/14/2026'); assert.equal(dirty.end.inputState.snapshot.text, '11/');
  const cancelled = applyDateRangeFieldEvent(dirty, 'cancel'); assert.equal(cancelled.ok, true);
  assert.equal(cancelled.value.state.end.inputState.snapshot.text, '11/01/2026'); assert.equal(cancelled.value.state.end.format, us);
});

test('date range field exposes only complete ordered ranges', () => {
  let state = createDateRangeFieldState();
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
  });
  const rejected = applyDateRangeFieldEvent(state, { type: 'field', endpoint: 'end', event: { type: 'set-value', value: date(2026, 8, 20) } });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'inverted-date-range-field');
  assert.equal(formatDateValue(state.value.end), '2026-08-28');
});

test('required date range field rejects clearing a committed range', () => {
  const state = createDateRangeFieldState({ value: { start: date(2026, 8, 22), end: date(2026, 8, 28) } });
  const direct = applyDateRangeFieldEvent(state, { type: 'field', endpoint: 'start', event: { type: 'set-value', value: null } }, { required: true });
  assert.equal(direct.ok, false);
  assert.equal(direct.error.code, 'date-range-field-value-required');
  assert.equal(formatDateValue(state.value.start), '2026-08-22');

  const cleared = applyDateRangeFieldEvent(state, { type: 'field', endpoint: 'start', event: { type: 'text', event: { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: 10, text: '', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 } } } }, { required: true });
  assert.equal(cleared.ok, true);
  assert.equal(formatDateValue(cleared.value.state.value.start), '2026-08-22');
  const committed = applyDateRangeFieldEvent(cleared.value.state, { type: 'field', endpoint: 'start', event: 'commit' }, { required: true });
  assert.equal(committed.ok, false);
  assert.equal(committed.error.code, 'date-range-field-value-required');
});

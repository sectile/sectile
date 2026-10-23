import assert from 'node:assert/strict';
import test from 'node:test';
import { createTextEditingState } from '@sectile/core/text';
import { createDateValue, createDateFieldFormat } from '../../.verification-dist/fields/date.js';
import { createTimeValue, createTimeFieldFormat } from '../../.verification-dist/fields/time.js';
import { createDateTimeValue, createDateTimeFieldFormat, formatDateTimeValue } from '../../.verification-dist/fields/date-time.js';
import { createDateTimeRangeFieldState, tryCreateDateTimeRangeFieldState, applyDateTimeRangeFieldEvent, reformatDateTimeRangeFieldState } from '../../.verification-dist/fields/date-time-range.js';

const at = (day, hour, minute = 0) => createDateTimeValue(createDateValue(2026, 10, day), createTimeValue(hour, minute));
const set = (endpoint, value) => ({ type: 'field', endpoint, event: { type: 'set-value', value } });

test('date-time ranges retain partial endpoints and commit complete chronological ranges across midnight', () => {
  const partial = applyDateTimeRangeFieldEvent(createDateTimeRangeFieldState(), set('start', at(14, 23)));
  assert.equal(partial.ok, true);
  assert.equal(partial.value.state.value, null);
  assert.deepEqual(partial.value.state.start.value, at(14, 23));
  assert.equal(partial.value.commands.some(command => command.type === 'range-committed'), false);
  const complete = applyDateTimeRangeFieldEvent(partial.value.state, set('end', at(15, 1)));
  assert.equal(complete.ok, true);
  assert.deepEqual(complete.value.state.value, { start: at(14, 23), end: at(15, 1) });
  assert.deepEqual(complete.value.commands.at(-1), { type: 'range-committed', value: complete.value.state.value });
  const rejected = applyDateTimeRangeFieldEvent(complete.value.state, set('end', at(14, 22)));
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'inverted-date-time-range-field');
  assert.deepEqual(complete.value.state.end.value, at(15, 1));
  assert.equal(tryCreateDateTimeRangeFieldState({ value: { start: at(14, 23), end: at(14, 22) } }).error.class, 'construction');
  assert.equal(tryCreateDateTimeRangeFieldState({ active: 'middle' }).error.code, 'invalid-date-time-range-field-endpoint');
});

test('aggregate required policy permits drafts but refuses committing an incomplete range', () => {
  const state = createDateTimeRangeFieldState({ value: { start: at(14, 9), end: at(14, 17) } });
  assert.equal(applyDateTimeRangeFieldEvent(state, set('end', null), { required: true }).error.code, 'date-time-range-field-value-required');
  const draft = applyDateTimeRangeFieldEvent(state, { type: 'field', endpoint: 'end', event: { type: 'text', event: {
    type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: state.end.inputState.snapshot.text.length, text: '',
    selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 },
  } } }, { required: true });
  assert.equal(draft.ok, true);
  assert.deepEqual(draft.value.state.value, state.value);
  assert.equal(applyDateTimeRangeFieldEvent(draft.value.state, { type: 'field', endpoint: 'end', event: 'commit' }, { required: true }).error.code, 'date-time-range-field-value-required');
  const optional = applyDateTimeRangeFieldEvent(draft.value.state, { type: 'field', endpoint: 'end', event: 'commit' });
  assert.equal(optional.ok, true);
  assert.deepEqual(optional.value.commands.at(-1), { type: 'range-committed', value: null });
});

test('endpoint edits delegate date-time bounds, availability and segment steps', () => {
  const state = createDateTimeRangeFieldState({ value: { start: at(14, 9), end: at(14, 17) } });
  for (const policies of [{ min: at(14, 10) }, { unavailable: value => value.time.hour === 9 }]) {
    assert.equal(applyDateTimeRangeFieldEvent(state, set('start', at(14, 9)), policies).ok, false);
  }
  const input = createTextEditingState(formatDateTimeValue(at(14, 9)), { anchorCodeUnitOffset: 14, focusCodeUnitOffset: 16 });
  const selected = createDateTimeRangeFieldState({ value: state.value, startInputState: input });
  const stepped = applyDateTimeRangeFieldEvent(selected, { type: 'field', endpoint: 'start', event: 'increment-segment' }, { step: { minute: 15 } });
  assert.equal(stepped.ok, true);
  assert.deepEqual(stepped.value.state.value.start, at(14, 9, 15));
  assert.equal(applyDateTimeRangeFieldEvent(state, set('end', at(14, 17)), { max: at(14, 16) }).ok, false);
});

test('two-endpoint presentation rebases atomically, retains focus and cancels both drafts', () => {
  const first = createDateTimeFieldFormat({
    date: createDateFieldFormat({ order: ['day', 'month', 'year'], literals: ['', '/', '/', ''] }),
    time: createTimeFieldFormat({ precision: 'minute' }),
  });
  const next = createDateTimeFieldFormat({
    date: createDateFieldFormat({ order: ['year', 'month', 'day'] }),
    time: createTimeFieldFormat({ precision: 'second' }), order: ['time', 'date'],
  });
  const value = { start: at(14, 23), end: at(15, 1) };
  const state = createDateTimeRangeFieldState({ value, startFormat: first, endFormat: first });
  const focused = applyDateTimeRangeFieldEvent(state, { type: 'focus', endpoint: 'end' });
  assert.deepEqual(focused.value.commands, [{ type: 'focus-endpoint', endpoint: 'end' }]);
  const rebased = reformatDateTimeRangeFieldState(focused.value.state, next);
  assert.equal(rebased.ok, true);
  assert.equal(rebased.value.active, 'end');
  assert.equal(rebased.value.start.inputState.snapshot.text, '23:00:00 2026-10-14');
  assert.equal(rebased.value.end.inputState.snapshot.text, '01:00:00 2026-10-15');
  assert.deepEqual(rebased.value.value, value);
  const dirty = createDateTimeRangeFieldState({ value, startFormat: first, endFormat: first,
    startInputState: createTextEditingState('14/'), endInputState: createTextEditingState('15/'), active: 'end' });
  assert.equal(reformatDateTimeRangeFieldState(dirty, next).error.code, 'date-time-field-format-draft-active');
  assert.equal(dirty.start.inputState.snapshot.text, '14/');
  const cancelled = applyDateTimeRangeFieldEvent(dirty, 'cancel');
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.value.state.active, 'end');
  assert.equal(cancelled.value.state.start.inputState.snapshot.text, '14/10/2026 23:00');
  assert.equal(cancelled.value.state.end.inputState.snapshot.text, '15/10/2026 01:00');
  assert.equal(cancelled.value.state.start.format, first);
  assert.equal(cancelled.value.state.end.format, first);
  const composing = applyDateTimeRangeFieldEvent(state, { type: 'field', endpoint: 'end', event: { type: 'text', event: {
    type: 'composition-start', startCodeUnitOffset: 0, endCodeUnitOffset: 0, text: '',
    selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 },
  } } });
  assert.equal(composing.ok, true);
  assert.equal(reformatDateTimeRangeFieldState(composing.value.state, next).error.code, 'date-time-field-format-draft-active');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { createTextEditingState } from '@sectile/core/text';
import { createTimeFieldState, tryCreateTimeFieldState, applyTimeFieldEvent, reformatTimeFieldState } from '../../.verification-dist/fields/time.js';
import { createTimeFieldFormat, tryCreateTimeFieldFormat, formatTimeFieldValue, parseTimeFieldValue, formatTimeValue } from '../../.verification-dist/fields/time.js';
const time = (hour, second = 0, millisecond = 0) => ({ hour, minute: 30, second, millisecond });
const value = result => { assert.equal(result.ok, true); return result.value; };
test('formatted TimeField reducer preserves format through commit, cancel, set-value and period arithmetic', () => {
  const format = createTimeFieldFormat({ precision: 'minute', hourCycle: 'h12' });
  let state = createTimeFieldState(time(3), createTextEditingState('03:30 AM', { anchorCodeUnitOffset: 6, focusCodeUnitOffset: 8 }), format);
  state = value(applyTimeFieldEvent(state, 'increment-segment')).state;
  assert.deepEqual(state.value, time(15)); assert.equal(state.inputState.snapshot.text, '03:30 PM'); assert.equal(state.format, format);
  assert.deepEqual([state.inputState.snapshot.selection.anchorCodeUnitOffset, state.inputState.snapshot.selection.focusCodeUnitOffset], [6, 8]);
  assert.equal(applyTimeFieldEvent(state, 'increment-segment', { min: time(12) }).ok, false);
  state = value(applyTimeFieldEvent(state, { type: 'set-value', value: time(9) })).state;
  const edited = createTimeFieldState(state.value, createTextEditingState('10:30 PM'), format);
  assert.deepEqual(value(applyTimeFieldEvent(edited, 'commit')).state.value, time(22));
  assert.equal(value(applyTimeFieldEvent(edited, 'cancel')).state.inputState.snapshot.text, '09:30 AM');
  assert.equal(tryCreateTimeFieldState(time(9, 1), undefined, format).ok, false);
  const composing = value(applyTimeFieldEvent(state, { type: 'text', event: { type: 'composition-start', startCodeUnitOffset: 0, endCodeUnitOffset: 0, text: '', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 } } })).state;
  assert.equal(composing.format, format); assert.notEqual(composing.inputState.composition, null);
  assert.equal(reformatTimeFieldState(composing, createTimeFieldFormat({ precision: 'minute' })).error.code, 'time-field-format-draft-active');
});
test('time reformat preserves logical forward/backward/all/collapsed selections and rejects active drafts', () => {
  const next = createTimeFieldFormat({ precision: 'minute', hourCycle: 'h12', order: ['dayPeriod', 'hour', 'minute'], dayPeriods: ['a', 'afternoon'], literals: ['', ' ', '.', ''] });
  for (const [anchor, focus, expected] of [[3, 5, [13, 15]], [5, 3, [15, 13]], [4, 4, [15, 15]], [0, 5, [0, 15]], [5, 0, [15, 0]]]) {
    const state = createTimeFieldState(time(15), createTextEditingState('15:30', { anchorCodeUnitOffset: anchor, focusCodeUnitOffset: focus }));
    const converted = value(reformatTimeFieldState(state, next)); assert.equal(converted.inputState.snapshot.text, 'afternoon 03.30'); assert.deepEqual(converted.value, time(15));
    assert.deepEqual([converted.inputState.snapshot.selection.anchorCodeUnitOffset, converted.inputState.snapshot.selection.focusCodeUnitOffset], expected);
  }
  const draft = createTimeFieldState(time(15), createTextEditingState('15:'));
  assert.equal(reformatTimeFieldState(draft, next).error.code, 'time-field-format-draft-active');
  const composing = value(applyTimeFieldEvent(createTimeFieldState(time(15)), { type: 'text', event: { type: 'composition-start', startCodeUnitOffset: 0, endCodeUnitOffset: 0, text: '', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 } } })).state;
  assert.equal(reformatTimeFieldState(composing, next).error.code, 'time-field-format-draft-active');
  assert.equal(value(reformatTimeFieldState(createTimeFieldState(null), next)).inputState.snapshot.text, '');
  const expanded = createTimeFieldState(time(15), createTextEditingState('15:30:00'));
  assert.equal(value(reformatTimeFieldState(expanded, next)).inputState.snapshot.text, 'afternoon 03.30');
  const period = createTimeFieldState(time(15), createTextEditingState('03:30 PM', { anchorCodeUnitOffset: 6, focusCodeUnitOffset: 8 }), createTimeFieldFormat({ precision: 'minute', hourCycle: 'h12' }));
  const withoutPeriod = value(reformatTimeFieldState(period, createTimeFieldFormat({ precision: 'minute' })));
  assert.deepEqual([withoutPeriod.inputState.snapshot.selection.anchorCodeUnitOffset, withoutPeriod.inputState.snapshot.selection.focusCodeUnitOffset], [0, 2]);
  const fine = createTimeFieldFormat({ precision: 'second' });
  const fineState = createTimeFieldState(time(15), createTextEditingState('15:30:00', { anchorCodeUnitOffset: 6, focusCodeUnitOffset: 8 }), fine);
  const coarse = value(reformatTimeFieldState(fineState, createTimeFieldFormat({ precision: 'minute' })));
  assert.deepEqual([coarse.inputState.snapshot.selection.anchorCodeUnitOffset, coarse.inputState.snapshot.selection.focusCodeUnitOffset], [3, 5]);
  assert.equal(reformatTimeFieldState(createTimeFieldState(time(15, 1), undefined, fine), createTimeFieldFormat({ precision: 'minute' })).error.code, 'time-field-format-precision-loss');
});
test('time formats preserve midnight/noon through each admitted hour cycle', () => {
  for (const [hourCycle, midnight, noon, late] of [['h11', '00:30 AM', '00:30 PM', '11:30 PM'], ['h12', '12:30 AM', '12:30 PM', '11:30 PM'], ['h23', '00:30', '12:30', '23:30'], ['h24', '24:30', '12:30', '23:30']]) {
    const format = createTimeFieldFormat({ precision: 'minute', hourCycle });
    for (const [hour, text] of [[0, midnight], [12, noon], [23, late]]) {
      assert.equal(formatTimeFieldValue(time(hour), format), text);
      assert.deepEqual(parseTimeFieldValue(text, format), { ok: true, value: time(hour) });
    }
  }
});
test('time field format precision is exact and canonical serialization remains unchanged', () => {
  const value = time(15, 24, 125), format = createTimeFieldFormat({ precision: 'millisecond' });
  assert.equal(formatTimeFieldValue(value, format), '15:30:24.125');
  assert.deepEqual(parseTimeFieldValue('15:30:24.125', format).value, value);
  for (const precision of ['minute', 'second']) assert.throws(() => formatTimeFieldValue(value, createTimeFieldFormat({ precision })), { code: 'time-field-format-precision-loss' });
  assert.equal(formatTimeFieldValue(time(15)), formatTimeValue(time(15)));
  assert.deepEqual(parseTimeFieldValue('15:30').value, time(15));
});
test('owned literals, variable period labels and astral digits round trip with bounded output', () => {
  const digits = Array.from({ length: 10 }, (_, index) => String.fromCodePoint(0x1d7ce + index));
  const format = createTimeFieldFormat({ precision: 'minute', hourCycle: 'h12', order: ['dayPeriod', 'hour', 'minute'], literals: ['', ' ', '.', ''], dayPeriods: ['morning', 'pm'], digits });
  for (const hour of [0, 12, 15, 23]) assert.deepEqual(parseTimeFieldValue(formatTimeFieldValue(time(hour), format), format).value, time(hour));
  const bounded = createTimeFieldFormat({ precision: 'millisecond', hourCycle: 'h12', literals: Array(6).fill('x'.repeat(32)), dayPeriods: ['a'.repeat(32), 'p'.repeat(32)], digits });
  const text = formatTimeFieldValue(time(15, 24, 125), bounded); assert.equal(text.length, 242);
  assert.deepEqual(parseTimeFieldValue(text, bounded).value, time(15, 24, 125));
  assert.equal(parseTimeFieldValue(text + 'x', bounded).ok, false);
  assert.equal(tryCreateTimeFieldFormat({ precision: 'minute', literals: ['', ':'.repeat(33), ''] }).ok, false);
});
test('time format admission rejects forged, nullable, inconsistent and unsafe data', () => {
  for (const options of [{ precision: 'hour' }, { precision: 'minute', hourCycle: null }, { precision: 'minute', order: null },
    { precision: 'minute', literals: null }, { precision: 'minute', digits: null }, { precision: 'minute', hourCycle: 'h12', dayPeriods: null },
    { precision: 'minute', order: ['hour', 'hour'] }, { precision: 'minute', dayPeriods: ['AM', 'PM'] },
    { precision: 'minute', hourCycle: 'h12', dayPeriods: ['same', 'same'] }]) assert.equal(tryCreateTimeFieldFormat(options).ok, false);
  const format = createTimeFieldFormat({ precision: 'minute' });
  assert.throws(() => formatTimeFieldValue(time(9), { ...format }), { code: 'invalid-time-field-format' });
  assert.equal(parseTimeFieldValue('09:30', { ...format }).ok, false);
  assert.equal(parseTimeFieldValue('25:30', format).ok, false);
  const twelve = createTimeFieldFormat({ precision: 'minute', hourCycle: 'h12' });
  assert.equal(parseTimeFieldValue('00:30 AM', twelve).ok, false);
  assert.equal(parseTimeFieldValue('13:30 PM', twelve).ok, false);
  let reads = 0; const hostile = { precision: 'minute', get order() { reads++; return ['hour', 'minute']; } };
  assert.equal(tryCreateTimeFieldFormat(hostile).ok, false); assert.equal(reads, 0);
});

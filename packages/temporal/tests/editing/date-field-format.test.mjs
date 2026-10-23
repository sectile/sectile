import assert from 'node:assert/strict';
import test from 'node:test';
import { createTextEditingState } from '@sectile/core/text';
import { reformatDateFieldState } from '../../.verification-dist/fields/date.js';
import { createDateFieldFormat, tryCreateDateFieldFormat, createDateFieldState, tryCreateDateFieldState, applyDateFieldEvent, formatDateFieldValue, parseDateFieldValue, formatDateValue, dateSegmentAt } from '../../.verification-dist/fields/date.js';
const date = { year: 2026, month: 10, day: 14 };
const value = result => { assert.equal(result.ok, true); return result.value; };
const code = result => { assert.equal(result.ok, false); return result.error.code; };
const us = () => createDateFieldFormat({ order: ['month', 'day', 'year'], literals: ['', '/', '/', ''] });

test('format conversion belongs to Temporal and preserves logical selections without changing values', () => {
  const previous = us(), next = createDateFieldFormat({ order: ['day', 'month', 'year'], literals: ['', '/', '/', ''] });
  for (const [anchor, focus, expected] of [[0, 2, [3, 5]], [2, 0, [5, 3]], [1, 1, [5, 5]], [0, 10, [0, 10]], [10, 0, [10, 0]]]) {
    const state = createDateFieldState(date, createTextEditingState('10/14/2026', { anchorCodeUnitOffset: anchor, focusCodeUnitOffset: focus }), previous);
    const converted = value(reformatDateFieldState(state, next));
    assert.equal(converted.inputState.snapshot.text, '14/10/2026'); assert.deepEqual(converted.value, date);
    assert.deepEqual([converted.inputState.snapshot.selection.anchorCodeUnitOffset, converted.inputState.snapshot.selection.focusCodeUnitOffset], expected);
  }
  assert.equal(value(reformatDateFieldState(createDateFieldState(null), next)).inputState.snapshot.text, '');
  assert.equal(code(reformatDateFieldState(createDateFieldState(date, createTextEditingState('10/'), previous), next)), 'date-field-format-draft-active');
});

test('date field layouts preserve canonical ISO while projecting ordered locale text', () => {
  const cases = [
    [us(), '10/14/2026'],
    [createDateFieldFormat({ order: ['day', 'month', 'year'], literals: ['', '/', '/', ''] }), '14/10/2026'],
    [createDateFieldFormat({ order: ['year', 'month', 'day'], literals: ['', '. ', '. ', '.'] }), '2026. 10. 14.'],
  ];
  for (const [format, text] of cases) {
    assert.equal(formatDateFieldValue(date, format), text);
    assert.deepEqual(value(parseDateFieldValue(text, format)), date);
    assert.equal(createDateFieldState(date, undefined, format).inputState.snapshot.text, text);
  }
  assert.equal(formatDateValue(date), '2026-10-14');
  assert.equal(formatDateFieldValue(date), '2026-10-14');
  assert.deepEqual(value(parseDateFieldValue('2026-10-14')), date);
  assert.deepEqual(Object.keys(createDateFieldState(date)), ['value', 'inputState']);
});

test('segment adjustment, commit and cancel retain the admitted order and selection', () => {
  const format = us();
  let state = createDateFieldState(date, undefined, format);
  state = value(applyDateFieldEvent(state, { type: 'text', event: { type: 'replace', startCodeUnitOffset: 3, endCodeUnitOffset: 3, text: '', selection: { anchorCodeUnitOffset: 3, focusCodeUnitOffset: 3 } } })).state;
  state = value(applyDateFieldEvent(state, 'increment-segment')).state;
  assert.deepEqual(state.value, { year: 2026, month: 10, day: 15 });
  assert.equal(state.inputState.snapshot.text, '10/15/2026');
  assert.deepEqual([state.inputState.snapshot.selection.anchorCodeUnitOffset, state.inputState.snapshot.selection.focusCodeUnitOffset], [3, 5]);
  assert.equal(state.format, format);
  assert.equal(dateSegmentAt(0, format), 'month'); assert.equal(dateSegmentAt(7, format), 'year');
  state = value(applyDateFieldEvent(state, { type: 'text', event: { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: 10, text: '11/20/2026', selection: { anchorCodeUnitOffset: 10, focusCodeUnitOffset: 10 } } })).state;
  assert.deepEqual(value(applyDateFieldEvent(state, 'commit')).state.value, { year: 2026, month: 11, day: 20 });
  const cancelled = value(applyDateFieldEvent(state, 'cancel')).state;
  assert.equal(cancelled.inputState.snapshot.text, '10/15/2026'); assert.equal(cancelled.format, format);
});

test('localized and supplementary glyphs use correct code-unit spans', () => {
  const arabic = createDateFieldFormat({ order: ['day', 'month', 'year'], literals: ['\u200f', '/\u200f', '/\u200f', ''], digits: [...'٠١٢٣٤٥٦٧٨٩'] });
  const text = '\u200f١٤/\u200f١٠/\u200f٢٠٢٦';
  assert.equal(formatDateFieldValue(date, arabic), text); assert.deepEqual(value(parseDateFieldValue(text, arabic)), date);
  assert.equal(code(parseDateFieldValue('\u200f14/\u200f١٠/\u200f٢٠٢٦', arabic)), 'invalid-date-format');
  assert.equal(formatDateFieldValue({ year: 42, month: 1, day: 2 }, us()), '01/02/0042');
  const math = createDateFieldFormat({ order: ['month', 'day', 'year'], literals: ['', '/', '/', ''], digits: [...'𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗'] });
  let state = createDateFieldState(date, undefined, math);
  assert.equal(state.inputState.snapshot.text, '𝟏𝟎/𝟏𝟒/𝟐𝟎𝟐𝟔');
  assert.deepEqual(value(parseDateFieldValue(state.inputState.snapshot.text, math)), date);
  state = value(applyDateFieldEvent(state, { type: 'text', event: { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: 0, text: '', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 } } })).state;
  state = value(applyDateFieldEvent(state, 'increment-segment')).state;
  assert.deepEqual(state.value, { year: 2026, month: 11, day: 14 });
  assert.deepEqual([state.inputState.snapshot.selection.anchorCodeUnitOffset, state.inputState.snapshot.selection.focusCodeUnitOffset], [0, 4]);
});

test('partial drafts, unavailable dates and composition keep existing commit ownership', () => {
  const format = us();
  const draft = text => value(applyDateFieldEvent(createDateFieldState(date, undefined, format), { type: 'text', event: { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: 10, text, selection: { anchorCodeUnitOffset: text.length, focusCodeUnitOffset: text.length } } })).state;
  assert.equal(code(applyDateFieldEvent(draft('10/'), 'commit')), 'invalid-date-format');
  assert.equal(code(applyDateFieldEvent(draft('02/30/2026'), 'commit')), 'invalid-date-day');
  assert.equal(code(applyDateFieldEvent(draft('10/14/2026'), 'commit', { unavailable: () => true })), 'date-field-value-unavailable');
  assert.equal(value(applyDateFieldEvent(draft(''), 'commit')).state.value, null);
  const composing = value(applyDateFieldEvent(draft('10/14/2026'), { type: 'text', event: { type: 'composition-start', startCodeUnitOffset: 0, endCodeUnitOffset: 0, text: '', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 } } })).state;
  assert.equal(code(applyDateFieldEvent(composing, 'commit')), 'date-field-composition-active');
});

test('format admission is inert, bounded and rejects forged layouts', () => {
  assert.equal(code(tryCreateDateFieldFormat({ order: ['year', 'year', 'day'] })), 'invalid-date-field-format');
  assert.equal(code(tryCreateDateFieldFormat({ order: ['year', 'month', 'day'], digits: Array(10).fill('0') })), 'invalid-date-field-format');
  assert.equal(code(tryCreateDateFieldFormat({ order: ['year', 'month', 'day'], literals: null })), 'invalid-date-field-format');
  let reads = 0;
  assert.equal(code(tryCreateDateFieldFormat({ get order() { reads++; return ['year', 'month', 'day']; } })), 'invalid-json-data');
  assert.equal(reads, 0);
  assert.equal(code(tryCreateDateFieldState(date, undefined, { order: ['year', 'month', 'day'] })), 'invalid-date-field-format');
  const options = { order: ['year', 'month', 'day'], literals: ['a'.repeat(32), '', '', ''] };
  const format = value(tryCreateDateFieldFormat(options)); options.order[0] = 'day';
  assert.equal(formatDateFieldValue(date, format), 'a'.repeat(32) + '20261014');
  assert.equal(code(tryCreateDateFieldFormat({ ...options, literals: ['a'.repeat(33), '', '', ''] })), 'json-data-limit-exceeded');
  assert.equal(code(tryCreateDateFieldState(date, createTextEditingState('x'.repeat(41)), format)), 'date-field-draft-too-long');
  const maximum = createDateFieldFormat({ order: ['year', 'month', 'day'], literals: Array(4).fill('a'.repeat(32)), digits: [...'𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗'] });
  assert.equal(createDateFieldState(date, undefined, maximum).inputState.snapshot.text.length, 144);
  assert.equal(code(tryCreateDateFieldState(date, createTextEditingState('x'.repeat(145)), maximum)), 'date-field-draft-too-long');
});

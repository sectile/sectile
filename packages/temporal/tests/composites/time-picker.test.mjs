import assert from 'node:assert/strict';
import test from 'node:test';
import { createTimePicker, tryCreateTimePicker } from '../../.verification-dist/pickers/time.js';
import { createTimeValue, createTimeFieldFormat } from '../../.verification-dist/fields/time.js';
const time = (hour, minute = 0, second = 0, millisecond = 0) => createTimeValue(hour, minute, second, millisecond);
const accepted = result => { assert.equal(result.ok, true, result.ok ? '' : result.error.message); return result.value; };
const column = (state, part) => state.columns.find(column => column.part === part);
const ticks = value => value.hour * 3_600_000 + value.minute * 60_000 + value.second * 1_000 + value.millisecond;

test('time choices project bounded part columns without inventing an initial selection', () => {
  const picker = createTimePicker(), state = accepted(picker.resolve());
  assert.equal(state.value, null);
  assert.deepEqual(state.columns.map(column => [column.part, column.choices.length, column.selected]), [['hour', 24, null], ['minute', 60, null]]);
  assert.equal(column(state, 'hour').choices[0].label, '00');
  assert.equal(column(state, 'minute').choices[59].label, '59');
  assert.deepEqual(accepted(picker.select(null, 'hour', 9)), time(9));
  assert.deepEqual(accepted(picker.select(time(9), 'minute', 30)), time(9, 30));
  for (const [precision, count] of [['minute', 84], ['second', 144], ['millisecond', 1144]]) {
    const model = createTimePicker({ format: createTimeFieldFormat({ precision }) });
    const current = accepted(model.resolve(time(15, 24)));
    assert.equal(current.columns.reduce((count, column) => count + column.choices.length, 0), count);
    assert.equal(Math.max(...current.columns.map(column => column.choices.length)) <= 1000, true);
  }
});

for (const [hourCycle, count, midnight, noon] of [
  ['h11', 12, '00', '00'], ['h12', 12, '12', '12'], ['h23', 24, '00', '12'], ['h24', 24, '24', '12'],
]) test('time choices borrow canonical ' + hourCycle + ' hour and day-period formatting', () => {
  const model = createTimePicker({ format: createTimeFieldFormat({ precision: 'minute', hourCycle }) });
  const morning = accepted(model.resolve(time(0))), afternoon = accepted(model.resolve(time(12)));
  assert.equal(column(morning, 'hour').choices.length, count);
  assert.equal(column(morning, 'hour').choices[column(morning, 'hour').selected].label, midnight);
  assert.equal(column(afternoon, 'hour').choices[column(afternoon, 'hour').selected].label, noon);
  assert.deepEqual(accepted(model.select(time(15, 24), 'hour', 0)), time(count === 12 ? 12 : 0, 24));
  if (count === 12) {
    assert.equal(column(afternoon, 'dayPeriod').selected, 1);
    assert.deepEqual(accepted(model.select(time(15, 24), 'dayPeriod', 0)), time(3, 24));
  } else assert.equal(model.select(time(15), 'dayPeriod', 0).error.code, 'invalid-time-picker-part');
});

test('time choices preserve localized glyphs, permuted parts and variable-length day periods', () => {
  const format = createTimeFieldFormat({ precision: 'millisecond', hourCycle: 'h12',
    order: ['dayPeriod', 'millisecond', 'second', 'minute', 'hour'], literals: ['', '|', '/', '/', '/', '!'],
    digits: ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'], dayPeriods: ['오전', 'afternoon'],
  });
  const model = createTimePicker({ format }), value = time(15, 4, 5, 6), state = accepted(model.resolve(value));
  assert.deepEqual(state.columns.map(column => column.part), ['dayPeriod', 'millisecond', 'second', 'minute', 'hour']);
  assert.equal(column(state, 'hour').choices[0].label, '١٢');
  assert.equal(column(state, 'minute').choices[5].label, '٠٥');
  assert.equal(column(state, 'millisecond').choices[7].label, '٠٠٧');
  assert.equal(column(state, 'dayPeriod').choices[1].label, 'afternoon');
  assert.deepEqual(accepted(model.select(value, 'minute', 17)), time(15, 17, 5, 6));
  assert.deepEqual(accepted(model.select(value, 'dayPeriod', 0)), time(3, 4, 5, 6));
});

test('time choices repair only lower parts within the selected bounded prefix', () => {
  const min = time(12, 30, 20), max = time(17, 40, 55);
  const model = createTimePicker({ min, max, format: createTimeFieldFormat({ precision: 'second' }) });
  assert.deepEqual(accepted(model.select(time(13), 'hour', 12)), min);
  assert.deepEqual(accepted(model.select(time(13, 45, 50), 'hour', 17)), max);
  assert.deepEqual(accepted(model.select(time(12, 45, 10), 'minute', 30)), min);
  assert.equal(model.select(time(13), 'hour', 11).error.code, 'time-field-value-below-minimum');
  assert.equal(model.select(time(12, 45), 'minute', 0).error.code, 'time-field-value-below-minimum');
  assert.equal(model.select(time(12, 30, 35), 'second', 19).error.code, 'time-field-value-below-minimum');
  const state = accepted(model.resolve(time(13, 45, 50)));
  for (const part of state.columns) for (const choice of part.choices) {
    if (choice.disabled) continue;
    assert.equal(ticks(choice.value) >= ticks(min) && ticks(choice.value) <= ticks(max), true);
    assert.deepEqual(accepted(model.select(state.value, part.part, choice.id)), choice.value);
  }
});

test('time choices align bounds to lossless precision and retain empty bounded intervals', () => {
  const picker = createTimePicker({ min: time(12, 30, 20, 250), max: time(13) });
  const initial = accepted(picker.resolve());
  assert.equal(initial.value, null); assert.equal(initial.columns.every(column => column.selected === null), true);
  assert.deepEqual(accepted(picker.select(null, 'hour', 12)), time(12, 31));
  assert.equal(picker.resolve(time(12, 31, 1)).error.code, 'time-field-format-precision-loss');
  const empty = createTimePicker({ min: time(12, 30, 20, 200), max: time(12, 30, 20, 250), format: createTimeFieldFormat({ precision: 'second' }) });
  assert.equal(accepted(empty.resolve()).columns.every(column => column.choices.every(choice => choice.disabled)), true);
  const endOfDay = createTimePicker({ min: time(23, 59, 59, 999) });
  assert.equal(accepted(endOfDay.resolve()).columns.every(column => column.choices.every(choice => choice.disabled)), true);
  assert.equal(tryCreateTimePicker({ min: time(13), max: time(12) }).error.code, 'inverted-time-field-bounds');
});

test('time choices admit actual layouts and IDs and isolate caller-owned mutable values', () => {
  const format = createTimeFieldFormat({ precision: 'minute' });
  assert.equal(tryCreateTimePicker({ format: { ...format } }).error.code, 'invalid-time-field-format');
  const min = { hour: 9, minute: 30, second: 0, millisecond: 0 }, model = createTimePicker({ min, format });
  min.hour = 0;
  assert.deepEqual(accepted(model.select(null, 'hour', 9)), time(9, 30));
  const input = { hour: 10, minute: 15, second: 0, millisecond: 0 }, state = accepted(model.resolve(input));
  input.hour = 2; assert.deepEqual(state.value, time(10, 15));
  assert.equal(Reflect.set(state.value, 'hour', 1), false);
  assert.equal(model.select(null, 'second', 0).error.code, 'invalid-time-picker-part');
  for (const id of [-1, 60, NaN, Infinity, 0.5]) assert.equal(model.select(null, 'minute', id).error.code, 'invalid-time-picker-choice');
  const select = model.select; assert.deepEqual(accepted(select(null, 'minute', 45)), time(9, 45));
});

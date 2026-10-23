import test from 'node:test';
import assert from 'node:assert/strict';
import { createDateRange, createDateValue, formatDateValue } from '@sectile/temporal/date-field';
import { createTimeValue, formatTimeValue } from '@sectile/temporal/time-field';
import { createTimeRange } from '@sectile/temporal/time-range-field';
import { createDateTimeRange, createDateTimeValue, formatDateTimeRange, formatDateTimeValue } from '@sectile/temporal/date-time-field';
import { createDateField } from '../.verification-dist/temporal/date-field.js';
import { createTemporalFormatter } from '../.verification-dist/temporal/format.js';
import { createDateRangeField } from '../.verification-dist/temporal/date-range-field.js';
import { createDateTimeField, getDateTimeFieldPlaceholder } from '../.verification-dist/temporal/date-time-field.js';
import { createDatePicker } from '../.verification-dist/temporal/date-picker.js';
import { createMonthPicker } from '../.verification-dist/temporal/month-picker.js';
import { createYearPicker } from '../.verification-dist/temporal/year-picker.js';
import { createDateRangePicker } from '../.verification-dist/temporal/date-range-picker.js';
import { createRangeCalendar } from '../.verification-dist/temporal/range-calendar.js';
import { createMonthRangePicker } from '../.verification-dist/temporal/month-range-picker.js';
import { createYearRangePicker } from '../.verification-dist/temporal/year-range-picker.js';
import { createDateTimePicker } from '../.verification-dist/temporal/date-time-picker.js';
import { createDateTimeRangePicker } from '../.verification-dist/temporal/date-time-range-picker.js';
import { createTimeField, getTimeFieldPlaceholder } from '../.verification-dist/temporal/time-field.js';
import { createTimeRangeField } from '../.verification-dist/temporal/time-range-field.js';
import { createDateTimeRangeField, tryCreateDateTimeRangeField } from '../.verification-dist/temporal/date-time-range-field.js';

const dateTimeAt = (day, hour, minute = 0) => createDateTimeValue(createDateValue(2026, 10, day), createTimeValue(hour, minute));
const liveRangeListeners = (...inputs) => inputs.reduce((count, input) => count + [...input.listeners.values()].reduce((sum, values) => sum + values.size, 0), 0);

test('all native range adapters preserve accepted partial endpoints through uncontrolled synchronization', () => {
  for (const [create, value] of [
    [createDateRangeField, createDateValue(2026, 10, 14)],
    [createTimeRangeField, createTimeValue(23, 30)],
    [createDateTimeRangeField, dateTimeAt(14, 23, 30)],
  ]) {
    const startInput = new FakeInput(), endInput = new FakeInput();
    const field = create({ startInput, endInput });
    try {
      assert.equal(field.handleEvent({ type: 'field', endpoint: 'start', event: { type: 'set-value', value } }), true);
      assert.equal(field.getValue(), null);
      const text = startInput.value;
      assert.equal(field.syncControlledValues({}).ok, true);
      assert.deepEqual(field.getSnapshot().state.start.value, value);
      field.handleEvent('cancel');
      assert.equal(startInput.value, text);
      assert.equal(endInput.value, '');
    } finally { field.disconnect(); }
    assert.equal(liveRangeListeners(startInput, endInput), 0);
  }
});

test('DOM date-time range fields propose chronological values and adopt controlled values without moving the caret', () => {
  const startInput = new FakeInput(), endInput = new FakeInput(), proposals = [];
  const initial = { start: dateTimeAt(14, 23), end: dateTimeAt(15, 1) };
  const field = createDateTimeRangeField({ startInput, endInput, value: initial, startLabel: 'Departure', endLabel: 'Arrival',
    onValueChange: value => proposals.push(value),
  });
  try {
    assert.equal(startInput.type, 'text');
    assert.equal(startInput.getAttribute('aria-label'), 'Departure');
    assert.equal(endInput.getAttribute('aria-label'), 'Arrival');
    assert.equal(field.handleEvent({ type: 'field', endpoint: 'start', event: { type: 'set-value', value: dateTimeAt(14, 23, 15) } }), true);
    assert.deepEqual(proposals.at(-1), { start: dateTimeAt(14, 23, 15), end: initial.end });
    assert.deepEqual(field.getValue(), initial);
    field.handleEvent('cancel');
    assert.equal(startInput.value, '2026-10-14T23:00');
    startInput.setSelectionRange(14, 16);
    assert.equal(field.syncControlledValues({ value: { start: dateTimeAt(14, 23, 30), end: dateTimeAt(15, 2) } }).ok, true);
    assert.deepEqual([startInput.value, endInput.value], ['2026-10-14T23:30', '2026-10-15T02:00']);
    assert.deepEqual([startInput.selectionStart, startInput.selectionEnd], [14, 16]);
    assert.equal(field.syncControlledValues({}).error.code, 'controlled-shape-mismatch');
    assert.equal(field.handleEvent({ type: 'field', endpoint: 'end', event: { type: 'set-value', value: dateTimeAt(14, 22) } }), false);
    assert.deepEqual(field.getValue().end, dateTimeAt(15, 2));
  } finally { field.disconnect(); }
  assert.equal(liveRangeListeners(startInput, endInput), 0);
});

test('DOM date-time range reconstruction retains formats, drafts and active IME across controlled adoption', () => {
  const format = createTemporalFormatter({ locale: 'en-US', timeZone: 'UTC' }).dateTimeFieldFormat('minute').value;
  const startInput = new FakeInput(), endInput = new FakeInput();
  const initial = { start: dateTimeAt(14, 9, 30), end: dateTimeAt(15, 17, 45) };
  let field = createDateTimeRangeField({ startInput, endInput, defaultValue: initial, format });
  try {
    assert.equal(startInput.inputMode, 'text');
    const committedStart = startInput.value, committedEnd = endInput.value;
    replaceInput(endInput, '10/');
    field.handleEvent({ type: 'focus', endpoint: 'end' });
    const restored = field.getSnapshot().state;
    field.disconnect();
    field = createDateTimeRangeField({ startInput, endInput, defaultState: restored, value: initial });
    assert.equal(endInput.value, '10/');
    assert.equal(field.getSnapshot().state.active, 'end');
    assert.equal(field.getSnapshot().state.end.format, format);
    field.handleEvent('cancel');
    assert.deepEqual([startInput.value, endInput.value], [committedStart, committedEnd]);
    startInput.setSelectionRange(0, startInput.value.length);
    startInput.emit('compositionstart');
    compositionInput(startInput, '한', 1);
    const composing = field.getSnapshot().state.start.inputState;
    assert.notEqual(composing.composition, null);
    const before = field.getValue();
    startInput.emit('keydown', keyboard('Enter'));
    assert.deepEqual(field.getValue(), before);
    assert.equal(field.syncControlledValues({ value: { start: dateTimeAt(14, 10), end: initial.end } }).ok, true);
    assert.deepEqual(field.getSnapshot().state.start.inputState, composing);
    assert.equal(startInput.value, '한');
  } finally { field.disconnect(); }
  assert.equal(liveRangeListeners(startInput, endInput), 0);
});

test('shared native range connection bounds listeners, rejects retired callbacks and rolls back failed construction', () => {
  for (let cycle = 0; cycle < 8; cycle++) {
    const startInput = new FakeInput(), endInput = new FakeInput();
    let updates = 0;
    const field = createDateTimeRangeField({ startInput, endInput, onUpdate: () => { updates++; } });
    assert.equal(liveRangeListeners(startInput, endInput), 14);
    const stale = [...startInput.listeners.get('focus'), ...startInput.listeners.get('keydown')];
    field.disconnect(); field.disconnect();
    assert.equal(liveRangeListeners(startInput, endInput), 0);
    const before = updates;
    for (const listener of stale) listener({ key: 'Enter', preventDefault() { assert.fail('retired key listener consumed input'); } });
    assert.equal(updates, before);
  }
  const startInput = new FakeInput(), endInput = new FakeInput();
  Object.defineProperty(endInput, 'value', { get() { throw new Error('native value unavailable'); } });
  assert.throws(() => createDateTimeRangeField({ startInput, endInput }));
  assert.equal(liveRangeListeners(startInput, endInput), 0);
  const invalidStart = new FakeInput(), invalidEnd = new FakeInput();
  assert.equal(tryCreateDateTimeRangeField({ startInput: invalidStart, endInput: invalidEnd,
    value: { start: dateTimeAt(15, 1), end: dateTimeAt(14, 23) },
  }).ok, false);
  assert.equal(liveRangeListeners(invalidStart, invalidEnd), 0);
});

test('native picker reconstruction admits its retained state and completes an unfinished range', () => {
  for (const [create, timed] of [[createDatePicker, false], [createMonthPicker, false], [createYearPicker, false],
    [createDateRangePicker, false], [createRangeCalendar, false], [createMonthRangePicker, false], [createYearRangePicker, false],
    [createDateTimePicker, true], [createDateTimeRangePicker, true]]) {
    const options = () => ({ root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement(), position: false, referenceDate: createDateValue(2026, 8, 1), defaultOpen: true });
    let picker = create(options());
    try {
      assert.equal(picker.handleEvent({ type: timed ? 'select-date' : 'select', value: createDateValue(2026, 8, 1) }), true);
      assert.equal(picker.handleEvent({ type: 'set-view-mode', value: 'year' }), true);
      const state = picker.getSnapshot().state; picker.disconnect();
      picker = create({ ...options(), defaultState: state, defaultOpen: (state.calendar ?? state).open });
      assert.deepEqual(picker.getSnapshot().state, state);
      if ('anchor' in state) {
        assert.notEqual(state.anchor, null);
        assert.equal(picker.handleEvent({ type: timed ? 'select-date' : 'select', value: createDateValue(2027, 9, 1) }), true);
        assert.equal(picker.getSnapshot().state.anchor, null); assert.notEqual(picker.getSnapshot().state.value, null);
      }
    } finally { picker.disconnect(); }
  }
});

test('editable picker reconstruction transfers recorded field drafts and settles detached IME through Core', () => {
  for (const [create, roles] of [[createDatePicker, ['input']],
    [createDateTimePicker, ['dateTime', 'date', 'time']], [createDateTimeRangePicker, ['startDate', 'endDate', 'startTime', 'endTime']]]) {
    const inputs = Object.fromEntries(roles.map(role => [role, new FakeInput()]));
    const options = { root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement(), position: false,
      ...Object.fromEntries(roles.map(role => [role === 'input' ? role : `${role}Input`, inputs[role]])) };
    let picker = create(options);
    try {
      const state = picker.getSnapshot().state;
      const drafts = Object.fromEntries(roles.map(role => [role, role === 'dateTime' ? '2026-08-18T10:' : role.toLowerCase().includes('time') ? '10:' : '2026-08-']));
      for (const role of roles) { const input = inputs[role]; input.setSelectionRange(0, input.value.length); input.emit('compositionstart'); compositionInput(input, drafts[role], drafts[role].length); }
      picker.suspend(); for (const input of Object.values(inputs)) replaceInput(input, 'unobserved');
      const fieldStates = picker.getFieldStates();
      for (const role of roles) { assert.equal(fieldStates[role].inputState.composition, null); assert.equal(fieldStates[role].inputState.snapshot.text, drafts[role]); }
      picker.disconnect(); picker = create({ ...options, defaultState: state, defaultFieldStates: fieldStates });
      for (const role of roles) { assert.equal(inputs[role].value, drafts[role]); assert.equal(inputs[role].selectionStart, drafts[role].length); }
      assert.deepEqual(picker.getSnapshot().state, state);
      picker.disconnect();
      const currentDate = createDateValue(2027, 9, 1), currentTime = createDateTimeValue(currentDate, createTimeValue(11, 45));
      const current = create === createDatePicker ? currentDate : create === createDateTimePicker ? currentTime : createDateTimeRange(currentTime, currentTime);
      picker = create({ ...options, defaultState: state, defaultFieldStates: fieldStates, value: current });
      assert.deepEqual(picker.getSnapshot().state.value, current);
      for (const role of roles) assert.equal(inputs[role].value, drafts[role]);
      picker.disconnect();
      assert.throws(() => create({ ...options, defaultFieldStates: { ...fieldStates, [roles[0]]: { ...fieldStates[roles[0]], inputState: {} } } }));
      for (const input of Object.values(inputs)) assert.equal([...input.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0), 0);
    } finally { picker.disconnect(); }
  }
});

test('civil scalar fields suspend native observation and retain IME drafts through the shared text owner', async () => {
  for (const [create, text] of [[createDateField, '2026-08-18'], [createTimeField, '09:30'], [createDateTimeField, '2026-08-18T09:30']]) {
    const input = new FakeInput(), field = create({ input, label: 'Civil input' });
    const listenerCount = () => [...input.listeners.values()].reduce((total, listeners) => total + listeners.size, 0);
    try {
      assert.equal(listenerCount(), 6);
      for (let cycle = 0; cycle < 3; cycle++) {
        const snapshot = field.getSnapshot(), staleKey = [...input.listeners.get('keydown')][0];
        field.suspend(); field.suspend(); assert.equal(listenerCount(), 0); assert.equal(field.getActive(), false);
        replaceInput(input, 'unobserved'); input.emit('blur'); staleKey.handleEvent({ type: 'keydown', ...keyboard('ArrowUp') });
        assert.equal(field.getSnapshot(), snapshot);
        field.resume(); field.resume(); assert.equal(field.getActive(), true); assert.equal(listenerCount(), 6);
        assert.equal(input.value, field.getText());
      }
      input.setSelectionRange(0, input.value.length); input.emit('compositionstart'); compositionInput(input, text, text.length);
      field.suspend(); const composing = field.getSnapshot();
      input.emit('compositionend'); replaceInput(input, 'unobserved'); await Promise.resolve();
      assert.equal(field.getSnapshot(), composing); field.resume();
      assert.equal(field.getSnapshot().state.inputState.composition, null); assert.equal(field.getText(), text); assert.equal(input.value, text);
      input.emit('keydown', keyboard('Enter')); assert.notEqual(field.getValue(), null);
      field.suspend(); const setAttribute = input.setAttribute, failure = new Error('Field projection failed');
      input.setAttribute = () => { throw failure; };
      assert.throws(() => field.resume(), error => error === failure); assert.equal(field.getActive(), false); assert.equal(listenerCount(), 0);
      input.setAttribute = setAttribute; field.resume(); assert.equal(listenerCount(), 6);
      field.disconnect(); field.disconnect(); field.resume(); assert.equal(field.getActive(), false); assert.equal(listenerCount(), 0);
      const terminal = field.getSnapshot(); replaceInput(input, 'unobserved'); input.emit('blur'); assert.equal(field.getSnapshot(), terminal);
    } finally { field.disconnect(); }
  }
});

test('date picker suspends its editable field, rejects stale focus and drains projection failures', async () => {
  const root = new FakeElement(), grid = new FakeElement(), trigger = new FakeElement(), input = new FakeInput();
  let focuses = 0, failUpdate = false; const failure = new Error('Picker projection failed');
  grid.querySelector = () => ({ focus: () => { focuses++; } });
  const picker = createDatePicker({ root, grid, trigger, input, position: false, defaultOpen: true,
    referenceDate: createDateValue(2026, 1, 1), onUpdate: () => { if (failUpdate) throw failure; } });
  const listeners = () => [grid, trigger, input].reduce((sum, element) => sum + [...element.listeners.values()].reduce((total, values) => total + values.size, 0), 0);
  try {
    assert.equal(listeners(), 9);
    picker.handleEvent('next-month'); const snapshot = picker.getSnapshot();
    picker.suspend(); picker.resume(); await Promise.resolve(); assert.equal(focuses, 0, 'previous activation focus cannot replay');
    for (let cycle = 0; cycle < 3; cycle++) {
      picker.suspend(); picker.suspend(); assert.equal(listeners(), 0); assert.equal(picker.getActive(), false);
      replaceInput(input, 'unobserved'); trigger.emit('click'); grid.emit('keydown', keyboard('ArrowRight'));
      picker.refresh(); assert.equal(picker.getSnapshot(), snapshot); assert.equal(root.hidden, true);
      picker.resume(); picker.resume(); assert.equal(listeners(), 9); assert.equal(picker.getActive(), true); assert.equal(root.hidden, false);
    }
    input.setSelectionRange(0, input.value.length); input.emit('compositionstart'); compositionInput(input, '2026-03-18', 10);
    picker.suspend(); replaceInput(input, 'unobserved'); picker.resume(); assert.equal(input.value, '2026-03-18');
    input.emit('keydown', keyboard('Enter')); assert.equal(formatDateValue(picker.getSnapshot().state.value), '2026-03-18');
    failUpdate = true; assert.throws(() => picker.suspend(), error => error === failure); assert.equal(listeners(), 0);
    assert.throws(() => picker.resume(), error => error === failure); assert.equal(listeners(), 0); assert.equal(picker.getActive(), false);
    failUpdate = false; picker.resume(); assert.equal(listeners(), 9);
    failUpdate = true; assert.throws(() => picker.disconnect(), error => error === failure);
    picker.resume(); picker.refresh(); assert.equal(picker.getActive(), false); assert.equal(listeners(), 0);
  } finally { failUpdate = false; picker.disconnect(); }
});

test('date range picker retains its incomplete endpoint anchor while native observation suspends', async () => {
  const root = new FakeElement(), grid = new FakeElement(), trigger = new FakeElement();
  let focuses = 0, failUpdate = false; const failure = new Error('Range projection failed');
  grid.querySelector = () => ({ focus: () => { focuses++; } });
  const picker = createDateRangePicker({ root, grid, trigger, position: false, defaultOpen: true,
    referenceDate: createDateValue(2026, 1, 1), onUpdate: () => { if (failUpdate) throw failure; } });
  const listeners = () => [grid, trigger].reduce((sum, element) => sum + [...element.listeners.values()].reduce((total, values) => total + values.size, 0), 0);
  try {
    picker.handleEvent({ type: 'select', value: createDateValue(2026, 3, 18) });
    picker.handleEvent('next-day'); const snapshot = picker.getSnapshot(); assert.notEqual(snapshot.state.anchor, null);
    picker.suspend(); picker.resume(); await Promise.resolve(); assert.equal(focuses, 0);
    for (let cycle = 0; cycle < 3; cycle++) {
      picker.suspend(); picker.suspend(); assert.equal(listeners(), 0); assert.equal(picker.getActive(), false);
      trigger.emit('click'); grid.emit('keydown', keyboard('ArrowRight')); picker.refresh(); assert.equal(picker.getSnapshot(), snapshot);
      picker.resume(); picker.resume(); assert.equal(listeners(), 3); assert.equal(picker.getActive(), true); assert.equal(root.hidden, false);
    }
    picker.handleEvent({ type: 'select', value: createDateValue(2026, 3, 20) });
    assert.equal(formatDateValue(picker.getSnapshot().state.value.start), '2026-03-18');
    assert.equal(formatDateValue(picker.getSnapshot().state.value.end), '2026-03-20');
    failUpdate = true; assert.throws(() => picker.suspend(), error => error === failure); assert.equal(listeners(), 0);
    assert.throws(() => picker.resume(), error => error === failure); assert.equal(listeners(), 0);
    failUpdate = false; picker.resume(); assert.equal(listeners(), 3);
    failUpdate = true; assert.throws(() => picker.disconnect(), error => error === failure);
    picker.resume(); picker.refresh(); assert.equal(listeners(), 0); assert.equal(picker.getActive(), false);
  } finally { failUpdate = false; picker.disconnect(); }
});

test('compound date-time pickers suspend every field and roll back partial native resumption', async () => {
  for (const create of [createDateTimePicker, createDateTimeRangePicker]) {
    const range = create === createDateTimeRangePicker;
    const names = range ? ['startDateInput', 'endDateInput', 'startTimeInput', 'endTimeInput'] : ['dateTimeInput', 'dateInput', 'timeInput'];
    const fields = Object.fromEntries(names.map(name => [name, new FakeInput()]));
    const root = new FakeElement(), grid = new FakeElement(), trigger = new FakeElement();
    const start = createDateTimeValue(createDateValue(2026, 8, 18), createTimeValue(9, 30));
    const end = createDateTimeValue(createDateValue(2026, 8, 20), createTimeValue(10, 30));
    let focuses = 0, failUpdate = false; const failure = new Error('Compound projection failed');
    grid.querySelector = () => ({ focus: () => { focuses++; } });
    const picker = create({ root, grid, trigger, ...fields, position: false, defaultOpen: true,
      defaultValue: range ? createDateTimeRange(start, end) : start,
      onUpdate: () => { if (failUpdate) throw failure; } });
    const inputs = Object.values(fields), peak = 3 + 6 * inputs.length;
    const listeners = () => [grid, trigger, ...inputs].reduce((sum, element) => sum + [...element.listeners.values()].reduce((total, values) => total + values.size, 0), 0);
    try {
      assert.equal(listeners(), peak); picker.handleEvent('next-day'); const snapshot = picker.getSnapshot();
      picker.suspend(); picker.resume(); await Promise.resolve(); assert.equal(focuses, 0);
      for (let cycle = 0; cycle < 3; cycle++) {
        picker.suspend(); assert.equal(listeners(), 0); assert.equal(picker.getActive(), false);
        for (const input of inputs) { replaceInput(input, 'unobserved'); input.emit('blur'); }
        grid.emit('keydown', keyboard('ArrowRight')); trigger.emit('click'); picker.refresh(); assert.equal(picker.getSnapshot(), snapshot);
        picker.resume(); assert.equal(listeners(), peak); assert.equal(picker.getActive(), true);
      }
      const drafts = inputs.map(input => input.value.includes('-') ? input.value.replace('18', '19') : '10:45');
      inputs.forEach((input, index) => { input.setSelectionRange(0, input.value.length); input.emit('compositionstart'); compositionInput(input, drafts[index], drafts[index].length); });
      picker.suspend(); inputs.forEach(input => replaceInput(input, 'unobserved')); picker.resume();
      assert.deepEqual(inputs.map(input => input.value), drafts); assert.equal(picker.getSnapshot(), snapshot);
      picker.suspend(); const last = inputs.at(-1), type = last.type;
      Object.defineProperty(last, 'type', { configurable: true, get: () => type, set: () => { throw failure; } });
      assert.throws(() => picker.resume(), error => error === failure); assert.equal(listeners(), 0); assert.equal(picker.getActive(), false);
      Object.defineProperty(last, 'type', { configurable: true, writable: true, value: type });
      picker.resume(); assert.equal(listeners(), peak);
      failUpdate = true; assert.throws(() => picker.suspend(), error => error === failure); assert.equal(listeners(), 0);
      assert.throws(() => picker.resume(), error => error === failure); assert.equal(listeners(), 0);
      failUpdate = false; picker.resume(); failUpdate = true;
      assert.throws(() => picker.disconnect(), error => error === failure); picker.resume(); picker.refresh(); assert.equal(listeners(), 0); assert.equal(picker.getActive(), false);
    } finally { failUpdate = false; picker.disconnect(); }
  }
});

test('DOM date field projects native interaction and caret segment stepping', () => {
  const input = new FakeInput();
  const field = createDateField({ input, defaultValue: createDateValue(2024, 1, 31) });
  input.setSelectionRange(5, 5);
  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(formatDateValue(field.getValue()), '2024-02-29');
  assert.equal(input.inputMode, 'numeric');
  assert.equal(input.placeholder, 'YYYY-MM-DD');
});

test('locale date fields preserve format through stepping, controlled draft sync and teardown', () => {
  const input = new FakeInput(), projected = createTemporalFormatter({ locale: 'en-GB', timeZone: 'UTC' }).dateFieldFormat();
  assert.equal(projected.ok, true);
  const field = createDateField({ input, value: createDateValue(2026, 10, 14), format: projected.value });
  try {
    assert.equal(input.value, '14/10/2026'); assert.equal(input.placeholder, 'DD/MM/YYYY');
    input.setSelectionRange(0, 2);
    assert.equal(field.syncControlledValues({ value: createDateValue(2026, 10, 15) }).ok, true);
    assert.equal(input.value, '15/10/2026'); assert.deepEqual([input.selectionStart, input.selectionEnd], [0, 2]);
    input.emit('keydown', keyboard('ArrowUp'));
    assert.equal(field.getSnapshot().state.format, projected.value);
    replaceInput(input, '16/10/');
    assert.equal(field.syncControlledValues({ value: createDateValue(2026, 11, 20) }).ok, true);
    assert.equal(input.value, '16/10/'); assert.equal(formatDateValue(field.getValue()), '2026-11-20');
    field.handleEvent('cancel'); assert.equal(input.value, '20/11/2026');
    input.setSelectionRange(3, 5); input.emit('compositionstart', { data: '' });
    compositionInput(input, '20/구/2026', 4);
    const composing = field.getSnapshot().state.inputState;
    field.syncControlledValues({ value: createDateValue(2026, 12, 20) });
    assert.deepEqual(field.getSnapshot().state.inputState, composing);
  } finally { field.disconnect(); }
  assert.equal([...input.listeners.values()].reduce((total, set) => total + set.size, 0), 0);
});

test('non-native locale stepping uses logical segments while native date retains ISO projection', () => {
  const format = createTemporalFormatter({ locale: 'en-US', timeZone: 'UTC' }).dateFieldFormat().value;
  const input = new FakeInput(), nativeInput = new FakeInput();
  const field = createDateField({ input, defaultValue: createDateValue(2026, 10, 14), format });
  const native = createDateField({ input: nativeInput, defaultValue: createDateValue(2026, 10, 14), native: true, format });
  try {
    input.setSelectionRange(3, 3); input.emit('keydown', keyboard('ArrowUp'));
    assert.equal(input.value, '10/15/2026'); assert.equal(formatDateValue(field.getValue()), '2026-10-15');
    assert.deepEqual([input.selectionStart, input.selectionEnd], [3, 5]);
    assert.equal(nativeInput.type, 'date'); assert.equal(nativeInput.value, '2026-10-14');
    assert.equal(native.getSnapshot().state.format, undefined); assert.equal(nativeInput.placeholder, '');
  } finally { field.disconnect(); native.disconnect(); }
});

test('locale time binding preserves controlled selection, drafts, IME and precision rejection', () => {
  const format = createTemporalFormatter({ locale: 'en-GB', timeZone: 'UTC' }).timeFieldFormat().value;
  const input = new FakeInput(), field = createTimeField({ input, value: createTimeValue(15, 24), format });
  try {
    assert.equal(input.value, '15:24'); assert.equal(input.placeholder, 'HH:mm');
    input.setSelectionRange(3, 5);
    assert.equal(field.syncControlledValues({ value: createTimeValue(15, 25) }).ok, true);
    assert.equal(input.value, '15:25'); assert.deepEqual([input.selectionStart, input.selectionEnd], [3, 5]);
    const previous = field.getSnapshot();
    const invalid = field.syncControlledValues({ value: createTimeValue(15, 25, 1) });
    assert.equal(invalid.ok, false); assert.equal(invalid.error.code, 'time-field-format-precision-loss');
    assert.equal(field.getSnapshot(), previous); assert.equal(input.value, '15:25');
    replaceInput(input, '15:');
    assert.equal(field.syncControlledValues({ value: createTimeValue(16, 26) }).ok, true);
    assert.equal(input.value, '15:'); assert.deepEqual(field.getValue(), createTimeValue(16, 26));
    field.handleEvent('cancel'); assert.equal(input.value, '16:26');
    input.setSelectionRange(3, 5); input.emit('compositionstart', { data: '' });
    compositionInput(input, '16:구', 4);
    const composing = field.getSnapshot().state.inputState;
    assert.equal(field.syncControlledValues({ value: createTimeValue(17, 27) }).ok, true);
    assert.deepEqual(field.getSnapshot().state.inputState, composing);
  } finally { field.disconnect(); }
  assert.equal([...input.listeners.values()].reduce((total, set) => total + set.size, 0), 0);
});

test('locale half-day input exposes editable period while native input remains ISO', () => {
  const format = createTemporalFormatter({ locale: 'en-US', timeZone: 'UTC' }).timeFieldFormat().value;
  const input = new FakeInput(), nativeInput = new FakeInput();
  const field = createTimeField({ input, defaultValue: createTimeValue(15, 24), format });
  const native = createTimeField({ input: nativeInput, defaultValue: createTimeValue(15, 24), native: true, format });
  try {
    assert.equal(input.value, `03:24${format.literals[2]}PM`);
    assert.equal(getTimeFieldPlaceholder(format), `hh:mm${format.literals[2]}AM/PM`);
    assert.equal(input.inputMode, 'text');
    input.setSelectionRange(input.value.length - 2, input.value.length);
    input.emit('keydown', keyboard('ArrowUp'));
    assert.equal(field.getValue().hour, 3); assert.equal(field.getSnapshot().state.format, format);
    assert.equal(nativeInput.type, 'time'); assert.equal(nativeInput.value, '15:24');
    assert.equal(native.getSnapshot().state.format, undefined); assert.equal(nativeInput.placeholder, '');
  } finally { field.disconnect(); native.disconnect(); }
  assert.equal([...input.listeners.values(), ...nativeInput.listeners.values()].reduce((total, set) => total + set.size, 0), 0);
});

test('localized date range bindings retain both formats through controlled drafts and composition', () => {
  const format = createTemporalFormatter({ locale: 'en-GB', timeZone: 'UTC' }).dateFieldFormat().value;
  const startInput = new FakeInput(), endInput = new FakeInput();
  const field = createDateRangeField({ startInput, endInput, value: createDateRange(createDateValue(2026, 10, 14), createDateValue(2026, 11, 1)), format });
  try {
    assert.equal(startInput.value, '14/10/2026'); assert.equal(endInput.value, '01/11/2026'); assert.equal(endInput.placeholder, 'DD/MM/YYYY');
    replaceInput(endInput, '01/11/'); startInput.setSelectionRange(0, 2);
    field.syncControlledValues({ value: createDateRange(createDateValue(2026, 10, 15), createDateValue(2026, 11, 2)) });
    assert.equal(startInput.value, '15/10/2026'); assert.deepEqual([startInput.selectionStart, startInput.selectionEnd], [0, 2]); assert.equal(endInput.value, '01/11/');
    field.handleEvent('cancel'); assert.equal(endInput.value, '02/11/2026'); assert.equal(field.getSnapshot().state.end.format, format);
    endInput.setSelectionRange(3, 5); endInput.emit('compositionstart', { data: '' }); compositionInput(endInput, '02/구/2026', 4);
    const composing = field.getSnapshot().state.end.inputState;
    field.syncControlledValues({ value: createDateRange(createDateValue(2026, 10, 16), createDateValue(2026, 12, 2)) });
    assert.deepEqual(field.getSnapshot().state.end.inputState, composing); assert.equal(field.getSnapshot().state.start.format, format);
  } finally { field.disconnect(); }
  assert.equal([...startInput.listeners.values(), ...endInput.listeners.values()].reduce((total, set) => total + set.size, 0), 0);
});

test('locale date-time input preserves controlled selection, draft, IME and precision rejection', () => {
  const format = createTemporalFormatter({ locale: 'en-GB', timeZone: 'UTC' }).dateTimeFieldFormat().value;
  const input = new FakeInput();
  const initial = createDateTimeValue(createDateValue(2026, 10, 14), createTimeValue(15, 24));
  const field = createDateTimeField({ input, value: initial, format });
  try {
    assert.equal(input.value, '14/10/2026, 15:24'); assert.equal(input.placeholder, 'DD/MM/YYYY, HH:mm');
    input.setSelectionRange(12, 14);
    assert.equal(field.syncControlledValues({ value: createDateTimeValue(initial.date, createTimeValue(16, 25)) }).ok, true);
    assert.equal(input.value, '14/10/2026, 16:25'); assert.deepEqual([input.selectionStart, input.selectionEnd], [12, 14]);
    const previous = field.getSnapshot();
    const invalid = field.syncControlledValues({ value: createDateTimeValue(createDateValue(2026, 11, 15), createTimeValue(17, 30, 1)) });
    assert.equal(invalid.ok, false); assert.equal(invalid.error.code, 'time-field-format-precision-loss'); assert.equal(field.getSnapshot(), previous);
    assert.equal(input.value, '14/10/2026, 16:25');
    replaceInput(input, '14/10/');
    assert.equal(field.syncControlledValues({ value: createDateTimeValue(createDateValue(2026, 11, 15), createTimeValue(17, 30)) }).ok, true);
    assert.equal(input.value, '14/10/'); field.handleEvent('cancel'); assert.equal(input.value, '15/11/2026, 17:30');
    input.setSelectionRange(12, 14); input.emit('compositionstart', { data: '' }); compositionInput(input, '15/11/2026, 구:30', 13);
    const composing = field.getSnapshot().state.inputState;
    assert.equal(field.syncControlledValues({ value: createDateTimeValue(createDateValue(2026, 12, 15), createTimeValue(18, 30)) }).ok, true);
    assert.deepEqual(field.getSnapshot().state.inputState, composing); assert.equal(field.getSnapshot().state.format, format);
  } finally { field.disconnect(); }
  assert.equal([...input.listeners.values()].reduce((total, set) => total + set.size, 0), 0);
});

test('locale date-time placeholder composes owners while native mode retains ISO', () => {
  const format = createTemporalFormatter({ locale: 'en-US', timeZone: 'UTC' }).dateTimeFieldFormat().value;
  const input = new FakeInput(), nativeInput = new FakeInput();
  const value = createDateTimeValue(createDateValue(2026, 10, 14), createTimeValue(15, 24));
  const field = createDateTimeField({ input, defaultValue: value, format });
  const native = createDateTimeField({ input: nativeInput, defaultValue: value, native: true, format });
  try {
    assert.equal(input.placeholder, getDateTimeFieldPlaceholder(format)); assert.match(input.placeholder, /AM\/PM/u);
    input.setSelectionRange(input.value.length - 2, input.value.length); input.emit('keydown', keyboard('ArrowUp'));
    assert.equal(field.getValue().time.hour, 3); assert.deepEqual(field.getValue().date, value.date);
    assert.equal(field.getSnapshot().state.format, format);
    assert.equal(nativeInput.type, 'datetime-local'); assert.equal(nativeInput.value, '2026-10-14T15:24');
    assert.equal(nativeInput.placeholder, ''); assert.equal(native.getSnapshot().state.format, undefined);
  } finally { field.disconnect(); native.disconnect(); }
  assert.equal([...input.listeners.values(), ...nativeInput.listeners.values()].reduce((total, set) => total + set.size, 0), 0);
});

test('locale time ranges retain controlled drafts and reject precision without partial mutation', () => {
  const format = createTemporalFormatter({ locale: 'en-US', timeZone: 'UTC' }).timeFieldFormat().value;
  const startInput = new FakeInput(), endInput = new FakeInput();
  const field = createTimeRangeField({ startInput, endInput, value: createTimeRange(createTimeValue(9, 30), createTimeValue(17, 45)), format });
  try {
    assert.equal(startInput.value, `09:30${format.literals[2]}AM`); assert.equal(endInput.value, `05:45${format.literals[2]}PM`);
    assert.equal(startInput.inputMode, 'text'); assert.equal(endInput.placeholder, getTimeFieldPlaceholder(format));
    replaceInput(endInput, '05:'); startInput.setSelectionRange(0, 2);
    assert.equal(field.syncControlledValues({ value: createTimeRange(createTimeValue(10, 30), createTimeValue(18, 45)) }).ok, true);
    assert.equal(startInput.value, `10:30${format.literals[2]}AM`); assert.deepEqual([startInput.selectionStart, startInput.selectionEnd], [0, 2]);
    assert.equal(endInput.value, '05:'); field.handleEvent('cancel'); assert.equal(endInput.value, `06:45${format.literals[2]}PM`);
    const previous = field.getSnapshot();
    const rejected = field.syncControlledValues({ value: createTimeRange(createTimeValue(11, 0), createTimeValue(19, 0, 1)) });
    assert.equal(rejected.ok, false); assert.equal(rejected.error.code, 'time-field-format-precision-loss'); assert.equal(field.getSnapshot(), previous);
    assert.equal(startInput.value, `10:30${format.literals[2]}AM`); assert.equal(endInput.value, `06:45${format.literals[2]}PM`);
    endInput.setSelectionRange(0, 2); endInput.emit('compositionstart', { data: '' }); compositionInput(endInput, '구:45', 1);
    const composing = field.getSnapshot().state.end.inputState;
    assert.equal(field.syncControlledValues({ value: createTimeRange(createTimeValue(11, 0), createTimeValue(19, 0)) }).ok, true);
    assert.deepEqual(field.getSnapshot().state.end.inputState, composing); assert.equal(field.getSnapshot().state.start.format, format);
  } finally { field.disconnect(); }
  assert.equal([...startInput.listeners.values(), ...endInput.listeners.values()].reduce((total, set) => total + set.size, 0), 0);
});

test('restored localized partial time range survives input-state sync and preserves controlled priority', () => {
  const format = createTemporalFormatter({ locale: 'en-GB', timeZone: 'UTC' }).timeFieldFormat().value;
  const startInput = new FakeInput(), endInput = new FakeInput();
  let field = createTimeRangeField({ startInput, endInput, format });
  try {
    field.handleEvent({ type: 'field', endpoint: 'start', event: { type: 'set-value', value: createTimeValue(9, 30) } });
    field.handleEvent({ type: 'focus', endpoint: 'end' });
    const state = field.getSnapshot().state; field.disconnect();
    field = createTimeRangeField({ startInput, endInput, defaultState: state });
    assert.equal(field.syncControlledValues({}).ok, true); field.handleEvent('cancel');
    assert.deepEqual([startInput.value, endInput.value], ['09:30', '']); assert.equal(field.getSnapshot().state.active, 'end');
    assert.equal(field.getSnapshot().state.start.format, format); assert.equal(field.getSnapshot().state.end.format, format);
    field.disconnect();
    field = createTimeRangeField({ startInput, endInput, defaultState: state, value: createTimeRange(createTimeValue(10, 0), createTimeValue(18, 0)) });
    field.handleEvent('cancel'); assert.deepEqual([startInput.value, endInput.value], ['10:00', '18:00']);
  } finally { field.disconnect(); }
});

test('date range reconstruction restores partial endpoint values and formats while controlled values take priority', () => {
  const format = createTemporalFormatter({ locale: 'en-GB', timeZone: 'UTC' }).dateFieldFormat().value;
  const startInput = new FakeInput(), endInput = new FakeInput();
  let field = createDateRangeField({ startInput, endInput, format });
  try {
    field.handleEvent({ type: 'field', endpoint: 'start', event: { type: 'set-value', value: createDateValue(2026, 10, 14) } });
    field.handleEvent({ type: 'focus', endpoint: 'end' });
    const state = field.getSnapshot().state; field.disconnect();
    field = createDateRangeField({ startInput, endInput, defaultState: state });
    field.handleEvent('cancel');
    assert.deepEqual([startInput.value, endInput.value], ['14/10/2026', '']);
    assert.equal(field.getSnapshot().state.active, 'end');
    assert.equal(field.getSnapshot().state.start.format, format);
    field.disconnect();
    field = createDateRangeField({ startInput, endInput, defaultState: state,
      value: createDateRange(createDateValue(2026, 11, 1), createDateValue(2026, 11, 2)) });
    field.handleEvent('cancel');
    assert.deepEqual([startInput.value, endInput.value], ['01/11/2026', '02/11/2026']);
  } finally { field.disconnect(); }
  assert.equal([...startInput.listeners.values(), ...endInput.listeners.values()].reduce((total, listeners) => total + listeners.size, 0), 0);
});

test('time range reconstruction restores partial endpoint values while controlled values take priority', () => {
  const startInput = new FakeInput(), endInput = new FakeInput();
  let field = createTimeRangeField({ startInput, endInput });
  try {
    field.handleEvent({ type: 'field', endpoint: 'start', event: { type: 'set-value', value: createTimeValue(9, 30) } });
    field.handleEvent({ type: 'focus', endpoint: 'end' });
    const state = field.getSnapshot().state; field.disconnect();
    field = createTimeRangeField({ startInput, endInput, defaultState: state });
    field.handleEvent('cancel'); assert.deepEqual([startInput.value, endInput.value], ['09:30', '']);
    assert.equal(field.getSnapshot().state.active, 'end'); field.disconnect();
    field = createTimeRangeField({ startInput, endInput, defaultState: state, value: createTimeRange(createTimeValue(10, 30), createTimeValue(18, 30)) });
    field.handleEvent('cancel'); assert.deepEqual([startInput.value, endInput.value], ['10:30', '18:30']);
  } finally { field.disconnect(); }
  assert.equal([...startInput.listeners.values(), ...endInput.listeners.values()].reduce((total, listeners) => total + listeners.size, 0), 0);
});

test('controlled DOM civil fields rebase clean inputs and preserve active selections', () => {
  const dateInput = new FakeInput();
  const dateField = createDateField({ input: dateInput, value: createDateValue(2026, 8, 18) });
  dateInput.setSelectionRange(5, 7);
  dateField.syncControlledValues({ value: createDateValue(2026, 9, 18) });
  assert.equal(dateInput.value, '2026-09-18');
  assert.deepEqual([dateInput.selectionStart, dateInput.selectionEnd], [5, 7]);

  const timeInput = new FakeInput();
  const timeField = createTimeField({ input: timeInput, value: createTimeValue(9, 30) });
  timeInput.setSelectionRange(0, 2);
  timeField.syncControlledValues({ value: createTimeValue(10, 30) });
  assert.equal(timeInput.value, '10:30');
  assert.deepEqual([timeInput.selectionStart, timeInput.selectionEnd], [0, 2]);

  const dateTimeInput = new FakeInput();
  const dateTimeField = createDateTimeField({
    input: dateTimeInput,
    value: createDateTimeValue(createDateValue(2026, 8, 18), createTimeValue(9, 30)),
  });
  dateTimeInput.setSelectionRange(5, 7);
  dateTimeField.syncControlledValues({
    value: createDateTimeValue(createDateValue(2026, 9, 18), createTimeValue(9, 30)),
  });
  assert.equal(dateTimeInput.value, '2026-09-18T09:30');
  assert.deepEqual([dateTimeInput.selectionStart, dateTimeInput.selectionEnd], [5, 7]);
});

test('ISSUE-141: date field preserves backward selection through the shared text binding', () => {
  const input = new FakeInput();
  const field = createDateField({ input, defaultValue: createDateValue(2026, 8, 18) });
  input.value = '2026-09-18';
  input.setSelectionRange(5, 7, 'backward');
  input.emit('input', { inputType: 'insertReplacementText' });

  assert.equal(field.getText(), '2026-09-18');
  assert.deepEqual(
    [input.selectionStart, input.selectionEnd, input.selectionDirection],
    [5, 7, 'backward'],
  );
  assert.deepEqual(field.getSnapshot().state.inputState.snapshot.selection, {
    anchorCodeUnitOffset: 7,
    focusCodeUnitOffset: 5,
    startCodeUnitOffset: 5,
    endCodeUnitOffset: 7,
    direction: 'backward',
  });
});

test('controlled DOM civil fields preserve active drafts during external value sync', () => {
  const input = new FakeInput();
  const field = createDateField({ input, value: createDateValue(2026, 8, 18) });
  replaceInput(input, '2026-0');
  field.syncControlledValues({ value: createDateValue(2026, 9, 18) });
  assert.equal(input.value, '2026-0');
  assert.equal(field.getText(), '2026-0');
  assert.equal(formatDateValue(field.getValue()), '2026-09-18');
});

test('controlled DOM range fields rebase clean endpoints and preserve selected segments', () => {
  const startDateInput = new FakeInput();
  const endDateInput = new FakeInput();
  const dateField = createDateRangeField({
    startInput: startDateInput,
    endInput: endDateInput,
    value: createDateRange(createDateValue(2026, 8, 18), createDateValue(2026, 8, 21)),
  });
  startDateInput.setSelectionRange(5, 7);
  endDateInput.setSelectionRange(8, 10);
  dateField.syncControlledValues({
    value: createDateRange(createDateValue(2026, 9, 18), createDateValue(2026, 9, 22)),
  });
  assert.equal(startDateInput.value, '2026-09-18');
  assert.equal(endDateInput.value, '2026-09-22');
  assert.deepEqual([startDateInput.selectionStart, startDateInput.selectionEnd], [5, 7]);
  assert.deepEqual([endDateInput.selectionStart, endDateInput.selectionEnd], [8, 10]);

  const startTimeInput = new FakeInput();
  const endTimeInput = new FakeInput();
  const timeField = createTimeRangeField({
    startInput: startTimeInput,
    endInput: endTimeInput,
    value: createTimeRange(createTimeValue(9, 30), createTimeValue(17, 45)),
  });
  startTimeInput.setSelectionRange(0, 2);
  endTimeInput.setSelectionRange(3, 5);
  timeField.syncControlledValues({
    value: createTimeRange(createTimeValue(10, 30), createTimeValue(17, 50)),
  });
  assert.equal(startTimeInput.value, '10:30');
  assert.equal(endTimeInput.value, '17:50');
  assert.deepEqual([startTimeInput.selectionStart, startTimeInput.selectionEnd], [0, 2]);
  assert.deepEqual([endTimeInput.selectionStart, endTimeInput.selectionEnd], [3, 5]);
});

test('controlled DOM civil field sync does not disturb active composition metadata', () => {
  const input = new FakeInput();
  const field = createDateField({ input, value: createDateValue(2026, 8, 18) });
  input.setSelectionRange(5, 7);
  input.emit('compositionstart', { data: '' });
  compositionInput(input, '2026-구-18', 6);
  const composing = field.getSnapshot().state.inputState;
  assert.notEqual(composing.composition, null);

  field.syncControlledValues({ value: createDateValue(2026, 9, 18) });
  assert.deepEqual(field.getSnapshot().state.inputState, composing);
  assert.equal(input.attributes.get('aria-invalid'), 'false');
});

test('DOM date range field keeps endpoint drafts independent and commits an ordered range', () => {
  const startInput = new FakeInput();
  const endInput = new FakeInput();
  const field = createDateRangeField({ startInput, endInput });
  const start = createDateValue(2026, 8, 22);
  const end = createDateValue(2026, 8, 28);

  assert.equal(field.handleEvent({ type: 'field', endpoint: 'start', event: { type: 'set-value', value: start } }), true);
  assert.equal(field.getValue(), null);
  assert.equal(field.handleEvent({ type: 'field', endpoint: 'end', event: { type: 'set-value', value: end } }), true);
  assert.equal(formatDateValue(field.getValue().start), '2026-08-22');
  assert.equal(formatDateValue(field.getValue().end), '2026-08-28');
  assert.equal(startInput.placeholder, 'YYYY-MM-DD');
  assert.equal(endInput.placeholder, 'YYYY-MM-DD');
});

test('DOM date range field increments the segment under the endpoint caret', () => {
  const startInput = new FakeInput();
  const endInput = new FakeInput();
  const field = createDateRangeField({
    startInput,
    endInput,
    defaultValue: createDateRange(
      createDateValue(2026, 8, 22),
      createDateValue(2026, 10, 28),
    ),
  });

  startInput.setSelectionRange(5, 5);
  startInput.emit('keydown', keyboard('ArrowUp'));

  assert.equal(formatDateValue(field.getValue().start), '2026-09-22');
  assert.equal(formatDateValue(field.getValue().end), '2026-10-28');
});

test('DOM date range field rejects inverted controlled proposals', () => {
  const value = createDateRange(
    createDateValue(2026, 8, 22),
    createDateValue(2026, 8, 28),
  );
  const field = createDateRangeField({ startInput: new FakeInput(), endInput: new FakeInput(), value });
  assert.equal(field.handleEvent({ type: 'field', endpoint: 'end', event: { type: 'set-value', value: createDateValue(2026, 8, 20) } }), false);
  assert.equal(formatDateValue(field.getValue().end), '2026-08-28');
});

test('DOM time range field commits ordered wall-clock endpoints', () => {
  const field = createTimeRangeField({ startInput: new FakeInput(), endInput: new FakeInput() });
  field.handleEvent({ type: 'field', endpoint: 'start', event: { type: 'set-value', value: createTimeValue(9, 30) } });
  assert.equal(field.getValue(), null);
  field.handleEvent({ type: 'field', endpoint: 'end', event: { type: 'set-value', value: createTimeValue(17, 45) } });
  assert.equal(formatTimeValue(field.getValue().start), '09:30');
  assert.equal(formatTimeValue(field.getValue().end), '17:45');
});

test('DOM time fields increment the hour under the caret instead of the minute', () => {
  const input = new FakeInput();
  const field = createTimeField({ input, defaultValue: createTimeValue(9, 30) });
  input.setSelectionRange(0, 0);
  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(formatTimeValue(field.getValue()), '10:30');

  const startInput = new FakeInput();
  const endInput = new FakeInput();
  const range = createTimeRangeField({
    startInput,
    endInput,
    defaultValue: { start: createTimeValue(9, 30), end: createTimeValue(17, 45) },
  });
  startInput.setSelectionRange(0, 0);
  startInput.emit('keydown', keyboard('ArrowUp'));
  assert.equal(formatTimeValue(range.getValue().start), '10:30');
  assert.equal(formatTimeValue(range.getValue().end), '17:45');
});

test('DOM date picker composes an editable date field with calendar selection', () => {
  const input = new FakeInput();
  const picker = createDatePicker({
    root: new FakeElement(),
    grid: new FakeElement(),
    trigger: new FakeElement(),
    input,
    defaultValue: createDateValue(2024, 1, 31),
  });

  input.value = '2024-02-12';
  input.setSelectionRange(input.value.length, input.value.length);
  input.emit('input', { inputType: 'insertText' });
  input.emit('keydown', keyboard('Enter'));

  assert.equal(formatDateValue(picker.getSnapshot().state.value), '2024-02-12');
  assert.equal(input.readOnly, false);
});

test('ISSUE-138: day-picker families keep a keyboard entry when controlled highlight is unavailable', () => {
  const highlighted = createDateValue(2026, 9, 15);
  const sibling = createDateValue(2026, 9, 16);
  const dayPolicies = (unavailable) => ({ unavailable });
  const dateTimePolicies = (unavailable) => ({ date: { unavailable } });
  for (const [name, create, policies] of [
    ['date', createDatePicker, dayPolicies],
    ['range-calendar', createRangeCalendar, dayPolicies],
    ['date-range', createDateRangePicker, dayPolicies],
    ['date-time', createDateTimePicker, dateTimePolicies],
    ['date-time-range', createDateTimeRangePicker, dateTimePolicies],
  ]) {
    let blocked = true;
    const grid = new FakeElement();
    grid.tabIndex = -1;
    const picker = create({
      root: new FakeElement(),
      grid,
      trigger: new FakeElement(),
      highlightedValue: highlighted,
      defaultOpen: true,
      position: false,
      policies: policies((value) => blocked && formatDateValue(value) === '2026-09-15'),
    });
    try {
      const highlightedCell = new FakeElement();
      const siblingCell = new FakeElement();
      picker.setCellAttributes(highlightedCell, highlighted);
      picker.setCellAttributes(siblingCell, sibling);
      assert.equal(highlightedCell.disabled, true, `${name} disables unavailable highlight`);
      assert.equal(highlightedCell.getAttribute('aria-disabled'), 'true', `${name} exposes unavailable semantics`);
      assert.deepEqual(
        [grid.tabIndex, highlightedCell.tabIndex, siblingCell.tabIndex],
        [0, -1, -1],
        `${name} uses the grid root as the sole entry`,
      );
      const state = picker.getSnapshot().state;
      const semanticHighlight = 'calendar' in state ? state.calendar.highlighted : state.highlighted;
      assert.equal(formatDateValue(semanticHighlight), '2026-09-15', `${name} preserves controlled highlight`);

      blocked = false;
      picker.refresh();
      picker.setCellAttributes(highlightedCell, highlighted);
      picker.setCellAttributes(siblingCell, sibling);
      assert.equal(highlightedCell.disabled, false, `${name} refreshes changed availability`);
      assert.deepEqual(
        [grid.tabIndex, highlightedCell.tabIndex, siblingCell.tabIndex],
        [-1, 0, -1],
        `${name} restores ordinary roving focus`,
      );
      const refreshedState = picker.getSnapshot().state;
      const refreshedHighlight = 'calendar' in refreshedState ? refreshedState.calendar.highlighted : refreshedState.highlighted;
      assert.equal(formatDateValue(refreshedHighlight), '2026-09-15', `${name} does not change semantic ownership`);
    } finally {
      picker.disconnect();
    }
  }
});

test('DOM period cell values project canonical availability and period keyboard input', () => {
  for (const [create, unit, range] of [
    [createMonthPicker, 'month', false], [createYearPicker, 'year', false],
    [createMonthRangePicker, 'month', true], [createYearRangePicker, 'year', true],
  ]) {
    const grid = new FakeElement();
    const value = unit === 'month' ? { year: 2026, month: 9 } : { year: 2026 };
    const picker = create({ root: new FakeElement(), trigger: new FakeElement(), grid,
      defaultHighlightedValue: createDateValue(2026, 8, 15), defaultOpen: true,
      policies: { min: createDateValue(2026, 9, 15) },
    });
    try {
      const cell = new FakeElement();
      picker.setCellAttributes(cell, value);
      assert.equal(cell.attributes.get('aria-disabled'), 'true');
      assert.equal(cell.dataset.datePickerId, unit === 'month' ? '2026-09-01' : '2026-01-01');
      grid.emit('keydown', keyboard('ArrowRight'));
      const state = picker.getSnapshot().state;
      assert.deepEqual((range ? state.calendar : state).highlighted, unit === 'month' ? createDateValue(2026, 10, 1) : createDateValue(2027, 1, 1));
      const available = unit === 'month' ? { year: 2026, month: 10 } : { year: 2027 };
      picker.setCellAttributes(cell, available);
      assert.equal(cell.attributes.get('aria-disabled'), 'false');
      assert.equal(cell.tabIndex, 0);
      if (unit === 'year') {
        picker.setCellAttributes(cell, { year: 10_000 });
        assert.equal(cell.attributes.get('aria-disabled'), 'true');
        assert.equal(cell.tabIndex, -1);
      }
    } finally { picker.disconnect(); }
  }
});

test('DOM month and year picker hosts publish Temporal-normalized values', () => {
  const host = () => ({ root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement() });
  const monthChanges = [];
  const month = createMonthPicker({ ...host(), defaultValue: createDateValue(2026, 8, 15), onValueChange: (value) => monthChanges.push(value) });
  assert.equal(formatDateValue(month.getSnapshot().state.value), '2026-08-01');
  assert.equal(month.handleEvent({ type: 'select-month', value: { year: 2026, month: 9 } }), true);
  assert.equal(formatDateValue(month.getSnapshot().state.value), '2026-09-01');
  assert.deepEqual(monthChanges.map(formatDateValue), ['2026-09-01']);

  const yearChanges = [];
  const year = createYearPicker({ ...host(), defaultValue: createDateValue(2026, 8, 15), onValueChange: (value) => yearChanges.push(value) });
  assert.equal(formatDateValue(year.getSnapshot().state.value), '2026-01-01');
  assert.equal(year.handleEvent({ type: 'select', value: createDateValue(2027, 8, 15) }), true);
  assert.equal(formatDateValue(year.getSnapshot().state.value), '2027-01-01');
  assert.deepEqual(yearChanges.map(formatDateValue), ['2027-01-01']);
});

test('DOM month and year range picker hosts publish normalized endpoint ranges', () => {
  const host = () => ({ root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement() });
  const month = createMonthRangePicker({ ...host(), defaultHighlightedValue: createDateValue(2026, 8, 15) });
  assert.equal(month.handleEvent({ type: 'select-month', value: { year: 2026, month: 8 } }), true);
  assert.equal(month.handleEvent({ type: 'select-month', value: { year: 2026, month: 10 } }), true);
  assert.equal(formatDateValue(month.getSnapshot().state.value.start), '2026-08-01');
  assert.equal(formatDateValue(month.getSnapshot().state.value.end), '2026-10-01');

  const year = createYearRangePicker({ ...host(), defaultHighlightedValue: createDateValue(2026, 8, 15) });
  assert.equal(year.handleEvent({ type: 'select', value: createDateValue(2025, 8, 15) }), true);
  assert.equal(year.handleEvent({ type: 'select', value: createDateValue(2027, 8, 15) }), true);
  assert.equal(formatDateValue(year.getSnapshot().state.value.start), '2025-01-01');
  assert.equal(formatDateValue(year.getSnapshot().state.value.end), '2027-01-01');
});

test('controlled DOM date picker preserves the stepped segment until owner sync', () => {
  const input = new FakeInput();
  let value = createDateValue(2026, 8, 18);
  const picker = createDatePicker({
    root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement(), input,
    value,
    onValueChange: (next) => { value = next; },
  });

  input.setSelectionRange(5, 7);
  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(input.value, '2026-09-18');
  assert.deepEqual([input.selectionStart, input.selectionEnd], [5, 7]);
  assert.equal(formatDateValue(picker.getSnapshot().state.value), '2026-08-18');

  picker.syncControlledValues({ value });
  assert.equal(formatDateValue(picker.getSnapshot().state.value), '2026-09-18');
  assert.deepEqual([input.selectionStart, input.selectionEnd], [5, 7]);
});

test('controlled DOM picker preserves active field composition during external value sync', async () => {
  const input = new FakeInput();
  const picker = createDatePicker({
    root: new FakeElement(),
    grid: new FakeElement(),
    trigger: new FakeElement(),
    input,
    value: createDateValue(2026, 8, 18),
  });
  input.setSelectionRange(5, 7);
  input.emit('compositionstart', { data: '' });
  compositionInput(input, '2026-구-18', 6);

  assert.equal(picker.syncControlledValues({ value: createDateValue(2026, 9, 18) }).ok, true);
  compositionInput(input, '2026-구월-18', 7);
  assert.equal(input.attributes.get('aria-invalid'), 'false');
  input.emit('compositionend', { data: '구월' });
  input.emit('input', { inputType: 'insertCompositionText' });
  await Promise.resolve();
  assert.equal(input.attributes.get('aria-invalid'), 'false');
});

test('DOM date picker projects supported boundary months without throwing', () => {
  for (const [value, weekStartsOn] of [[createDateValue(1, 1, 1), 7], [createDateValue(9_999, 12, 31), 1]]) {
    const picker = createDatePicker({
      root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement(),
      defaultValue: value, defaultHighlightedValue: value, policies: { weekStartsOn },
    });
    const month = picker.getMonth().flat();
    assert.equal(month.length, 42);
    const padding = month.find((cell) => cell.outsideSupportedRange === true);
    assert.notEqual(padding, undefined);
    const element = new FakeElement();
    picker.setCellAttributes(element, padding);
    assert.equal(element.attributes.get('aria-disabled'), 'true');
  }
});

test('DOM date picker projects unavailable dates as disabled cells', () => {
  const picker = createDatePicker({
    root: new FakeElement(),
    grid: new FakeElement(),
    trigger: new FakeElement(),
    defaultValue: createDateValue(2026, 8, 22),
    policies: { unavailable: (value) => value.year === 2026 && value.month === 8 && value.day === 27 },
  });
  const unavailable = new FakeElement();
  const available = new FakeElement();

  picker.setCellAttributes(unavailable, createDateValue(2026, 8, 27));
  picker.setCellAttributes(available, createDateValue(2026, 8, 28));

  assert.equal(unavailable.disabled, true);
  assert.equal(unavailable.attributes.get('aria-disabled'), 'true');
  assert.equal(unavailable.dataset.unavailable, '');
  assert.equal(available.disabled, false);
  assert.equal(available.attributes.get('aria-disabled'), 'false');
  assert.equal('unavailable' in available.dataset, false);
});

test('DOM date picker can keep an inline calendar open while value remains uncontrolled', () => {
  const root = new FakeElement();
  let closeRequests = 0;
  const picker = createDatePicker({
    root,
    grid: new FakeElement(),
    trigger: new FakeElement(),
    defaultValue: createDateValue(2026, 8, 22),
    open: true,
    onOpenChange: (open) => { if (!open) closeRequests += 1; },
  });

  picker.handleEvent({ type: 'select', value: createDateValue(2026, 8, 25) });

  assert.equal(formatDateValue(picker.getSnapshot().state.value), '2026-08-25');
  assert.equal(picker.getSnapshot().state.open, true);
  assert.equal(root.hidden, false);
  assert.equal(closeRequests, 1);
});

test('DOM popup picker families restore exact hidden baselines on disconnect', () => {
  const date = createDateValue(2026, 8, 18);
  const dateRange = createDateRange(date, createDateValue(2026, 8, 21));
  const dateTime = createDateTimeValue(date, createTimeValue(9, 30));
  const dateTimeRange = createDateTimeRange(
    dateTime,
    createDateTimeValue(createDateValue(2026, 8, 21), createTimeValue(17, 45)),
  );
  const factories = [
    (root, manageVisibility) => createDatePicker({ root, grid: new FakeElement(), trigger: new FakeElement(), defaultValue: date, ...manageVisibility }),
    (root, manageVisibility) => createDateRangePicker({ root, grid: new FakeElement(), trigger: new FakeElement(), defaultValue: dateRange, ...manageVisibility }),
    (root, manageVisibility) => createDateTimePicker({ root, grid: new FakeElement(), trigger: new FakeElement(), defaultValue: dateTime, ...manageVisibility }),
    (root, manageVisibility) => createDateTimeRangePicker({ root, grid: new FakeElement(), trigger: new FakeElement(), defaultValue: dateTimeRange, ...manageVisibility }),
  ];

  for (const create of factories) {
    const root = new FakeElement();
    root.setAttribute('hidden', 'until-found');
    root.hidden = true;
    const picker = create(root, {});
    assert.equal(root.getAttribute('hidden'), '');
    picker.handleEvent('open');
    assert.equal(root.getAttribute('hidden'), null);
    picker.disconnect();
    assert.equal(root.getAttribute('hidden'), 'until-found');

    const unmanaged = new FakeElement();
    unmanaged.setAttribute('hidden', 'until-found');
    unmanaged.hidden = true;
    const rendererOwned = create(unmanaged, { manageVisibility: false });
    assert.equal(unmanaged.getAttribute('hidden'), 'until-found');
    rendererOwned.handleEvent('open');
    rendererOwned.refresh();
    assert.equal(unmanaged.getAttribute('hidden'), 'until-found');
    rendererOwned.handleEvent('close');
    assert.equal(unmanaged.getAttribute('hidden'), 'until-found');
    rendererOwned.disconnect();
    assert.equal(unmanaged.getAttribute('hidden'), 'until-found');
  }
});

test('DOM controlled range picker exposes highlight changes and stays open after commit', () => {
  const initialHighlight = createDateValue(2026, 8, 22);
  let value = createDateRange(
    createDateValue(2026, 8, 18),
    initialHighlight,
  );
  let highlightedValue = initialHighlight;
  let open = true;
  const picker = createDateRangePicker({
    root: new FakeElement(),
    grid: new FakeElement(),
    trigger: new FakeElement(),
    value,
    highlightedValue,
    open,
    onValueChange: (next) => { value = next; },
    onHighlightedValueChange: (next) => { highlightedValue = next; },
    onOpenChange: (next) => { open = next; },
  });

  picker.handleEvent({ type: 'select', value: createDateValue(2026, 8, 25) });
  picker.syncControlledValues({ value, highlightedValue, open });
  picker.handleEvent({ type: 'select', value: createDateValue(2026, 8, 28) });
  picker.syncControlledValues({ value, highlightedValue, open });

  assert.equal(formatDateValue(picker.getSnapshot().state.value.start), '2026-08-25');
  assert.equal(formatDateValue(picker.getSnapshot().state.value.end), '2026-08-28');
  assert.equal(formatDateValue(picker.getSnapshot().state.calendar.highlighted), '2026-08-28');
  assert.equal(picker.getSnapshot().state.calendar.open, true);
  assert.equal(open, true);
});

test('DOM date-time picker keeps the wall-clock time when a calendar date is selected', () => {
  const input = new FakeInput();
  const picker = createDateTimePicker({
    root: new FakeElement(),
    grid: new FakeElement(),
    trigger: new FakeElement(),
    dateTimeInput: input,
    defaultValue: createDateTimeValue(
      createDateValue(2026, 8, 22),
      createTimeValue(16, 30),
    ),
    defaultOpen: true,
  });

  picker.handleEvent({ type: 'select-date', value: createDateValue(2026, 8, 25) });

  assert.equal(formatDateTimeValue(picker.getSnapshot().state.value), '2026-08-25T16:30');
  assert.equal(input.value, '2026-08-25T16:30');
  assert.equal(picker.getSnapshot().state.calendar.open, true);
});

test('controlled DOM date-time picker preserves every editable segment across owner sync', () => {
  const cases = [
    ['dateTimeInput', createDateTimeField, [5, 7], '2026-09-18T09:30'],
    ['dateInput', createDateField, [5, 7], '2026-09-18'],
    ['timeInput', createTimeField, [0, 2], '10:30'],
  ];
  for (const [part, _factory, selection, expected] of cases) {
    const input = new FakeInput();
    let value = createDateTimeValue(createDateValue(2026, 8, 18), createTimeValue(9, 30));
    const picker = createDateTimePicker({
      root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement(),
      [part]: input,
      value,
      onValueChange: (next) => { value = next; },
    });
    input.setSelectionRange(selection[0], selection[1]);
    input.emit('keydown', keyboard('ArrowUp'));
    assert.equal(input.value, expected, part);
    assert.deepEqual([input.selectionStart, input.selectionEnd], selection, part);
    picker.syncControlledValues({ value });
    assert.deepEqual([input.selectionStart, input.selectionEnd], selection, `${part} after sync`);
  }
});

test('date-time picker rolls back child values rejected by parent policies', () => {
  const dateInput = new FakeInput();
  const initial = createDateTimeValue(createDateValue(2026, 8, 18), createTimeValue(9, 30));
  const picker = createDateTimePicker({
    root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement(), dateInput,
    value: initial,
    policies: { unavailable: (value) => value.date.month === 9 },
  });
  dateInput.setSelectionRange(5, 7);
  dateInput.emit('keydown', keyboard('ArrowUp'));
  assert.equal(dateInput.value, '2026-08-18');
  assert.deepEqual([dateInput.selectionStart, dateInput.selectionEnd], [5, 7]);
  assert.equal(dateInput.attributes.get('aria-invalid'), 'true');
  assert.equal(formatDateTimeValue(picker.getSnapshot().state.value), formatDateTimeValue(initial));
});

test('DOM date-time range picker updates independent endpoint times', () => {
  const initial = createDateTimeRange(
    createDateTimeValue(createDateValue(2026, 8, 25), createTimeValue(9, 0)),
    createDateTimeValue(createDateValue(2026, 8, 28), createTimeValue(17, 0)),
  );
  const picker = createDateTimeRangePicker({
    root: new FakeElement(),
    grid: new FakeElement(),
    trigger: new FakeElement(),
    defaultValue: initial,
    defaultOpen: true,
  });

  picker.handleEvent({ type: 'set-start-time', value: createTimeValue(10, 15) });
  picker.handleEvent({ type: 'set-end-time', value: createTimeValue(18, 45) });

  assert.equal(
    formatDateTimeRange(picker.getSnapshot().state.value),
    '2026-08-25T10:15/2026-08-28T18:45',
  );
});

test('controlled DOM date-time range picker preserves all split endpoint segments', () => {
  const start = createDateTimeValue(createDateValue(2026, 8, 18), createTimeValue(9, 30));
  const end = createDateTimeValue(createDateValue(2026, 12, 21), createTimeValue(17, 45));
  const cases = [
    ['startDateInput', [5, 7], '2026-09-18'],
    ['startTimeInput', [0, 2], '10:30'],
    ['endDateInput', [5, 7], '2027-01-21'],
    ['endTimeInput', [0, 2], '18:45'],
  ];
  for (const [part, selection, expected] of cases) {
    const input = new FakeInput();
    let value = createDateTimeRange(start, end);
    const picker = createDateTimeRangePicker({
      root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement(),
      [part]: input,
      value,
      onValueChange: (next) => { value = next; },
    });
    input.setSelectionRange(selection[0], selection[1]);
    input.emit('keydown', keyboard('ArrowUp'));
    assert.equal(input.value, expected, part);
    assert.deepEqual([input.selectionStart, input.selectionEnd], selection, part);
    picker.syncControlledValues({ value });
    assert.deepEqual([input.selectionStart, input.selectionEnd], selection, `${part} after sync`);
  }
});

test('date-time range picker rolls back inverted split endpoint proposals', () => {
  const startDateInput = new FakeInput();
  const value = createDateTimeRange(
    createDateTimeValue(createDateValue(2026, 8, 18), createTimeValue(9, 30)),
    createDateTimeValue(createDateValue(2026, 8, 21), createTimeValue(17, 45)),
  );
  const picker = createDateTimeRangePicker({
    root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement(),
    startDateInput,
    value,
  });
  startDateInput.setSelectionRange(5, 7);
  startDateInput.emit('keydown', keyboard('ArrowUp'));
  assert.equal(startDateInput.value, '2026-08-18');
  assert.deepEqual([startDateInput.selectionStart, startDateInput.selectionEnd], [5, 7]);
  assert.equal(startDateInput.attributes.get('aria-invalid'), 'true');
  assert.equal(formatDateTimeRange(picker.getSnapshot().state.value), formatDateTimeRange(value));
});

test('picker display-only range inputs stay natively read-only', () => {
  const startInput = new FakeInput(); const endInput = new FakeInput();
  createDateRangePicker({
    root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement(),
    startInput, endInput,
    defaultValue: createDateRange(createDateValue(2026, 8, 18), createDateValue(2026, 8, 21)),
  });
  assert.equal(startInput.readOnly, true);
  assert.equal(endInput.readOnly, true);
  assert.equal(startInput.attributes.get('aria-readonly'), 'true');

  const startDateTimeInput = new FakeInput(); const endDateTimeInput = new FakeInput();
  createDateTimeRangePicker({
    root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement(),
    startDateTimeInput, endDateTimeInput,
    defaultValue: createDateTimeRange(
      createDateTimeValue(createDateValue(2026, 8, 18), createTimeValue(9, 30)),
      createDateTimeValue(createDateValue(2026, 8, 21), createTimeValue(17, 45)),
    ),
  });
  assert.equal(startDateTimeInput.readOnly, true);
  assert.equal(endDateTimeInput.readOnly, true);
  assert.equal(startDateTimeInput.attributes.get('aria-readonly'), 'true');
});

test('inert temporal inputs preserve validity and state across keyboard editing and blur', () => {
  for (const [create, value] of [
    [createDateField, createDateValue(2026, 10, 16)],
    [createTimeField, createTimeValue(9, 30, 38, 125)],
    [createDateTimeField, createDateTimeValue(createDateValue(2026, 10, 16), createTimeValue(9, 30, 38, 125))],
  ]) for (const native of [false, true]) for (const state of ['readOnly', 'disabled']) {
    const input = new FakeInput(); let changes = 0, prevented = 0;
    const field = create({ input, defaultValue: value, native, [state]: true, onValueChange: () => { changes++; } });
    try {
      const snapshot = field.getSnapshot(), text = input.value;
      for (const key of ['ArrowUp', 'ArrowDown', 'Enter', 'Escape']) {
        input.emit('keydown', { ...keyboard(key), preventDefault() { prevented++; } });
      }
      input.emit('blur');
      assert.equal(field.getSnapshot(), snapshot); assert.equal(input.value, text); assert.deepEqual(field.getValue(), value);
      assert.equal(changes, 0); assert.equal(prevented, 0);
      assert.equal(input.validationMessage, ''); assert.notEqual(input.getAttribute('aria-invalid'), 'true');
      input.setCustomValidity('Existing validation problem'); input.setAttribute('aria-invalid', 'true');
      input.emit('blur');
      assert.equal(input.validationMessage, 'Existing validation problem'); assert.equal(input.getAttribute('aria-invalid'), 'true');
    } finally { field.disconnect(); }
    assert.equal(liveRangeListeners(input), 0);
  }
});

test('inert temporal ranges preserve endpoint navigation without manufacturing edit errors', () => {
  for (const [create, value] of [
    [createDateRangeField, createDateRange(createDateValue(2026, 10, 16), createDateValue(2026, 10, 20))],
    [createTimeRangeField, createTimeRange(createTimeValue(9, 30), createTimeValue(17, 45))],
    [createDateTimeRangeField, createDateTimeRange(dateTimeAt(16, 9, 30), dateTimeAt(20, 17, 45))],
  ]) for (const state of ['readOnly', 'disabled']) {
    const startInput = new FakeInput(), endInput = new FakeInput(); let changes = 0, prevented = 0;
    const field = create({ startInput, endInput, defaultValue: value, [state]: true, onValueChange: () => { changes++; } });
    try {
      for (const [endpoint, input] of [['end', endInput], ['start', startInput]]) {
        const beforeFocus = field.getSnapshot(); input.emit('focus');
        if (state === 'readOnly') assert.equal(field.getSnapshot().state.active, endpoint);
        else assert.equal(field.getSnapshot(), beforeFocus, 'disabled focus cannot navigate the owner');
        const snapshot = field.getSnapshot(), text = input.value;
        for (const key of ['ArrowUp', 'ArrowDown', 'Enter', 'Escape']) {
          input.emit('keydown', { ...keyboard(key), preventDefault() { prevented++; } });
        }
        input.emit('blur');
        assert.equal(field.getSnapshot(), snapshot); assert.equal(input.value, text); assert.deepEqual(field.getValue(), value);
        assert.equal(changes, 0); assert.equal(prevented, 0);
        assert.equal(input.validationMessage, ''); assert.notEqual(input.getAttribute('aria-invalid'), 'true');
        input.setCustomValidity('Existing validation problem'); input.setAttribute('aria-invalid', 'true'); input.emit('blur');
        assert.equal(input.validationMessage, 'Existing validation problem'); assert.equal(input.getAttribute('aria-invalid'), 'true');
      }
    } finally { field.disconnect(); }
    assert.equal(liveRangeListeners(startInput, endInput), 0);
  }
});

test('DOM date field exposes invalid drafts and restores the committed value on blur', () => {
  const input = new FakeInput();
  createDateField({ input, defaultValue: createDateValue(2024, 1, 31) });

  replaceInput(input, '2024-02-30');
  input.emit('keydown', keyboard('Enter'));
  assert.equal(input.value, '2024-02-30');
  assert.equal(input.attributes.get('aria-invalid'), 'true');
  assert.match(input.validationMessage, /day must exist/);

  input.emit('blur', {});
  assert.equal(input.value, '2024-01-31');
  assert.equal(input.attributes.get('aria-invalid'), 'false');
  assert.equal(input.validationMessage, '');
});

test('DOM time field steps from the committed value after an invalid draft', () => {
  const input = new FakeInput();
  const field = createTimeField({ input, defaultValue: createTimeValue(16, 3) });

  replaceInput(input, '25:90');
  input.emit('keydown', keyboard('Enter'));
  assert.equal(input.value, '25:90');
  assert.equal(input.attributes.get('aria-invalid'), 'true');
  assert.match(input.validationMessage, /hour must be/);

  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(input.value, '16:04');
  assert.equal(formatTimeValue(field.getValue()), '16:04');
  assert.equal(input.attributes.get('aria-invalid'), 'false');

  input.emit('blur', {});
  assert.equal(input.value, '16:04');
  assert.equal(formatTimeValue(field.getValue()), '16:04');
  assert.equal(input.attributes.get('aria-invalid'), 'false');
  assert.equal(input.validationMessage, '');
});

test('DOM date-time field carries time segments across civil day boundaries', () => {
  const input = new FakeInput();
  const value = createDateTimeValue(
    createDateValue(2024, 1, 31),
    createTimeValue(23, 45),
  );
  const field = createDateTimeField({
    input,
    defaultValue: value,
    policies: { step: { minute: 30 } },
  });

  input.setSelectionRange(14, 14);
  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(formatDateTimeValue(field.getValue()), '2024-02-01T00:15');
  assert.equal(input.value, '2024-02-01T00:15');
  assert.equal(input.placeholder, 'YYYY-MM-DDTHH:mm');
});

test('DOM date-time field steps the selected committed segment after an invalid draft', () => {
  const input = new FakeInput();
  const field = createDateTimeField({
    input,
    defaultValue: createDateTimeValue(
      createDateValue(2026, 8, 22),
      createTimeValue(16, 3),
    ),
  });

  replaceInput(input, '2026-08-22T16:03oops');
  input.setSelectionRange(14, 14);
  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(input.value, '2026-08-22T16:04');
  assert.equal(formatDateTimeValue(field.getValue()), '2026-08-22T16:04');
  assert.equal(input.attributes.get('aria-invalid'), 'false');

  input.emit('blur', {});
  assert.equal(input.value, '2026-08-22T16:04');
  assert.equal(input.attributes.get('aria-invalid'), 'false');
});

function keyboard(key) { return { key, isComposing: false, preventDefault() {} }; }
function replaceInput(input, value) { input.value = value; input.setSelectionRange(value.length, value.length); input.emit('input', { inputType: 'insertText' }); }
function compositionInput(input, value, offset) { input.value = value; input.setSelectionRange(offset, offset); input.emit('input', { inputType: 'insertCompositionText' }); }
class FakeElement {
  attributes = new Map(); listeners = new Map(); dataset = {}; disabled = false; hidden = false; tabIndex = 0;
  addEventListener(type, listener) { const values = this.listeners.get(type) ?? new Set(); values.add(listener); this.listeners.set(type, values); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) {
    const dispatched = { ...event, type };
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === 'function') listener.call(this, dispatched);
      else listener.handleEvent(dispatched);
    }
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  contains() { return false; }
  querySelector() { return null; }
  focus() {}
}
class FakeInput extends FakeElement {
  value = ''; type = ''; inputMode = ''; placeholder = ''; readOnly = false; required = false; validationMessage = ''; selectionStart = 0; selectionEnd = 0; selectionDirection = 'none';
  setCustomValidity(message) { this.validationMessage = message; }
  setSelectionRange(start, end, direction = 'none') { this.selectionStart = start > end ? end : start; this.selectionEnd = end; this.selectionDirection = direction; }
}

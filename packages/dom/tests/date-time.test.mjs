import test from 'node:test';
import assert from 'node:assert/strict';
import { createDateRange, createDateValue, formatDateValue } from '@sectile/temporal/date-field';
import { createTimeValue, formatTimeValue } from '@sectile/temporal/time-field';
import { createTimeRange } from '@sectile/temporal/time-range-field';
import { createDateTimeRange, createDateTimeValue, formatDateTimeRange, formatDateTimeValue } from '@sectile/temporal/date-time-field';
import { createDateField } from '../.verification-dist/date-field.js';
import { createDateRangeField } from '../.verification-dist/date-range-field.js';
import { createDateTimeField } from '../.verification-dist/date-time-field.js';
import { createDatePicker } from '../.verification-dist/date-picker.js';
import { createDateRangePicker } from '../.verification-dist/date-range-picker.js';
import { createDateTimePicker } from '../.verification-dist/date-time-picker.js';
import { createDateTimeRangePicker } from '../.verification-dist/date-time-range-picker.js';
import { createTimeField } from '../.verification-dist/time-field.js';
import { createTimeRangeField } from '../.verification-dist/time-range-field.js';

test('DOM date field projects native interaction and caret segment stepping', () => {
  const input = new FakeInput();
  const field = createDateField({ input, defaultValue: createDateValue(2024, 1, 31) });
  input.setSelectionRange(5, 5);
  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(formatDateValue(field.getValue()), '2024-02-29');
  assert.equal(input.inputMode, 'numeric');
  assert.equal(input.placeholder, 'YYYY-MM-DD');
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
    (root) => createDatePicker({ root, grid: new FakeElement(), trigger: new FakeElement(), defaultValue: date }),
    (root) => createDateRangePicker({ root, grid: new FakeElement(), trigger: new FakeElement(), defaultValue: dateRange }),
    (root) => createDateTimePicker({ root, grid: new FakeElement(), trigger: new FakeElement(), defaultValue: dateTime }),
    (root) => createDateTimeRangePicker({ root, grid: new FakeElement(), trigger: new FakeElement(), defaultValue: dateTimeRange }),
  ];

  for (const create of factories) {
    const root = new FakeElement();
    root.setAttribute('hidden', 'until-found');
    root.hidden = true;
    const picker = create(root);
    assert.equal(root.getAttribute('hidden'), '');
    picker.handleEvent('open');
    assert.equal(root.getAttribute('hidden'), null);
    picker.disconnect();
    assert.equal(root.getAttribute('hidden'), 'until-found');
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
  emit(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
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
  setSelectionRange(start, end, direction = 'none') { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; }
}

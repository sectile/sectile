import test from 'node:test';
import assert from 'node:assert/strict';
import { unwrap } from '@sectile/core/result';
import { createDateRange, createDateValue, formatDateValue } from '@sectile/core/date-field';
import { createTimeValue, formatTimeValue } from '@sectile/core/time-field';
import { createDateTimeRange, createDateTimeValue, formatDateTimeRange, formatDateTimeValue } from '@sectile/core/date-time-field';
import { createDateField } from '../dist/date-field.js';
import { createDateRangeField } from '../dist/date-range-field.js';
import { createDateTimeField } from '../dist/date-time-field.js';
import { createDatePicker } from '../dist/date-picker.js';
import { createDateRangePicker } from '../dist/date-range-picker.js';
import { createDateTimePicker } from '../dist/date-time-picker.js';
import { createDateTimeRangePicker } from '../dist/date-time-range-picker.js';
import { createTimeField } from '../dist/time-field.js';
import { createTimeRangeField } from '../dist/time-range-field.js';

test('DOM date field projects native interaction and caret segment stepping', () => {
  const input = new FakeInput();
  const field = createDateField({ input, defaultValue: unwrap(createDateValue(2024, 1, 31)) });
  input.setSelectionRange(5, 5);
  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(formatDateValue(field.getValue()), '2024-02-29');
  assert.equal(input.inputMode, 'numeric');
  assert.equal(input.placeholder, 'YYYY-MM-DD');
});

test('DOM date range field keeps endpoint drafts independent and commits an ordered range', () => {
  const startInput = new FakeInput();
  const endInput = new FakeInput();
  const field = createDateRangeField({ startInput, endInput });
  const start = unwrap(createDateValue(2026, 8, 22));
  const end = unwrap(createDateValue(2026, 8, 28));

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
    defaultValue: unwrap(createDateRange(
      unwrap(createDateValue(2026, 8, 22)),
      unwrap(createDateValue(2026, 10, 28)),
    )),
  });

  startInput.setSelectionRange(5, 5);
  startInput.emit('keydown', keyboard('ArrowUp'));

  assert.equal(formatDateValue(field.getValue().start), '2026-09-22');
  assert.equal(formatDateValue(field.getValue().end), '2026-10-28');
});

test('DOM date range field rejects inverted controlled proposals', () => {
  const value = unwrap(createDateRange(
    unwrap(createDateValue(2026, 8, 22)),
    unwrap(createDateValue(2026, 8, 28)),
  ));
  const field = createDateRangeField({ startInput: new FakeInput(), endInput: new FakeInput(), value });
  assert.equal(field.handleEvent({ type: 'field', endpoint: 'end', event: { type: 'set-value', value: unwrap(createDateValue(2026, 8, 20)) } }), false);
  assert.equal(formatDateValue(field.getValue().end), '2026-08-28');
});

test('DOM time range field commits ordered wall-clock endpoints', () => {
  const field = createTimeRangeField({ startInput: new FakeInput(), endInput: new FakeInput() });
  field.handleEvent({ type: 'field', endpoint: 'start', event: { type: 'set-value', value: unwrap(createTimeValue(9, 30)) } });
  assert.equal(field.getValue(), null);
  field.handleEvent({ type: 'field', endpoint: 'end', event: { type: 'set-value', value: unwrap(createTimeValue(17, 45)) } });
  assert.equal(formatTimeValue(field.getValue().start), '09:30');
  assert.equal(formatTimeValue(field.getValue().end), '17:45');
});

test('DOM time fields increment the hour under the caret instead of the minute', () => {
  const input = new FakeInput();
  const field = createTimeField({ input, defaultValue: unwrap(createTimeValue(9, 30)) });
  input.setSelectionRange(0, 0);
  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(formatTimeValue(field.getValue()), '10:30');

  const startInput = new FakeInput();
  const endInput = new FakeInput();
  const range = createTimeRangeField({
    startInput,
    endInput,
    defaultValue: { start: unwrap(createTimeValue(9, 30)), end: unwrap(createTimeValue(17, 45)) },
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
    defaultValue: unwrap(createDateValue(2024, 1, 31)),
  });

  input.value = '2024-02-12';
  input.setSelectionRange(input.value.length, input.value.length);
  input.emit('input', { inputType: 'insertText' });
  input.emit('keydown', keyboard('Enter'));

  assert.equal(formatDateValue(picker.getSnapshot().state.value), '2024-02-12');
  assert.equal(input.readOnly, false);
});

test('DOM date picker projects unavailable dates as disabled cells', () => {
  const picker = createDatePicker({
    root: new FakeElement(),
    grid: new FakeElement(),
    trigger: new FakeElement(),
    defaultValue: unwrap(createDateValue(2026, 8, 22)),
    policies: { unavailable: (value) => value.year === 2026 && value.month === 8 && value.day === 27 },
  });
  const unavailable = new FakeElement();
  const available = new FakeElement();

  picker.setCellAttributes(unavailable, unwrap(createDateValue(2026, 8, 27)));
  picker.setCellAttributes(available, unwrap(createDateValue(2026, 8, 28)));

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
    defaultValue: unwrap(createDateValue(2026, 8, 22)),
    open: true,
    onOpenChange: (open) => { if (!open) closeRequests += 1; },
  });

  picker.handleEvent({ type: 'select', value: unwrap(createDateValue(2026, 8, 25)) });

  assert.equal(formatDateValue(picker.getSnapshot().state.value), '2026-08-25');
  assert.equal(picker.getSnapshot().state.open, true);
  assert.equal(root.hidden, false);
  assert.equal(closeRequests, 1);
});

test('DOM controlled range picker exposes highlight changes and stays open after commit', () => {
  const initialHighlight = unwrap(createDateValue(2026, 8, 22));
  let value = unwrap(createDateRange(
    unwrap(createDateValue(2026, 8, 18)),
    initialHighlight,
  ));
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

  picker.handleEvent({ type: 'select', value: unwrap(createDateValue(2026, 8, 25)) });
  picker.syncControlledValues({ value, highlightedValue, open });
  picker.handleEvent({ type: 'select', value: unwrap(createDateValue(2026, 8, 28)) });
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
    defaultValue: unwrap(createDateTimeValue(
      unwrap(createDateValue(2026, 8, 22)),
      unwrap(createTimeValue(16, 30)),
    )),
    defaultOpen: true,
  });

  picker.handleEvent({ type: 'select-date', value: unwrap(createDateValue(2026, 8, 25)) });

  assert.equal(formatDateTimeValue(picker.getSnapshot().state.value), '2026-08-25T16:30');
  assert.equal(input.value, '2026-08-25T16:30');
  assert.equal(picker.getSnapshot().state.calendar.open, true);
});

test('DOM date-time range picker updates independent endpoint times', () => {
  const initial = unwrap(createDateTimeRange(
    unwrap(createDateTimeValue(unwrap(createDateValue(2026, 8, 25)), unwrap(createTimeValue(9, 0)))),
    unwrap(createDateTimeValue(unwrap(createDateValue(2026, 8, 28)), unwrap(createTimeValue(17, 0)))),
  ));
  const picker = createDateTimeRangePicker({
    root: new FakeElement(),
    grid: new FakeElement(),
    trigger: new FakeElement(),
    defaultValue: initial,
    defaultOpen: true,
  });

  picker.handleEvent({ type: 'set-start-time', value: unwrap(createTimeValue(10, 15)) });
  picker.handleEvent({ type: 'set-end-time', value: unwrap(createTimeValue(18, 45)) });

  assert.equal(
    formatDateTimeRange(picker.getSnapshot().state.value),
    '2026-08-25T10:15/2026-08-28T18:45',
  );
});

test('DOM date field exposes invalid drafts and restores the committed value on blur', () => {
  const input = new FakeInput();
  createDateField({ input, defaultValue: unwrap(createDateValue(2024, 1, 31)) });

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

test('DOM time field exposes invalid drafts and restores the committed value on blur', () => {
  const input = new FakeInput();
  const field = createTimeField({ input, defaultValue: unwrap(createTimeValue(16, 3)) });

  replaceInput(input, '25:90');
  input.emit('keydown', keyboard('Enter'));
  assert.equal(input.value, '25:90');
  assert.equal(input.attributes.get('aria-invalid'), 'true');
  assert.match(input.validationMessage, /hour must be/);

  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(input.value, '25:90');
  assert.equal(formatTimeValue(field.getValue()), '16:03');
  assert.equal(input.attributes.get('aria-invalid'), 'true');

  input.emit('blur', {});
  assert.equal(input.value, '16:03');
  assert.equal(formatTimeValue(field.getValue()), '16:03');
  assert.equal(input.attributes.get('aria-invalid'), 'false');
  assert.equal(input.validationMessage, '');
});

test('DOM date-time field carries time segments across civil day boundaries', () => {
  const input = new FakeInput();
  const value = unwrap(createDateTimeValue(
    unwrap(createDateValue(2024, 1, 31)),
    unwrap(createTimeValue(23, 45)),
  ));
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

test('DOM date-time field rejects invalid arrow steps and restores on blur', () => {
  const input = new FakeInput();
  const field = createDateTimeField({
    input,
    defaultValue: unwrap(createDateTimeValue(
      unwrap(createDateValue(2026, 8, 22)),
      unwrap(createTimeValue(16, 3)),
    )),
  });

  replaceInput(input, '2026-08-22T16:03oops');
  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(input.value, '2026-08-22T16:03oops');
  assert.equal(formatDateTimeValue(field.getValue()), '2026-08-22T16:03');
  assert.equal(input.attributes.get('aria-invalid'), 'true');

  input.emit('blur', {});
  assert.equal(input.value, '2026-08-22T16:03');
  assert.equal(input.attributes.get('aria-invalid'), 'false');
});

function keyboard(key) { return { key, isComposing: false, preventDefault() {} }; }
function replaceInput(input, value) { input.value = value; input.setSelectionRange(value.length, value.length); input.emit('input', { inputType: 'insertText' }); }
class FakeElement {
  attributes = new Map(); listeners = new Map(); dataset = {}; disabled = false; hidden = false; tabIndex = 0;
  addEventListener(type, listener) { const values = this.listeners.get(type) ?? new Set(); values.add(listener); this.listeners.set(type, values); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  setAttribute(name, value) { this.attributes.set(name, value); }
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

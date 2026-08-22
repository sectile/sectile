import test from 'node:test';
import assert from 'node:assert/strict';
import { unwrap } from '@sectile/core/result';
import { createDateRange, createDateValue, formatDateValue } from '@sectile/core/date-field';
import { createTimeValue, formatTimeValue } from '@sectile/core/time-field';
import { createDateTimeValue, formatDateTimeValue } from '@sectile/core/date-time-field';
import { createDateField } from '../dist/date-field.js';
import { createDateTimeField } from '../dist/date-time-field.js';
import { createDatePicker } from '../dist/date-picker.js';
import { createDateRangePicker } from '../dist/date-range-picker.js';
import { createTimeField } from '../dist/time-field.js';

test('DOM date field projects native interaction and caret segment stepping', () => {
  const input = new FakeInput();
  const field = createDateField({ input, defaultValue: unwrap(createDateValue(2024, 1, 31)) });
  input.setSelectionRange(5, 5);
  input.emit('keydown', keyboard('ArrowUp'));
  assert.equal(formatDateValue(field.getValue()), '2024-02-29');
  assert.equal(input.inputMode, 'numeric');
  assert.equal(input.placeholder, 'YYYY-MM-DD');
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
  attributes = new Map(); listeners = new Map(); disabled = false; hidden = false; tabIndex = 0;
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

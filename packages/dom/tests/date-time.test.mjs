import test from 'node:test';
import assert from 'node:assert/strict';
import { unwrap } from '@sectile/core/result';
import { createDateValue, formatDateValue } from '@sectile/core/date-field';
import { createTimeValue, formatTimeValue } from '@sectile/core/time-field';
import { createDateField } from '../dist/date-field.js';
import { createDatePicker } from '../dist/date-picker.js';
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

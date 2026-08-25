import assert from 'node:assert/strict';
import test from 'node:test';
import { createCalculatorExpression } from '@sectile/core/number-field';
import { unwrap } from '@sectile/core/result';
import { createNumberField } from '../dist/number-field.js';

test('DOM number field commits calculator expressions and retains invalid drafts', () => {
  const input = new FakeInput();
  const changes = [];
  const field = createNumberField({
    input,
    defaultValue: '50',
    inputMode: 'text',
    policies: { evaluator: createCalculatorExpression() },
    onValueChange: (change) => changes.push(change),
  });
  input.setSelectionRange(0, 2);
  input.emit('beforeinput', beforeInput('50-20%'));
  input.emit('keydown', keyboard('Enter'));
  assert.equal(field.getValue(), '40');
  assert.equal(field.getText(), '40');
  assert.deepEqual(changes, [{ value: '40', expression: '50-20%' }]);
  input.setSelectionRange(0, 2);
  input.emit('beforeinput', beforeInput('1/0'));
  input.emit('keydown', keyboard('Enter'));
  assert.equal(field.getText(), '1/0');
  assert.equal(input.attributes.get('aria-invalid'), 'true');
  input.emit('blur', {});
  assert.equal(field.getText(), '40');
  assert.equal(input.attributes.get('aria-invalid'), 'false');
});

test('DOM number field ignores Enter while IME composition is active', () => {
  const input = new FakeInput();
  const field = createNumberField({ input, defaultValue: '1' });
  input.setSelectionRange(1, 1);
  input.emit('compositionstart', { data: '' });
  input.emit('compositionupdate', { data: '2' });
  input.emit('keydown', keyboard('Enter', true));
  assert.equal(field.getSnapshot().state.value, '1');
  assert.equal(field.getSnapshot().state.inputState.snapshot.text, '12');
  assert.notEqual(field.getSnapshot().state.inputState.composition, null);
  input.emit('compositionend', { data: '2' });
  input.emit('keydown', keyboard('Enter'));
  assert.equal(field.getSnapshot().state.value, '12');
  assert.equal(field.getSnapshot().state.inputState.snapshot.text, '12');
});

function keyboard(key, isComposing = false) { return { key, isComposing, preventDefault() {} }; }
function beforeInput(data) { return { inputType: 'insertText', data, cancelable: true, isComposing: false, preventDefault() {} }; }
class FakeInput {
  attributes = new Map(); listeners = new Map(); value = ''; type = ''; inputMode = ''; disabled = false; readOnly = false; required = false; selectionStart = 0; selectionEnd = 0; selectionDirection = 'none';
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  setSelectionRange(start, end, direction = 'none') { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; }
}

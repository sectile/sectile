import assert from 'node:assert/strict';
import test from 'node:test';
import { createSpinButton } from '../dist/spin-button.js';

test('DOM spin button preserves invalid drafts and exposes decimal values instead of ticks', () => {
  const input = new FakeInput();
  const spin = createSpinButton({ input, min: '-1', max: '2', step: '0.5', defaultValue: '0' });
  assert.equal(input.attributes.get('role'), 'spinbutton');
  assert.equal(input.attributes.get('aria-valuemin'), '-1');
  assert.equal(input.attributes.get('aria-valuemax'), '2');
  assert.equal(input.attributes.get('aria-valuenow'), '0');
  assert.equal(spin.getText(), '0');
  input.value = '1.25';
  input.emit('input', {});
  input.emit('keydown', keyboard('Enter'));
  assert.equal(spin.getSnapshot().state.draft, '1.25');
  assert.equal(input.attributes.get('aria-invalid'), 'true');
  input.value = '1.5';
  input.emit('input', {});
  input.emit('keydown', keyboard('Enter'));
  assert.deepEqual(spin.getSnapshot().state, { value: '1.5', draft: null });
  assert.equal(spin.getValue(), '1.5');
});

function keyboard(key) { return { key, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} }; }
class FakeInput {
  attributes = new Map(); listeners = new Map(); value = ''; disabled = false; readOnly = false;
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  setAttribute(name, value) { this.attributes.set(name, value); }
}

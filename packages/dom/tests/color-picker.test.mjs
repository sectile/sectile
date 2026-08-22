import assert from 'node:assert/strict';
import test from 'node:test';
import { createColorPicker } from '../dist/color-picker.js';

test('DOM color picker composes native color, text, channel, and swatch parts', () => {
  const root = new FakeElement(); const native = new FakeInput(); const text = new FakeInput(); const alpha = new FakeInput(); const swatch = new FakeElement();
  const picker = createColorPicker({ root, defaultValue: '#33669980', label: 'Accent' });
  picker.setNativeInputAttributes(native); picker.setTextInputAttributes(text); picker.setChannelInputAttributes(alpha, 'alpha'); picker.setSwatchAttributes(swatch);
  assert.equal(root.attributes.get('role'), 'group'); assert.equal(native.type, 'color'); assert.equal(native.value, '#336699'); assert.equal(text.value, '#33669980'); assert.equal(alpha.value, '128');
  alpha.value = '64'; alpha.dispatch('input'); assert.equal(picker.getSnapshot().state.value.alpha, 64); assert.equal(swatch.dataset.color, 'rgba(51, 102, 153, 0.251)');
  picker.disconnect();
});

test('DOM color picker preserves invalid drafts and controlled values', () => {
  const root = new FakeElement(); const input = new FakeInput(); const proposals = [];
  const picker = createColorPicker({ root, value: '#000000', onValueChange: (value) => proposals.push(value) });
  picker.setTextInputAttributes(input); input.value = '#ff0000'; input.dispatch('input'); input.dispatch('keydown', { key: 'Enter', preventDefault() {} });
  assert.equal(proposals.length, 1); assert.deepEqual(picker.getSnapshot().state.value, { red: 0, green: 0, blue: 0, alpha: 255 });
  picker.syncControlledValues({ value: '#ff0000' }); assert.equal(picker.getCSSColor(), 'rgb(255, 0, 0)'); picker.disconnect();
});

class FakeElement { attributes = new Map(); listeners = new Map(); dataset = {}; setAttribute(name, value) { this.attributes.set(name, value); } removeAttribute(name) { this.attributes.delete(name); } addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); } removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); } dispatch(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); } }
class FakeInput extends FakeElement { type = ''; value = ''; min = ''; max = ''; step = ''; inputMode = ''; disabled = false; readOnly = false; }

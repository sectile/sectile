import assert from 'node:assert/strict';
import test from 'node:test';
import { createColorPicker } from '../.verification-dist/color-picker.js';

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

test('DOM color picker projects OKLCH without changing its stored RGBA value', () => {
  const root = new FakeElement(); const picker = createColorPicker({ root, defaultValue: '#33669980' });
  const before = picker.getSnapshot().state.value;
  assert.equal(picker.handleEvent({ type: 'set-format', format: 'oklch' }), true);
  assert.match(picker.getText(), /^oklch\(/);
  assert.deepEqual(picker.getSnapshot().state.value, before);
  picker.disconnect();
});

test('DOM color picker connects visual area, hue, alpha, and model coordinates', () => {
  const root = new FakeElement(); const area = new FakeElement(); const thumb = new FakeElement(); const hue = new FakeInput(); const alpha = new FakeInput(); const green = new FakeInput(); const redSlider = new FakeInput();
  const picker = createColorPicker({ root, defaultValue: '#ff0000', allowAlpha: true });
  picker.setAreaAttributes(area); picker.setAreaThumbAttributes(thumb); picker.setHueInputAttributes(hue); picker.setAlphaInputAttributes(alpha); picker.setCoordinateInputAttributes(green, 'rgb', 'green'); picker.setCoordinateSliderAttributes(redSlider, 'rgb', 'red');
  assert.equal(area.attributes.get('aria-valuetext'), '100% saturation, 100% brightness'); assert.equal(hue.value, '0'); assert.equal(alpha.value, '100');
  assert.equal(redSlider.type, 'range'); assert.equal(redSlider.min, '0'); assert.equal(redSlider.max, '255'); assert.equal(redSlider.value, '255'); assert.equal(redSlider.dataset.format, 'rgb');
  area.dispatch('pointerdown', { button: 0, pointerId: 1, clientX: 50, clientY: 50, preventDefault() {} });
  assert.deepEqual(picker.getSnapshot().state.value, { red: 128, green: 64, blue: 64, alpha: 255 });
  hue.value = '240'; hue.dispatch('input'); assert.equal(picker.getSnapshot().state.value.blue, 128);
  alpha.value = '50'; alpha.dispatch('input'); assert.equal(picker.getSnapshot().state.value.alpha, 128);
  green.value = '32'; green.dispatch('input'); assert.equal(picker.getSnapshot().state.value.green, 32);
  redSlider.value = '96'; redSlider.dispatch('input'); assert.equal(picker.getSnapshot().state.value.red, 96);
  assert.match(thumb.style.values.get('--sectile-color-area-x'), /%$/);
  picker.disconnect();
});

class FakeStyle { values = new Map(); setProperty(name, value) { this.values.set(name, value); } }
class FakeElement { attributes = new Map(); listeners = new Map(); dataset = {}; style = new FakeStyle(); tabIndex = -1; setAttribute(name, value) { this.attributes.set(name, value); } removeAttribute(name) { this.attributes.delete(name); } addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); } removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); } dispatch(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); } getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; } setPointerCapture() {} }
class FakeInput extends FakeElement { type = ''; value = ''; min = ''; max = ''; step = ''; inputMode = ''; disabled = false; readOnly = false; }

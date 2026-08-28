import assert from 'node:assert/strict';
import test from 'node:test';
import { createMultiThumbSlider } from '../.verification-dist/multi-thumb-slider.js';

test('DOM multi-thumb slider projects constrained thumb values', () => {
  const root = new FakeElement(); const low = new FakeElement(); const high = new FakeElement();
  const slider = createMultiThumbSlider({ root, thumbs: ['low', 'high'], min: '0', max: '10', step: '1', defaultValues: [2, 8], policies: { minGap: 2 } });
  slider.setThumbAttributes(low, 'low'); slider.setThumbAttributes(high, 'high'); slider.handleEvent('end');
  assert.deepEqual(slider.getSnapshot().state.ticks, [6, 8]);
  assert.equal(low.attributes.get('aria-valuenow'), '6'); assert.equal(high.attributes.get('aria-valuenow'), '8');
  assert.equal(low.attributes.get('aria-valuemax'), '6');
  assert.equal(high.attributes.get('aria-valuemin'), '8');
  assert.deepEqual(slider.getValues(), ['6', '8']);
  assert.equal(low.tabIndex, 0); assert.equal(high.tabIndex, 0);
});

test('DOM multi-thumb slider leaves Tab navigation to the browser', () => {
  const root = new FakeElement(); const low = new FakeElement(); const high = new FakeElement(); let prevented = false;
  const slider = createMultiThumbSlider({ root, thumbs: ['low', 'high'], min: '0', max: '10', step: '1', defaultValues: [2, 8] });
  slider.setThumbAttributes(low, 'low'); slider.setThumbAttributes(high, 'high');
  root.emit('keydown', { key: 'Tab', preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
});

test('DOM multi-thumb slider selects the nearest thumb and tracks pointer movement', () => {
  const root = new FakeElement(); const track = new FakeElement(); const low = new FakeElement(); const high = new FakeElement();
  const slider = createMultiThumbSlider({ root, track, thumbs: ['low', 'high'], min: '0', max: '100', step: '1', defaultValues: [20, 80] });
  slider.setThumbAttributes(low, 'low'); slider.setThumbAttributes(high, 'high');
  track.emit('pointerdown', pointerEvent(75));
  track.emit('pointermove', pointerEvent(65, 'pointermove'));
  track.emit('pointerup', pointerEvent(65, 'pointerup'));
  assert.deepEqual(slider.getSnapshot().state.ticks, [20, 65]);
  assert.equal(high.focused, true);
});

test('DOM multi-thumb slider gives a directly pressed thumb precedence', () => {
  const root = new FakeElement(); const track = new FakeElement(); const low = new FakeElement(); const high = new FakeElement();
  const slider = createMultiThumbSlider({ root, track, thumbs: ['low', 'high'], min: '0', max: '100', step: '1', defaultValues: [20, 80], policies: { allowCross: true } });
  slider.setThumbAttributes(low, 'low'); slider.setThumbAttributes(high, 'high');
  track.emit('pointerdown', pointerEvent(75, 'pointerdown', low));
  track.emit('pointerup', pointerEvent(75, 'pointerup', low));
  assert.deepEqual(slider.getSnapshot().state.ticks, [75, 80]);
});

class FakeElement {
  attributes = new Map(); listeners = new Map(); tabIndex = -1; focused = false;
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { event.type = type; for (const listener of this.listeners.get(type) ?? []) listener(event); }
  getBoundingClientRect() { return { left: 0, width: 100, top: 0, bottom: 100, height: 100 }; }
  setPointerCapture() {}
  releasePointerCapture() {}
  focus() { this.focused = true; }
}

function pointerEvent(clientX, type = 'pointerdown', target = null) {
  return { type, clientX, pointerId: 1, target, preventDefault() {} };
}

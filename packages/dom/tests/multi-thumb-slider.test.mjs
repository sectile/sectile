import assert from 'node:assert/strict';
import test from 'node:test';
import { createMultiThumbSlider, getMultiThumbSliderThumbAttributes } from '../.verification-dist/multi-thumb-slider.js';

test('DOM multi-thumb pure projection and native registration share exact bounds and names', () => {
  const root = new FakeElement(), low = new FakeElement();
  const slider = createMultiThumbSlider({ root, thumbs: ['low', 'high'], min: '0', max: '10', step: '1', defaultValues: [2, 8],
    policies: { minGap: 2 }, disabled: true, readOnly: true, getThumbLabel: id => 'Thumb ' + id, formatValue: value => value + ' units' });
  try {
    assert.equal(slider.domain.indexOf('low'), 0);
    const attributes = getMultiThumbSliderThumbAttributes({ domain: slider.domain, range: slider.range, state: slider.getSnapshot().state,
      id: 'low', policies: { minGap: 2 }, disabled: true, readOnly: true, label: 'Thumb low', formatValue: value => value + ' units' });
    slider.setThumbAttributes(low, 'low');
    for (const [key, value] of Object.entries(attributes)) assert.equal(key === 'tabindex' ? low.tabIndex : low.attributes.get(key), key === 'tabindex' ? value : String(value));
    assert.equal(attributes['aria-valuemax'], '6'); assert.equal(attributes.tabindex, -1);
  } finally { slider.disconnect(); }
});

test('DOM multi-thumb registration updates only the registered element and can refresh caller formatting', () => {
  const size = 100, thumbs = Array.from({ length: size }, (_, index) => 'thumb-' + index); let calls = 0, suffix = ' units';
  const slider = createMultiThumbSlider({ root: new FakeElement(), thumbs, min: '0', max: '100', step: '1', defaultValues: thumbs.map((_, index) => index),
    formatValue: value => { calls++; return value + suffix; } });
  try {
    const elements = thumbs.map(id => { const element = new FakeElement(); slider.setThumbAttributes(element, id); return element; });
    assert.equal(calls, size); suffix = ' items'; slider.setThumbAttributes(elements[0], thumbs[0]);
    assert.equal(calls, size + 1); assert.equal(elements[0].attributes.get('aria-valuetext'), '0 items');
  } finally { slider.disconnect(); }
});

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

test('DOM multi-thumb slider adopts an already-focused registered thumb', () => {
  const root = new FakeElement(), high = new FakeElement(); high.ownerDocument = { activeElement: high };
  const slider = createMultiThumbSlider({ root, thumbs: ['low', 'high'], min: '0', max: '100', step: '1', defaultValues: [20, 80] });
  try { slider.setThumbAttributes(high, 'high'); slider.handleEvent('increment'); assert.deepEqual(slider.getValues(), ['20', '81']); }
  finally { slider.disconnect(); }
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
  high.rect = { left: 70, right: 90, top: 0, bottom: 40, width: 20, height: 40 };
  const slider = createMultiThumbSlider({ root, track, thumbs: ['low', 'high'], min: '0', max: '100', step: '1', defaultValues: [20, 80], policies: { allowCross: true } });
  slider.setThumbAttributes(low, 'low'); slider.setThumbAttributes(high, 'high');
  track.emit('pointerdown', pointerEvent(65, 'pointerdown', low));
  track.emit('pointerup', pointerEvent(65, 'pointerup', low));
  assert.deepEqual(slider.getSnapshot().state.ticks, [65, 80]);
});

test('DOM multi-thumb slider resolves a pressed thumb descendant before nearest-value selection', () => {
  const root = new FakeElement(), track = new FakeElement(), low = new FakeElement(), high = new FakeElement(), indicator = new FakeElement();
  high.rect = { left: 70, right: 90, top: 0, bottom: 40, width: 20, height: 40 };
  low.children.add(indicator);
  const slider = createMultiThumbSlider({ root, track, thumbs: ['low', 'high'], min: '0', max: '100', step: '1', defaultValues: [20, 80], policies: { allowCross: true } });
  try {
    slider.setThumbAttributes(low, 'low'); slider.setThumbAttributes(high, 'high');
    track.emit('pointerdown', pointerEvent(65, 'pointerdown', indicator));
    assert.deepEqual(slider.getValues(), ['65', '80']); assert.equal(low.focused, true);
  } finally { slider.disconnect(); }
});

test('DOM multi-thumb overlapping targets select the closer thumb and keep it captured in both orientations', () => {
  for (const orientation of ['horizontal', 'vertical']) {
    const root = new FakeElement(), track = new FakeElement(), low = new FakeElement(), high = new FakeElement();
    low.rect = orientation === 'horizontal'
      ? { left: 50, right: 90, top: 0, bottom: 40, width: 40, height: 40 }
      : { left: 0, right: 40, top: 10, bottom: 50, width: 40, height: 40 };
    high.rect = orientation === 'horizontal'
      ? { left: 60, right: 100, top: 0, bottom: 40, width: 40, height: 40 }
      : { left: 0, right: 40, top: 0, bottom: 40, width: 40, height: 40 };
    const slider = createMultiThumbSlider({ root, track, thumbs: ['low', 'high'], min: '0', max: '100', step: '1',
      defaultValues: [70, 80], defaultHighlightedValue: 'high', policies: { minGap: 10 }, orientation });
    const eventAt = (value, type, target) => ({ ...pointerEvent(orientation === 'horizontal' ? value : 20, type, target),
      clientY: orientation === 'horizontal' ? 20 : 100 - value });
    try {
      slider.setThumbAttributes(low, 'low'); slider.setThumbAttributes(high, 'high');
      track.emit('pointerdown', eventAt(70, 'pointerdown', high));
      assert.equal(low.focused, true, orientation);
      assert.equal(slider.getSnapshot().state.cursor.current, 'low', orientation);
      assert.equal(low.measurements, 1, 'Only the alternative hit target is measured');
      track.emit('pointermove', eventAt(60, 'pointermove', high));
      assert.deepEqual(slider.getValues(), ['60', '80'], orientation);
      assert.equal(low.measurements, 1, 'Captured movement does not repeat thumb hit testing');
      track.emit('pointerup', eventAt(60, 'pointerup', high));
      assert.equal(track.captured.size, 0);
      // At an equal distance the directly pressed thumb keeps precedence.
      track.emit('pointerdown', eventAt(70, 'pointerdown', high));
      assert.equal(high.focused, true, orientation);
      assert.deepEqual(slider.getValues(), ['60', '70'], orientation);
    } finally { slider.disconnect(); }
    assert.equal(track.captured.size, 0);
    assert.equal([...root.listeners.values(), ...track.listeners.values()].reduce((count, listeners) => count + listeners.size, 0), 0);
  }
});

test('DOM multi-thumb slider owns one pointer and releases capture and handlers on cancellation and disconnect', () => {
  const root = new FakeElement(), track = new FakeElement(), low = new FakeElement();
  const slider = createMultiThumbSlider({ root, track, thumbs: ['low'], min: '0', max: '100', step: '1', defaultValues: [20] });
  slider.setThumbAttributes(low, 'low');
  try {
    track.emit('pointerdown', { ...pointerEvent(90), button: 2 });
    assert.deepEqual(slider.getValues(), ['20']); assert.equal(track.captured.size, 0);
    track.emit('pointerdown', pointerEvent(30));
    track.emit('pointerdown', { ...pointerEvent(70), pointerId: 2 });
    track.emit('pointermove', { ...pointerEvent(70, 'pointermove'), pointerId: 2 });
    assert.deepEqual(slider.getValues(), ['30']);
    track.emit('pointerup', { ...pointerEvent(70, 'pointerup'), pointerId: 2 });
    assert.equal(track.captured.has(1), true);
    track.emit('pointermove', pointerEvent(40, 'pointermove')); assert.deepEqual(slider.getValues(), ['40']);
    track.emit('pointercancel', pointerEvent(40, 'pointercancel')); assert.equal(track.captured.size, 0);
    track.emit('pointermove', pointerEvent(60, 'pointermove')); assert.deepEqual(slider.getValues(), ['40']);
    track.emit('pointerdown', pointerEvent(50)); track.captured.clear();
    track.emit('lostpointercapture', pointerEvent(50, 'lostpointercapture'));
    track.emit('pointermove', pointerEvent(60, 'pointermove')); assert.deepEqual(slider.getValues(), ['50']);
    track.emit('pointerdown', pointerEvent(55)); slider.disconnect(); slider.disconnect();
    assert.equal(track.captured.size, 0);
    assert.equal([...root.listeners.values(), ...track.listeners.values()].reduce((count, listeners) => count + listeners.size, 0), 0);
    track.emit('pointermove', pointerEvent(90, 'pointermove')); assert.deepEqual(slider.getValues(), ['55']);
  } finally { slider.disconnect(); }
});

class FakeElement {
  nodeType = 1; children = new Set(); captured = new Set();
  rect = { left: 0, right: 100, width: 100, top: 0, bottom: 100, height: 100 }; measurements = 0;
  attributes = new Map(); listeners = new Map(); tabIndex = -1; focused = false;
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { event.type = type; for (const listener of this.listeners.get(type) ?? []) listener(event); }
  getBoundingClientRect() { this.measurements++; return this.rect; }
  contains(target) { return target === this || this.children.has(target); }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  focus() { this.focused = true; }
}

function pointerEvent(clientX, type = 'pointerdown', target = null) {
  return { type, button: 0, clientX, clientY: 20, pointerId: 1, target, preventDefault() {} };
}

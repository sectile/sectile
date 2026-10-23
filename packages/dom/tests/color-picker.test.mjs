import assert from 'node:assert/strict';
import test from 'node:test';
import { createColorPicker, getColorPickerInputAttributes } from '../.verification-dist/color-picker.js';

test('DOM ColorPicker measures a painted surface while capture and cleanup remain on the area target', () => {
  const area = new FakeElement(), surface = new FakeElement(); let reads = 0, bounds = { left: 20, top: 10, width: 60, height: 40 };
  surface.getBoundingClientRect = () => { reads++; return bounds; }; const captures = []; area.setPointerCapture = id => captures.push(id);
  const picker = createColorPicker({ root: new FakeElement(), defaultValue: '#ff0000' }); picker.setAreaAttributes(area, surface);
  area.dispatch('pointerdown', { button: 0, pointerId: 1, clientX: 50, clientY: 30, preventDefault() {} });
  assert.deepEqual(picker.getSnapshot().state.value, { red: 128, green: 64, blue: 64, alpha: 255 }); assert.deepEqual(captures, [1]); assert.equal(reads, 1); assert.equal(surface.listeners.size, 0);
  bounds = { left: 30, top: 20, width: 40, height: 20 }; area.dispatch('pointermove', { clientX: 50, clientY: 30 }); assert.equal(reads, 2); assert.equal(picker.getSnapshot().state.value.red, 128);
  bounds = { ...bounds, width: 0 }; const revision = picker.getSnapshot().revision; area.dispatch('pointermove', { clientX: 80, clientY: 30 }); assert.equal(picker.getSnapshot().revision, revision);
  picker.disconnect(); const count = reads; area.dispatch('pointermove', { clientX: 0, clientY: 0 }); assert.equal(reads, count);
  assert.ok([...area.listeners.values()].every(listeners => listeners.size === 0));
});

test('DOM ColorPicker lends two native axes to one area without duplicating color state or listeners', () => {
  const root = new FakeElement(), area = new FakeElement(), saturation = new FakeInput(), brightness = new FakeInput();
  let focused;
  saturation.focus = () => { focused = saturation; }; brightness.focus = () => { focused = brightness; };
  saturation.setAttribute('aria-label', '채도'); brightness.setAttribute('aria-label', '명도');
  area.setAttribute('aria-valuetext', '사용자 색상 설명');
  const picker = createColorPicker({ root, defaultValue: '#ff0000' }), axes = { saturation, brightness };
  picker.setAreaAttributes(area, undefined, axes);
  try {
    assert.equal(area.getAttribute('role'), 'group'); assert.equal(area.tabIndex, -1);
    assert.equal(area.getAttribute('aria-description'), '사용자 색상 설명'); assert.equal(area.getAttribute('aria-valuetext'), null);
    assert.equal(root.getAttribute('aria-readonly'), null);
    assert.equal(saturation.type, 'range'); assert.equal(brightness.type, 'range');
    assert.equal(saturation.value, '100'); assert.equal(brightness.value, '100');
    assert.equal(saturation.tabIndex, 0); assert.equal(brightness.tabIndex, -1);
    assert.equal(saturation.getAttribute('aria-label'), '채도'); assert.equal(brightness.getAttribute('aria-label'), '명도');
    area.dispatch('keydown', { key: 'ArrowDown', preventDefault() {} });
    assert.equal(picker.getAreaValue().y, 0.99); assert.equal(focused, brightness);
    assert.equal(saturation.tabIndex, -1); assert.equal(brightness.tabIndex, 0);
    saturation.value = '50'; saturation.dispatch('input');
    assert.equal(picker.getAreaValue().x, 0.5); assert.equal(picker.getAreaValue().y, 0.99);
    const revision = picker.getSnapshot().revision;
    picker.setAreaAttributes(area, undefined, axes);
    assert.equal(saturation.listeners.get('input').size, 1); assert.equal(brightness.listeners.get('input').size, 1);
    assert.equal(picker.getSnapshot().revision, revision);
    assert.throws(() => picker.setAreaAttributes(area, undefined, { saturation, brightness: saturation }), TypeError);
    assert.equal(saturation.listeners.get('input').size, 1);
  } finally { picker.disconnect(); }
  for (const element of [area, saturation, brightness]) assert.ok([...element.listeners.values()].every(listeners => listeners.size === 0));
  assert.equal(saturation.getAttribute('aria-label'), '채도');
});

for (const mode of ['readOnly', 'disabled']) test(`DOM color area axes preserve ${mode} interaction policy`, () => {
  const area = new FakeElement(), saturation = new FakeInput(), brightness = new FakeInput();
  let focusCount = 0; saturation.focus = brightness.focus = () => { focusCount++; };
  const picker = createColorPicker({ root: new FakeElement(), defaultValue: '#ff0000', [mode]: true });
  picker.setAreaAttributes(area, undefined, { saturation, brightness });
  try {
    area.dispatch('keydown', { key: 'ArrowLeft', preventDefault() {} });
    saturation.value = '50'; saturation.dispatch('input');
    assert.equal(picker.getAreaValue().x, 1); assert.equal(saturation.value, '100');
    assert.equal(saturation.disabled, mode === 'disabled');
    assert.equal(saturation.getAttribute('aria-readonly'), String(mode === 'readOnly'));
    assert.equal(area.getAttribute('aria-readonly'), null);
    if (mode === 'disabled') {
      assert.equal(saturation.tabIndex, -1); assert.equal(brightness.tabIndex, -1); assert.equal(focusCount, 0);
    } else { assert.equal(saturation.tabIndex, 0); assert.equal(focusCount, 1); }
  } finally { picker.disconnect(); }
});

function replaceBorrowedAreaAxes() {
  const area = new FakeElement(), oldAxes = { saturation: new FakeInput(), brightness: new FakeInput() };
  const picker = createColorPicker({ root: new FakeElement() });
  picker.setAreaAttributes(area, undefined, oldAxes);
  picker.setAreaAttributes(area, undefined, { saturation: new FakeInput(), brightness: new FakeInput() });
  assert.equal(oldAxes.saturation.listeners.get('input').size, 0); assert.equal(oldAxes.brightness.listeners.get('input').size, 0);
  assert.equal(oldAxes.saturation.getAttribute('aria-label'), null);
  return { picker, saturation: new WeakRef(oldAxes.saturation), brightness: new WeakRef(oldAxes.brightness) };
}
test('live DOM color area releases replaced borrowed axes', { skip: typeof global.gc !== 'function' }, async () => {
  const saved = replaceBorrowedAreaAxes();
  try {
    for (let turn = 0; turn < 24; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
    assert.equal(saved.saturation.deref(), undefined); assert.equal(saved.brightness.deref(), undefined);
  } finally { saved.picker.disconnect(); }
});

test('DOM ColorPicker exposes the canonical native input projection without mounting parts', () => {
  const picker = createColorPicker({ root: new FakeElement(), defaultValue: '#33669980', defaultDraft: 'unfinished' });
  const state = picker.getSnapshot().state;
  const native = getColorPickerInputAttributes(state, { part: 'native-input' }); assert.equal(native.type, 'color'); assert.equal(native.value, '#336699');
  const text = getColorPickerInputAttributes(state, { part: 'text-input', readOnly: true }); assert.equal(text.value, 'unfinished'); assert.equal(text.readonly, true); assert.equal(text['aria-invalid'], 'true');
  const hue = getColorPickerInputAttributes(state, { part: 'hue-slider' }); assert.equal(hue.value, '210'); assert.equal(hue.max, 360);
  const alpha = getColorPickerInputAttributes(state, { part: 'alpha-slider', allowAlpha: false }); assert.equal(alpha.value, '50'); assert.equal(alpha.max, 100); assert.equal(alpha.disabled, true);
  picker.disconnect();
});

test('DOM ColorPicker preserves caller names and value text while owned fallbacks update and release', () => {
  const picker = createColorPicker({ root: new FakeElement(), defaultValue: '#ff0000' });
  const channel = new FakeInput(), coordinate = new FakeInput(), area = new FakeElement(), hue = new FakeInput(), alpha = new FakeInput(), swatch = new FakeElement();
  const parts = [channel, coordinate, area, hue, alpha, swatch];
  for (const [index, element] of parts.entries()) element.setAttribute('aria-label', `색상 부분 ${index}`);
  area.setAttribute('aria-valuetext', '채도 100%, 명도 100%'); coordinate.setAttribute('aria-valuetext', '빨강 255');
  picker.setChannelInputAttributes(channel, 'red'); picker.setCoordinateInputAttributes(coordinate, 'rgb', 'red'); picker.setAreaAttributes(area); picker.setHueInputAttributes(hue); picker.setAlphaInputAttributes(alpha); picker.setSwatchAttributes(swatch);
  picker.handleEvent({ type: 'set-color', value: '#00ff00' });
  for (const [index, element] of parts.entries()) assert.equal(element.attributes.get('aria-label'), `색상 부분 ${index}`);
  assert.equal(area.attributes.get('aria-description'), '채도 100%, 명도 100%'); assert.equal(coordinate.attributes.get('aria-valuetext'), '빨강 255');
  const labelled = new FakeInput(); labelled.setAttribute('aria-labelledby', 'color-hue-label'); picker.setHueInputAttributes(labelled); assert.equal(labelled.attributes.has('aria-label'), false);
  const generated = new FakeElement(); picker.setSwatchAttributes(generated); assert.equal(generated.attributes.get('aria-label'), '#00ff00');
  picker.handleEvent({ type: 'set-color', value: '#0000ff' }); assert.equal(generated.attributes.get('aria-label'), '#0000ff');
  generated.setAttribute('aria-label', '외부에서 변경'); picker.refresh(); picker.disconnect();
  assert.equal(generated.attributes.get('aria-label'), '외부에서 변경'); assert.equal(area.attributes.get('aria-label'), '색상 부분 2'); assert.equal(labelled.attributes.get('aria-labelledby'), 'color-hue-label');
  assert.equal(channel.attributes.has('aria-valuetext'), false, 'only generated value text is removed');
  const next = createColorPicker({ root: new FakeElement() }); const fallback = new FakeInput(); next.setCoordinateInputAttributes(fallback, 'rgb', 'red'); assert.equal(fallback.attributes.get('aria-label'), 'Red');
  next.setCoordinateInputAttributes(fallback, 'hsl', 'lightness'); assert.equal(fallback.attributes.get('aria-label'), 'Lightness');
  fallback.setAttribute('aria-labelledby', 'lightness-label'); next.refresh(); assert.equal(fallback.attributes.has('aria-label'), false);
  next.disconnect(); assert.equal(fallback.attributes.has('aria-valuetext'), false); assert.equal(fallback.attributes.get('aria-labelledby'), 'lightness-label');
});

test('DOM color picker composes native color, text, channel, and swatch parts', () => {
  const root = new FakeElement(); const native = new FakeInput(); const text = new FakeInput(); const alpha = new FakeInput(); const swatch = new FakeElement();
  const picker = createColorPicker({ root, defaultValue: '#33669980', label: 'Accent' });
  picker.setNativeInputAttributes(native); picker.setTextInputAttributes(text); picker.setChannelInputAttributes(alpha, 'alpha'); picker.setSwatchAttributes(swatch);
  assert.equal(root.attributes.get('role'), 'group'); assert.equal(native.type, 'color'); assert.equal(native.value, '#336699'); assert.equal(text.value, '#33669980'); assert.equal(alpha.value, '128');
  alpha.value = '64'; alpha.dispatch('input'); assert.equal(picker.getSnapshot().state.value.alpha, 64); assert.equal(swatch.dataset.color, 'rgba(51, 102, 153, 0.251)');
  picker.disconnect();
});

test('DOM color picker preserves invalid drafts and controlled values', () => {
  // Controlled RGB ownership is independent from achromatic editing intent.
  const root = new FakeElement(); const input = new FakeInput(); const proposals = [];
  const picker = createColorPicker({ root, value: '#000000', onValueChange: (value) => proposals.push(value) });
  picker.setTextInputAttributes(input); input.value = '#ff0000'; input.dispatch('input'); input.dispatch('keydown', { key: 'Enter', preventDefault() {} });
  assert.equal(proposals.length, 1); assert.deepEqual(picker.getSnapshot().state.value, { red: 0, green: 0, blue: 0, alpha: 255 });
  picker.syncControlledValues({ value: '#ff0000' }); assert.equal(picker.getCSSColor(), 'rgb(255, 0, 0)'); picker.disconnect();
});

test('DOM color picker projects retained hue and settles precise controlled area proposals', () => {
  const hue = new FakeInput(), values = [], picker = createColorPicker({ root: new FakeElement(), value: '#000000', onValueChange: value => values.push(value) });
  picker.setHueInputAttributes(hue); hue.value = '120'; hue.dispatch('input');
  assert.equal(hue.value, '120'); assert.equal(values.length, 0);
  assert.equal(picker.syncControlledValues({ value: '#000000' }).ok, true); assert.equal(hue.value, '120');
  picker.handleEvent({ type: 'set-area', x: 0.333333, y: 0.456789 });
  assert.equal(picker.getAreaValue().y, 0);
  assert.equal(picker.syncControlledValues({ value: values.at(-1) }).ok, true);
  assert.equal(picker.getAreaValue().x, 0.333333); assert.equal(picker.getAreaValue().y, 0.456789);
  assert.equal(picker.getCoordinates('hsv')[0].value, 120);
  picker.disconnect(); assert.equal(hue.listeners.get('input')?.size ?? 0, 0);
});

test('controlled DOM color text keeps native draft until owner settlement', () => {
  const root = new FakeElement();
  const input = new FakeInput();
  const proposals = [];
  const picker = createColorPicker({
    root,
    value: '#000000',
    draft: null,
    onDraftChange: (draft) => proposals.push(draft),
  });
  picker.setTextInputAttributes(input);

  input.value = '#ff0000';
  input.dispatch('input', { isComposing: false });

  assert.deepEqual(proposals, ['#ff0000']);
  assert.equal(picker.getSnapshot().state.draft, null);
  assert.equal(input.value, '#ff0000');

  assert.equal(picker.syncControlledValues({ value: '#000000', draft: null }).ok, true);
  assert.equal(input.value, '#000000');
  picker.disconnect();
});

test('DOM color text defers commit shortcuts until composition ends', () => {
  const root = new FakeElement();
  const input = new FakeInput();
  const picker = createColorPicker({ root, defaultValue: '#000000' });
  picker.setTextInputAttributes(input);
  let prevented = false;

  input.dispatch('compositionstart');
  input.value = '#ff0000';
  input.dispatch('input', { isComposing: true });
  input.dispatch('keydown', {
    key: 'Enter',
    isComposing: true,
    preventDefault() { prevented = true; },
  });

  assert.equal(prevented, false);
  assert.equal(input.value, '#ff0000');

  input.dispatch('compositionend');
  assert.equal(input.value, '#ff0000');
  picker.disconnect();
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
  assert.equal(area.attributes.get('aria-description'), '100% saturation, 100% brightness'); assert.equal(hue.value, '0'); assert.equal(alpha.value, '100');
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
class FakeElement { attributes = new Map(); listeners = new Map(); dataset = {}; style = new FakeStyle(); tabIndex = -1; getAttribute(name) { return this.attributes.get(name) ?? null; } setAttribute(name, value) { this.attributes.set(name, value); } removeAttribute(name) { this.attributes.delete(name); } addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); } removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); } dispatch(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); } getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; } setPointerCapture() {} }
class FakeInput extends FakeElement { type = ''; value = ''; min = ''; max = ''; step = ''; inputMode = ''; disabled = false; readOnly = false; }

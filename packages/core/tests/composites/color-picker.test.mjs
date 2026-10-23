import assert from 'node:assert/strict';
import test from 'node:test';
import { applyColorPickerEvent, createColorPickerState, formatColorValue, getColorAreaValue, getColorCoordinates, parseColorValue, reconcileColorPickerState, setColorCoordinate, tryCreateColorPickerState } from '../../.verification-dist/color-picker.js';

test('color area events reuse the fully admitted external coordinates', () => {
  const base = createColorPickerState({ value: '#33669980' });
  const tracked = () => {
    const reads = { x: 0, y: 0, hue: 0 };
    const area = Object.freeze({
      get x() { reads.x++; return base.area.x; },
      get y() { reads.y++; return base.area.y; },
      get hue() { reads.hue++; return base.area.hue; },
    });
    return { state: Object.freeze({ ...base, area }), reads };
  };
  for (const event of [{ type: 'set-area', x: 0.75, y: 0.5 }, { type: 'set-hue', value: 120 },
    ...['hue', 'saturation', 'value'].map(coordinate => ({ type: 'set-coordinate', format: 'hsv', coordinate, value: 50 }))]) {
    const boundary = tracked(); assert.equal(tryCreateColorPickerState(boundary.state).ok, true);
    const transition = tracked(); assert.equal(applyColorPickerEvent(transition.state, event).ok, true);
    assert.deepEqual(transition.reads, boundary.reads, event.type + ' must not re-admit external area after boundary validation');
  }
});

test('color picker retains hue and saturation through achromatic area edits', () => {
  let state = createColorPickerState({ value: '#000000' });
  const hue = applyColorPickerEvent(state, { type: 'set-hue', value: 120 }).value;
  assert.deepEqual(hue.commands, []); state = hue.state;
  assert.equal(getColorAreaValue(state.value, state.area).value.hue, 120);
  state = applyColorPickerEvent(state, { type: 'set-area', x: 1, y: 1 }).value.state;
  assert.equal(formatColorValue(state.value).value, '#00ff00');
  state = applyColorPickerEvent(state, { type: 'set-area', x: 0.75, y: 0 }).value.state;
  assert.equal(formatColorValue(state.value).value, '#000000');
  assert.deepEqual(getColorAreaValue(state.value, state.area).value, { x: 0.75, y: 0, hue: 120, alpha: 1 });
  state = applyColorPickerEvent(state, { type: 'set-coordinate', format: 'hsv', coordinate: 'value', value: 100 }).value.state;
  assert.equal(formatColorValue(state.value).value, '#40ff40');
  state = applyColorPickerEvent(state, { type: 'set-area', x: 0, y: 0.5 }).value.state;
  state = applyColorPickerEvent(state, { type: 'set-hue', value: 240 }).value.state;
  state = applyColorPickerEvent(state, { type: 'set-area', x: 1, y: 1 }).value.state;
  assert.equal(formatColorValue(state.value).value, '#0000ff');
});

test('color picker preserves exact pointer coordinates and hue endpoint through non-RGB edits', () => {
  let state = createColorPickerState({ value: '#ff0000' });
  state = applyColorPickerEvent(state, { type: 'set-hue', value: 360 }).value.state;
  state = applyColorPickerEvent(state, { type: 'set-area', x: 0.333333, y: 0.456789 }).value.state;
  for (const event of [{ type: 'set-alpha', value: 0.5 }, { type: 'input', text: 'unfinished' }, 'cancel', { type: 'set-format', format: 'hsv' }])
    state = applyColorPickerEvent(state, event).value.state;
  const area = getColorAreaValue(state.value, state.area).value;
  assert.deepEqual(area, { x: 0.333333, y: 0.456789, hue: 360, alpha: 128 / 255 });
  assert.equal(getColorCoordinates(state.value, 'hsv', state.area).value[0].value, 360);
  state = applyColorPickerEvent(state, { type: 'set-color', value: '#0000ff' }).value.state;
  assert.equal(getColorAreaValue(state.value, state.area).value.hue, 240);
});

test('color picker owner reconciliation preserves accepted selection and discards rejected or unrelated proposals', () => {
  let previous = createColorPickerState({ value: '#000000' });
  previous = applyColorPickerEvent(previous, { type: 'set-hue', value: 120 }).value.state;
  const proposal = applyColorPickerEvent(previous, { type: 'set-area', x: 0.333333, y: 0.456789 }).value.state;
  const rejected = reconcileColorPickerState(previous, { value: '#000000', draft: 'draft' }, {}, proposal).value;
  assert.equal(rejected.area.hue, 120); assert.equal(rejected.area.y, 0);
  const accepted = reconcileColorPickerState(previous, { value: proposal.value }, {}, proposal).value;
  assert.deepEqual(accepted.area, proposal.area);
  const unrelated = reconcileColorPickerState(previous, { value: '#0000ff' }, {}, proposal).value;
  assert.equal(unrelated.area.hue, 240);
});

test('color picker rejects forged area selection without changing RGB8 storage', () => {
  assert.equal(tryCreateColorPickerState({ value: '#ff0000', area: { x: 1, y: 1, hue: 120 } }).error.code, 'color-coordinate-invalid');
  for (const area of [{ x: NaN, y: 0, hue: 0 }, { x: 0, y: 0, hue: 361 }, { x: 0, y: -1, hue: 0 }])
    assert.equal(tryCreateColorPickerState({ value: '#000000', area }).error.code, 'color-area-out-of-range');
  const legacy = { value: { red: 0, green: 0, blue: 0, alpha: 255 }, draft: null, format: 'hex', channel: 'red' };
  assert.equal(applyColorPickerEvent(legacy, { type: 'set-hue', value: 120 }).value.state.area.hue, 120);
});

test('color picker parses compact and full hexadecimal colors exactly', () => {
  assert.deepEqual(parseColorValue('#0af').value, { red: 0, green: 170, blue: 255, alpha: 255 });
  assert.deepEqual(parseColorValue('#33669980').value, { red: 51, green: 102, blue: 153, alpha: 128 });
  assert.equal(formatColorValue({ red: 51, green: 102, blue: 153, alpha: 128 }).value, '#33669980');
});

test('color picker converts HSL, HSV, CMYK, and in-gamut OKLCH into exact RGBA storage', () => {
  assert.deepEqual(parseColorValue('hsl(0 100% 50%)').value, { red: 255, green: 0, blue: 0, alpha: 255 });
  assert.deepEqual(parseColorValue('hsv(120 100% 100%)').value, { red: 0, green: 255, blue: 0, alpha: 255 });
  assert.deepEqual(parseColorValue('device-cmyk(100% 0% 0% 0%)').value, { red: 0, green: 255, blue: 255, alpha: 255 });
  assert.deepEqual(parseColorValue('oklch(62.7955% 0.25768 29.2339)').value, { red: 255, green: 0, blue: 0, alpha: 255 });
});

test('color picker projects every supported representation from one RGBA value', () => {
  const value = { red: 51, green: 102, blue: 153, alpha: 128 };
  assert.equal(formatColorValue(value, 'rgb').value, 'rgba(51, 102, 153, 0.502)');
  assert.equal(formatColorValue(value, 'hsl').value, 'hsla(210, 50%, 40%, 0.502)');
  assert.equal(formatColorValue(value, 'hsv').value, 'hsv(210 67% 60% / 0.502)');
  assert.equal(formatColorValue(value, 'cmyk').value, 'device-cmyk(67% 33% 0% 40% / 0.502)');
  assert.equal(formatColorValue(value, 'oklch').value, 'oklch(49.93% 0.0987 250.43 / 0.502)');
});

test('color picker exposes model coordinates without changing canonical RGBA storage', () => {
  const value = { red: 255, green: 0, blue: 0, alpha: 128 };
  assert.deepEqual(getColorAreaValue(value).value, { x: 1, y: 1, hue: 0, alpha: 128 / 255 });
  assert.deepEqual(getColorCoordinates(value, 'hsv').value.map(({ coordinate, value: channel }) => [coordinate, channel]), [
    ['hue', 0], ['saturation', 100], ['value', 100], ['alpha', 50],
  ]);
  assert.deepEqual(setColorCoordinate(value, 'hsv', 'hue', 120).value, { red: 0, green: 255, blue: 0, alpha: 128 });
  assert.equal(getColorCoordinates(value, 'hex').value.length, 0);
});

test('color picker area, hue, alpha, and model coordinate events share one value', () => {
  let state = createColorPickerState({ value: '#ff0000', format: 'oklch' });
  state = applyColorPickerEvent(state, { type: 'set-area', x: 1, y: 0.5 }).value.state;
  assert.deepEqual(state.value, { red: 128, green: 0, blue: 0, alpha: 255 });
  state = applyColorPickerEvent(state, { type: 'set-hue', value: 240 }).value.state;
  assert.deepEqual(state.value, { red: 0, green: 0, blue: 128, alpha: 255 });
  state = applyColorPickerEvent(state, { type: 'set-alpha', value: 0.5 }).value.state;
  assert.equal(state.value.alpha, 128);
  state = applyColorPickerEvent(state, { type: 'set-coordinate', format: 'rgb', coordinate: 'green', value: 64 }).value.state;
  assert.equal(state.value.green, 64);
});

test('color picker rejects invalid visual and model coordinates', () => {
  const state = createColorPickerState({ value: '#ff0000' });
  assert.equal(applyColorPickerEvent(state, { type: 'set-area', x: 2, y: 0 }).error.code, 'color-area-out-of-range');
  assert.equal(applyColorPickerEvent(state, { type: 'set-hue', value: -1 }).error.code, 'color-hue-out-of-range');
  assert.equal(setColorCoordinate(state.value, 'cmyk', 'red', 1).error.code, 'color-coordinate-out-of-range');
});

test('color picker rejects out-of-range components and out-of-sRGB OKLCH explicitly', () => {
  assert.equal(parseColorValue('hsl(0 101% 50%)').error.code, 'color-text-invalid');
  assert.equal(parseColorValue('device-cmyk(0% 0% 0% 101%)').error.code, 'color-text-invalid');
  assert.equal(parseColorValue('oklch(80% 0.5 120)').error.code, 'color-out-of-gamut');
});

test('color picker keeps invalid text as a draft and commits atomically', () => {
  let state = createColorPickerState({ value: '#336699' });
  state = applyColorPickerEvent(state, { type: 'input', text: '#nope' }).value.state;
  assert.equal(state.draft, '#nope');
  assert.equal(applyColorPickerEvent(state, 'commit').ok, false);
  assert.deepEqual(state.value, { red: 51, green: 102, blue: 153, alpha: 255 });
  const update = applyColorPickerEvent(state, { type: 'set-color', value: 'rgba(1, 2, 3, 0.5)' }).value;
  assert.deepEqual(update.state.value, { red: 1, green: 2, blue: 3, alpha: 128 });
  assert.equal(update.commands[1].text, '#01020380');
});

test('color picker adjusts one active integer channel with explicit steps', () => {
  let state = createColorPickerState({ value: '#000000', channel: 'blue' });
  state = applyColorPickerEvent(state, 'increment', { channelStep: 16 }).value.state;
  assert.deepEqual(state.value, { red: 0, green: 0, blue: 16, alpha: 255 });
  state = applyColorPickerEvent(state, { type: 'set-channel', channel: 'alpha', value: 64 }).value.state;
  assert.equal(state.value.alpha, 64);
});

test('opaque policy rejects alpha construction and mutation', () => {
  assert.equal(tryCreateColorPickerState({ value: '#00000080' }, { allowAlpha: false }).ok, false);
  const state = createColorPickerState({ value: '#000000' }, { allowAlpha: false });
  assert.equal(applyColorPickerEvent(state, { type: 'set-channel', channel: 'alpha', value: 128 }, { allowAlpha: false }).ok, false);
  assert.equal(parseColorValue('not-a-color').ok, false);
});

test('color picker changes representation without changing its RGBA value', () => {
  const state = createColorPickerState({ value: '#33669980' });
  for (const format of ['hex', 'rgb', 'hsl', 'hsv', 'cmyk', 'oklch']) {
    const update = applyColorPickerEvent(state, { type: 'set-format', format }).value;
    assert.equal(update.state.format, format);
    assert.deepEqual(update.state.value, state.value);
  }
});

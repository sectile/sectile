import assert from 'node:assert/strict';
import test from 'node:test';
import { applyColorPickerEvent, createColorPickerState, formatColorValue, parseColorValue } from '../../dist/color-picker.js';

test('color picker parses compact and full hexadecimal colors exactly', () => {
  assert.deepEqual(parseColorValue('#0af').value, { red: 0, green: 170, blue: 255, alpha: 255 });
  assert.deepEqual(parseColorValue('#33669980').value, { red: 51, green: 102, blue: 153, alpha: 128 });
  assert.equal(formatColorValue({ red: 51, green: 102, blue: 153, alpha: 128 }).value, '#33669980');
});

test('color picker keeps invalid text as a draft and commits atomically', () => {
  let state = createColorPickerState({ value: '#336699' }).value;
  state = applyColorPickerEvent(state, { type: 'input', text: '#nope' }).value.state;
  assert.equal(state.draft, '#nope');
  assert.equal(applyColorPickerEvent(state, 'commit').ok, false);
  assert.deepEqual(state.value, { red: 51, green: 102, blue: 153, alpha: 255 });
  const update = applyColorPickerEvent(state, { type: 'set-color', value: 'rgba(1, 2, 3, 0.5)' }).value;
  assert.deepEqual(update.state.value, { red: 1, green: 2, blue: 3, alpha: 128 });
  assert.equal(update.commands[1].text, '#01020380');
});

test('color picker adjusts one active integer channel with explicit steps', () => {
  let state = createColorPickerState({ value: '#000000', channel: 'blue' }).value;
  state = applyColorPickerEvent(state, 'increment', { channelStep: 16 }).value.state;
  assert.deepEqual(state.value, { red: 0, green: 0, blue: 16, alpha: 255 });
  state = applyColorPickerEvent(state, { type: 'set-channel', channel: 'alpha', value: 64 }).value.state;
  assert.equal(state.value.alpha, 64);
});

test('opaque policy rejects alpha construction and mutation', () => {
  assert.equal(createColorPickerState({ value: '#00000080' }, { allowAlpha: false }).ok, false);
  const state = createColorPickerState({ value: '#000000' }, { allowAlpha: false }).value;
  assert.equal(applyColorPickerEvent(state, { type: 'set-channel', channel: 'alpha', value: 128 }, { allowAlpha: false }).ok, false);
  assert.equal(parseColorValue('not-a-color').ok, false);
});

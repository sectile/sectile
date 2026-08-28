import assert from 'node:assert/strict';
import test from 'node:test';
import { createColorPicker } from '../.verification-dist/color-picker.js';

test('terminal color picker edits text and commits one exact color', () => {
  const picker = createColorPicker({ defaultValue: '#33669980' });
  picker.handleTextInput('rgb(255, 0, 128)'); assert.equal(picker.getText(), 'rgb(255, 0, 128)'); picker.handleKeyboardInput({ key: 'enter' });
  assert.deepEqual(picker.getSnapshot().state.value, { red: 255, green: 0, blue: 128, alpha: 255 }); assert.equal(picker.getText(), '#ff0080');
});

test('terminal color picker traverses and adjusts RGBA channels', () => {
  const picker = createColorPicker({ defaultValue: '#000000', channelStep: 16 });
  picker.handleKeyboardInput({ key: 'right' }); picker.handleKeyboardInput({ key: 'up' });
  assert.equal(picker.getSnapshot().state.channel, 'green'); assert.equal(picker.getSnapshot().state.value.green, 16);
});

test('terminal read-only color picker rejects value mutation', () => {
  const picker = createColorPicker({ defaultValue: '#000000', readOnly: true });
  assert.equal(picker.handleKeyboardInput({ key: 'up' }), false); assert.equal(picker.getCSSColor(), 'rgb(0, 0, 0)');
});

test('terminal color picker accepts and projects OKLCH through the shared core format', () => {
  const picker = createColorPicker({ defaultValue: 'oklch(62.7955% 0.25768 29.2339)', defaultFormat: 'oklch' });
  assert.deepEqual(picker.getSnapshot().state.value, { red: 255, green: 0, blue: 0, alpha: 255 });
  assert.equal(picker.getText(), 'oklch(62.8% 0.2577 29.23)');
});

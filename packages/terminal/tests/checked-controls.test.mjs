import assert from 'node:assert/strict'; import test from 'node:test'; import { unwrap } from '@sectile/primitives/result';
import { createCheckbox } from '../dist/checkbox.js'; import { createSwitch } from '../dist/switch.js'; import { createToggleButton } from '../dist/toggle-button.js';
test('terminal checked controls own enter and space dispatch', () => {
  const checkbox = unwrap(createCheckbox({ defaultValue: 'mixed' })); checkbox.handleKeyboardInput({ key: 'space' }); assert.equal(checkbox.getSnapshot().state.checked, true);
  const control = unwrap(createSwitch()); control.handleKeyboardInput({ key: 'enter' }); assert.equal(control.getSnapshot().state.checked, true);
  const toggle = unwrap(createToggleButton()); toggle.handleKeyboardInput({ key: 'space' }); assert.equal(toggle.getSnapshot().state.pressed, true); assert.equal(toggle.handleKeyboardInput({ key: 'tab' }), false);
});

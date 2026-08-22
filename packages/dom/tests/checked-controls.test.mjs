import assert from 'node:assert/strict'; import test from 'node:test'; import { unwrap } from '@sectile/core/result';
import { createCheckbox, createCheckboxController, getCheckboxAttributes } from '../dist/checkbox.js'; import { createSwitch } from '../dist/switch.js'; import { createToggleButton } from '../dist/toggle-button.js';
test('DOM checked controls own click dispatch and role-specific ARIA', () => {
  const checkboxElement = new FakeElement(); const checkbox = createCheckbox({ element: checkboxElement, defaultValue: 'mixed' }); checkboxElement.emit('click'); assert.equal(checkbox.getSnapshot().state.checked, true); assert.equal(checkboxElement.attributes.get('aria-checked'), 'true');
  const switchElement = new FakeElement(); const control = createSwitch({ element: switchElement }); switchElement.emit('click'); assert.equal(control.getSnapshot().state.checked, true); assert.equal(switchElement.attributes.get('role'), 'switch');
  const button = new FakeElement(); const toggle = createToggleButton({ element: button }); button.emit('click'); assert.equal(toggle.getSnapshot().state.pressed, true); assert.equal(button.attributes.get('aria-pressed'), 'true');
});
test('DOM checked controls project and enforce interaction state', () => {
  const disabledElement = new FakeElement();
  const disabled = createSwitch({ element: disabledElement, disabled: true });
  assert.equal(disabledElement.attributes.get('aria-disabled'), 'true');
  assert.equal(disabledElement.disabled, true);
  disabledElement.emit('click');
  assert.equal(disabled.getSnapshot().state.checked, false);

  const readOnlyElement = new FakeElement();
  const readOnly = createCheckbox({ element: readOnlyElement, readOnly: true });
  assert.equal(readOnlyElement.attributes.get('aria-readonly'), 'true');
  readOnlyElement.emit('click');
  assert.equal(readOnly.getSnapshot().state.checked, false);
});
test('DOM checkbox exposes a pure declarative attribute projection', () => {
  const controller = unwrap(createCheckboxController({ defaultValue: 'mixed', readOnly: true }));
  const attributes = getCheckboxAttributes(controller.getSnapshot().state, { readOnly: true, native: true });
  assert.deepEqual(attributes, {
    role: 'checkbox',
    'aria-checked': 'mixed',
    'aria-disabled': undefined,
    'aria-readonly': 'true',
    'data-state': 'indeterminate',
    'data-disabled': undefined,
    'data-readonly': '',
    disabled: false,
    readOnly: undefined,
    'data-scope': 'checkbox',
    'data-part': 'root',
  });
});
class FakeElement { attributes = new Map(); listeners = new Map(); disabled = false; readOnly = false; setAttribute(name, value) { this.attributes.set(name, value); } removeAttribute(name) { this.attributes.delete(name); } addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); } removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); } emit(type) { for (const listener of this.listeners.get(type) ?? []) listener(); } }

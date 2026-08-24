import assert from 'node:assert/strict'; import test from 'node:test';
import { applyCheckboxEvent, createCheckboxState } from '../../.verification-dist/checkbox.js';
import { applySwitchEvent, createSwitchState } from '../../.verification-dist/switch.js';
import { applyToggleButtonEvent, createToggleButtonState } from '../../.verification-dist/toggle-button.js';
import { referenceApplyCheckedEvent, referenceCheckedState } from '../../.verification-dist/internal/reference/state/checked.js';
import { unwrap } from '../support.mjs';
test('checked algebra matches independent reference for binary and mixed values', () => {
  for (const checked of [false, true, 'mixed']) for (const mixedToggle of [false, true]) for (const event of ['toggle',
    { type: 'set-checked', checked: false }, { type: 'set-checked', checked: true }, { type: 'set-checked', checked: 'mixed' }]) {
    const policies = { allowMixed: true, mixedToggle };
    assert.deepEqual(observe(applyCheckboxEvent(createCheckboxState(checked, policies), event, policies)), observeReference(referenceApplyCheckedEvent(referenceCheckedState(checked), event, policies)));
  }
});
test('switch and toggle button are binary projections with role-specific vocabulary', () => {
  const switched = unwrap(applySwitchEvent(createSwitchState(false), 'toggle'));
  assert.equal(switched.state.checked, true); assert.deepEqual(switched.commands, [{ type: 'checked-changed', checked: true }]);
  const pressed = unwrap(applyToggleButtonEvent(createToggleButtonState(false), 'toggle'));
  assert.equal(pressed.state.pressed, true); assert.deepEqual(pressed.commands, [{ type: 'pressed-changed', pressed: true }]);
});
function observe(result) { return result.ok ? { ok: true, checked: result.value.state.checked, commands: result.value.commands } : { ok: false, errorClass: result.error.class, errorCode: result.error.code }; }
function observeReference(result) { return result.ok ? { ok: true, checked: result.value.state.checked, commands: result.value.commands } : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode }; }

import type { Result } from '../../shared.js';
import { fail, ok } from '../kernel/foundation.js';
import { createMachineUpdate, type MachineUpdate } from '../kernel/machine.js';

export type CheckedValue = boolean | 'mixed';
export interface CheckedState { readonly checked: CheckedValue }
export type CheckedEvent = 'toggle' | { readonly type: 'set-checked'; readonly checked: CheckedValue };
export type CheckedCommand = { readonly type: 'checked-changed'; readonly checked: CheckedValue };
export interface CheckedPolicies { readonly allowMixed?: boolean; readonly mixedToggle?: boolean }

export function createCheckedState(value: CheckedValue = false, policies: CheckedPolicies = {}): Result<CheckedState> {
  if (!valid(value) || (value === 'mixed' && policies.allowMixed === false)) {
    return fail('construction', 'invalid-checked-value', 'Checked value must be permitted by the checked policy.');
  }
  return ok(Object.freeze({ checked: value }));
}
export function applyCheckedEvent(state: CheckedState, event: CheckedEvent, policies: CheckedPolicies = {}): Result<MachineUpdate<CheckedState, CheckedCommand>> {
  const validState = createCheckedState(state.checked, policies);
  if (!validState.ok) return { ok: false, error: { ...validState.error, class: 'transition-rejection' } };
  let next: CheckedValue | null = null;
  if (event === 'toggle') next = state.checked === 'mixed' ? (policies.mixedToggle ?? true) : !state.checked;
  else if (typeof event === 'object' && event.type === 'set-checked' && valid(event.checked)) next = event.checked;
  if (next === null || (next === 'mixed' && policies.allowMixed === false)) {
    return fail('transition-rejection', 'invalid-checked-event', 'Checked event is not permitted by the checked policy.');
  }
  if (next === state.checked) return createMachineUpdate(state);
  const created = createCheckedState(next, policies); if (!created.ok) return created;
  return createMachineUpdate(created.value, [{ type: 'checked-changed', checked: next }]);
}
function valid(value: unknown): value is CheckedValue { return value === true || value === false || value === 'mixed'; }

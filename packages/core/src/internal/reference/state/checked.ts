import type { CheckedCommand, CheckedEvent, CheckedPolicies, CheckedState, CheckedValue } from '../../state/checked.js';
export type ReferenceCheckedResult =
  | { readonly ok: true; readonly value: { readonly state: CheckedState; readonly commands: readonly CheckedCommand[] } }
  | { readonly ok: false; readonly errorClass: string; readonly errorCode: string };
export function referenceCheckedState(checked: CheckedValue = false): CheckedState { return Object.freeze({ checked }); }
export function referenceApplyCheckedEvent(state: CheckedState, event: CheckedEvent, policies: CheckedPolicies = {}): ReferenceCheckedResult {
  if ((state.checked === 'mixed' && policies.allowMixed === false) || ![true, false, 'mixed'].includes(state.checked)) return rejected('invalid-checked-value');
  const next = event === 'toggle' ? state.checked === 'mixed' ? (policies.mixedToggle ?? true) : !state.checked
    : typeof event === 'object' && event.type === 'set-checked' ? event.checked : null;
  if (next === null || (next === 'mixed' && policies.allowMixed === false)) return rejected('invalid-checked-event');
  const commands: CheckedCommand[] = next === state.checked ? [] : [{ type: 'checked-changed', checked: next }];
  return { ok: true as const, value: { state: next === state.checked ? state : referenceCheckedState(next), commands } };
}
function rejected(errorCode: string): ReferenceCheckedResult { return { ok: false, errorClass: 'transition-rejection', errorCode }; }

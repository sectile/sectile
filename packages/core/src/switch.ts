import { unwrap } from './result.js';
import type { Result } from './shared.js';
import { applyCheckedEvent, createCheckedState, type CheckedState,tryCreateCheckedState } from './internal/state/checked.js';
export type SwitchState = CheckedState & { readonly checked: boolean };
export type SwitchEvent = 'toggle' | { readonly type: 'set-checked'; readonly checked: boolean };
export type SwitchCommand = { readonly type: 'checked-changed'; readonly checked: boolean };
export interface SwitchUpdate { readonly state: SwitchState; readonly commands: readonly SwitchCommand[] }
export function createSwitchState(checked = false): SwitchState {
  return unwrap(tryCreateSwitchState(checked));
}

export function tryCreateSwitchState(checked = false): Result<SwitchState> { return tryCreateCheckedState(checked, { allowMixed: false }) as Result<SwitchState>; }
export function applySwitchEvent(state: SwitchState, event: SwitchEvent): Result<SwitchUpdate> { return applyCheckedEvent(state, event, { allowMixed: false }) as Result<SwitchUpdate>; }

import type { Result } from './shared.js';
import { applyCheckedEvent, createCheckedState } from './internal/state/checked.js';
export interface ToggleButtonState { readonly pressed: boolean }
export type ToggleButtonEvent = 'toggle' | { readonly type: 'set-pressed'; readonly pressed: boolean };
export type ToggleButtonCommand = { readonly type: 'pressed-changed'; readonly pressed: boolean };
export interface ToggleButtonUpdate { readonly state: ToggleButtonState; readonly commands: readonly ToggleButtonCommand[] }
export function createToggleButtonState(pressed = false): Result<ToggleButtonState> {
  const result = createCheckedState(pressed, { allowMixed: false });
  return result.ok ? { ok: true, value: Object.freeze({ pressed: result.value.checked as boolean }) } : result;
}
export function applyToggleButtonEvent(state: ToggleButtonState, event: ToggleButtonEvent): Result<ToggleButtonUpdate> {
  const mapped = event === 'toggle' ? event : { type: 'set-checked' as const, checked: event.pressed };
  const result = applyCheckedEvent({ checked: state.pressed }, mapped, { allowMixed: false });
  if (!result.ok) return result;
  return { ok: true, value: Object.freeze({
    state: Object.freeze({ pressed: result.value.state.checked as boolean }),
    commands: Object.freeze(result.value.commands.map((command) => ({ type: 'pressed-changed' as const, pressed: command.checked as boolean }))),
  }) };
}

import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core'; import { applyCheckboxEvent, createCheckboxState, type CheckboxCommand, type CheckboxEvent, type CheckboxPolicies, type CheckboxState, type CheckboxValue } from '@sectile/core/checkbox'; import { createTerminalCheckedControl, type TerminalCheckedControl } from './internal/checked-control.js';
export interface CheckboxOptions { readonly value?: CheckboxValue; readonly defaultValue?: CheckboxValue; readonly policies?: CheckboxPolicies; readonly disabled?: boolean; readonly readOnly?: boolean; readonly onValueChange?: (value: CheckboxValue) => void; readonly onUpdate?: () => void }
export type CheckboxConnection = TerminalCheckedControl<CheckboxState, CheckboxEvent, CheckboxValue>;
export function createCheckbox(options: CheckboxOptions = {}): FacadeConnection<CheckboxConnection> {
  return unwrap(tryCreateCheckbox(options));
}

export function tryCreateCheckbox(options: CheckboxOptions = {}): Result<FacadeConnection<CheckboxConnection>> {
  return createFacadeConnection(options, (options) => tryCreateCheckboxConnection(options));
}

function tryCreateCheckboxConnection(options: CheckboxOptions = {}): Result<CheckboxConnection> { return createTerminalCheckedControl<CheckboxState, CheckboxEvent, CheckboxCommand, CheckboxValue>({ controlled: options.value !== undefined, initial: createCheckboxState(options.value ?? options.defaultValue ?? false, options.policies), toggleEvent: 'toggle', reducer: (state, event) => applyCheckboxEvent(state, event, options.policies), create: (value) => createCheckboxState(value, options.policies), read: (state) => state.checked, interaction: options, onChange: options.onValueChange, onUpdate: options.onUpdate }); }

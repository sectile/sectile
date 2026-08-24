import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core'; import { applySwitchEvent, tryCreateSwitchState, type SwitchCommand, type SwitchEvent, type SwitchState } from '@sectile/core/switch'; import { createTerminalCheckedControl, type TerminalCheckedControl } from './internal/checked-control.js';
export interface SwitchOptions { readonly checked?: boolean; readonly defaultChecked?: boolean; readonly disabled?: boolean; readonly onCheckedChange?: (checked: boolean) => void; readonly onUpdate?: () => void }
export type SwitchConnection = TerminalCheckedControl<SwitchState, SwitchEvent, boolean>;
export function createSwitch(options: SwitchOptions = {}): FacadeConnection<SwitchConnection> {
  return unwrap(tryCreateSwitch(options));
}

export function tryCreateSwitch(options: SwitchOptions = {}): Result<FacadeConnection<SwitchConnection>> {
  return createFacadeConnection(options, (options) => tryCreateSwitchConnection(options));
}

function tryCreateSwitchConnection(options: SwitchOptions = {}): Result<SwitchConnection> { return createTerminalCheckedControl<SwitchState, SwitchEvent, SwitchCommand, boolean>({ controlled: options.checked !== undefined, initial: tryCreateSwitchState(options.checked ?? options.defaultChecked ?? false), toggleEvent: 'toggle', reducer: applySwitchEvent, create: tryCreateSwitchState, read: (state) => state.checked, interaction: options, onChange: options.onCheckedChange, onUpdate: options.onUpdate }); }

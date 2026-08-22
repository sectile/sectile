import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core'; import { applySwitchEvent, createSwitchState, type SwitchCommand, type SwitchEvent, type SwitchState } from '@sectile/core/switch';
import { createDOMCheckedControl, type DOMCheckedControl } from './internal/checked-control.js';
export interface SwitchOptions { readonly element: HTMLElement; readonly checked?: boolean; readonly defaultChecked?: boolean; readonly disabled?: boolean; readonly onCheckedChange?: (checked: boolean) => void; readonly onUpdate?: () => void }
export type SwitchConnection = DOMCheckedControl<SwitchState, SwitchEvent, boolean>;
export function createSwitch(options: SwitchOptions): FacadeConnection<SwitchConnection> {
  return unwrap(tryCreateSwitch(options));
}

export function tryCreateSwitch(options: SwitchOptions): Result<FacadeConnection<SwitchConnection>> {
  return createFacadeConnection(options, (options) => tryCreateSwitchConnection(options));
}

function tryCreateSwitchConnection(options: SwitchOptions): Result<SwitchConnection> { return createDOMCheckedControl<SwitchState, SwitchEvent, SwitchCommand, boolean>({ element: options.element, role: 'switch', attribute: 'aria-checked', controlled: options.checked !== undefined, initial: createSwitchState(options.checked ?? options.defaultChecked ?? false), toggleEvent: 'toggle', reducer: applySwitchEvent, create: createSwitchState, read: (state) => state.checked, format: String, interaction: options, onChange: options.onCheckedChange, onUpdate: options.onUpdate }); }

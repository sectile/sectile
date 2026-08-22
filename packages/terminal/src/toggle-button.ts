import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core'; import { applyToggleButtonEvent, createToggleButtonState, type ToggleButtonCommand, type ToggleButtonEvent, type ToggleButtonState } from '@sectile/core/toggle-button'; import { createTerminalCheckedControl, type TerminalCheckedControl } from './internal/checked-control.js';
export interface ToggleButtonOptions { readonly pressed?: boolean; readonly defaultPressed?: boolean; readonly disabled?: boolean; readonly onPressedChange?: (pressed: boolean) => void; readonly onUpdate?: () => void }
export type ToggleButtonConnection = TerminalCheckedControl<ToggleButtonState, ToggleButtonEvent, boolean>;
export function createToggleButton(options: ToggleButtonOptions = {}): FacadeConnection<ToggleButtonConnection> {
  return unwrap(tryCreateToggleButton(options));
}

export function tryCreateToggleButton(options: ToggleButtonOptions = {}): Result<FacadeConnection<ToggleButtonConnection>> {
  return createFacadeConnection(options, (options) => tryCreateToggleButtonConnection(options));
}

function tryCreateToggleButtonConnection(options: ToggleButtonOptions = {}): Result<ToggleButtonConnection> { return createTerminalCheckedControl<ToggleButtonState, ToggleButtonEvent, ToggleButtonCommand, boolean>({ controlled: options.pressed !== undefined, initial: createToggleButtonState(options.pressed ?? options.defaultPressed ?? false), toggleEvent: 'toggle', reducer: applyToggleButtonEvent, create: createToggleButtonState, read: (state) => state.pressed, interaction: options, onChange: options.onPressedChange, onUpdate: options.onUpdate }); }

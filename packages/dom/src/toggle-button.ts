import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core'; import { applyToggleButtonEvent, createToggleButtonState, type ToggleButtonCommand, type ToggleButtonEvent, type ToggleButtonState } from '@sectile/core/toggle-button';
import { createDOMCheckedControl, type DOMCheckedControl } from './internal/checked-control.js';
export interface ToggleButtonOptions { readonly element: HTMLElement; readonly pressed?: boolean; readonly defaultPressed?: boolean; readonly disabled?: boolean; readonly onPressedChange?: (pressed: boolean) => void; readonly onUpdate?: () => void }
export type ToggleButtonConnection = DOMCheckedControl<ToggleButtonState, ToggleButtonEvent, boolean>;
export function createToggleButton(options: ToggleButtonOptions): FacadeConnection<ToggleButtonConnection> {
  return unwrap(tryCreateToggleButton(options));
}

export function tryCreateToggleButton(options: ToggleButtonOptions): Result<FacadeConnection<ToggleButtonConnection>> {
  return createFacadeConnection(options, (options) => tryCreateToggleButtonConnection(options));
}

function tryCreateToggleButtonConnection(options: ToggleButtonOptions): Result<ToggleButtonConnection> { return createDOMCheckedControl<ToggleButtonState, ToggleButtonEvent, ToggleButtonCommand, boolean>({ element: options.element, attribute: 'aria-pressed', controlled: options.pressed !== undefined, initial: createToggleButtonState(options.pressed ?? options.defaultPressed ?? false), toggleEvent: 'toggle', reducer: applyToggleButtonEvent, create: createToggleButtonState, read: (state) => state.pressed, format: String, interaction: options, onChange: options.onPressedChange, onUpdate: options.onUpdate }); }

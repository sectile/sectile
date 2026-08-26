import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core'; import { applyToggleButtonEvent, tryCreateToggleButtonState, type ToggleButtonCommand, type ToggleButtonEvent, type ToggleButtonState } from '@sectile/core/toggle-button';
import {
  createCheckedControlController,
  createDOMCheckedControl,
  getCheckedControlAttributes,
  type CheckedControlAttributes,
  type CheckedControlController,
  type DOMCheckedControl,
} from './internal/checked-control.js';
export interface ToggleButtonOptions { readonly element: HTMLElement; readonly pressed?: boolean; readonly defaultPressed?: boolean; readonly disabled?: boolean; readonly readOnly?: boolean; readonly onPressedChange?: (pressed: boolean) => void; readonly onUpdate?: () => void }

export type ToggleButtonPressedChangeHandler = NonNullable<ToggleButtonOptions['onPressedChange']>;
export type ToggleButtonUpdateHandler = NonNullable<ToggleButtonOptions['onUpdate']>;
export type ToggleButtonConnection = DOMCheckedControl<ToggleButtonState, ToggleButtonEvent, boolean>;
export interface ToggleButtonControllerOptions { readonly pressed?: boolean; readonly defaultPressed?: boolean; readonly disabled?: boolean; readonly readOnly?: boolean; readonly onPressedChange?: (pressed: boolean) => void }

export type ToggleButtonControllerPressedChangeHandler = NonNullable<ToggleButtonControllerOptions['onPressedChange']>;
export type ToggleButtonController = CheckedControlController<ToggleButtonState, ToggleButtonEvent, boolean>;
export interface ToggleButtonAttributeOptions { readonly disabled?: boolean; readonly readOnly?: boolean; readonly native?: boolean }
export type ToggleButtonAttributes = CheckedControlAttributes & { readonly 'data-scope': 'toggle-button'; readonly 'data-part': 'root' };

export function createToggleButtonController(options: ToggleButtonControllerOptions = {}): Result<ToggleButtonController> {
  return createCheckedControlController<ToggleButtonState, ToggleButtonEvent, ToggleButtonCommand, boolean>({
    controlled: options.pressed !== undefined,
    initial: tryCreateToggleButtonState(options.pressed ?? options.defaultPressed ?? false),
    reducer: applyToggleButtonEvent,
    create: tryCreateToggleButtonState,
    read: (state) => state.pressed,
    onChange: options.onPressedChange,
    interaction: options,
  });
}

export function getToggleButtonAttributes(
  state: ToggleButtonState,
  options: ToggleButtonAttributeOptions = {},
): ToggleButtonAttributes {
  return Object.freeze({
    ...getCheckedControlAttributes({
      attribute: 'aria-pressed',
      value: state.pressed,
      format: String,
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      ...(options.native === undefined ? {} : { native: options.native }),
    }),
    'data-scope': 'toggle-button',
    'data-part': 'root',
  });
}
export function createToggleButton(options: ToggleButtonOptions): FacadeConnection<ToggleButtonConnection> {
  return unwrap(tryCreateToggleButton(options));
}

export function tryCreateToggleButton(options: ToggleButtonOptions): Result<FacadeConnection<ToggleButtonConnection>> {
  return createFacadeConnection(options, (options) => tryCreateToggleButtonConnection(options));
}

function tryCreateToggleButtonConnection(options: ToggleButtonOptions): Result<ToggleButtonConnection> { return createDOMCheckedControl<ToggleButtonState, ToggleButtonEvent, ToggleButtonCommand, boolean>({ element: options.element, attribute: 'aria-pressed', controlled: options.pressed !== undefined, initial: tryCreateToggleButtonState(options.pressed ?? options.defaultPressed ?? false), toggleEvent: 'toggle', reducer: applyToggleButtonEvent, create: tryCreateToggleButtonState, read: (state) => state.pressed, format: String, interaction: options, onChange: options.onPressedChange, onUpdate: options.onUpdate }); }

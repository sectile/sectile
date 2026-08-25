import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core'; import { applySwitchEvent, tryCreateSwitchState, type SwitchCommand, type SwitchEvent, type SwitchState } from '@sectile/core/switch';
import {
  createCheckedControlController,
  createDOMCheckedControl,
  getCheckedControlAttributes,
  type CheckedControlAttributes,
  type CheckedControlController,
  type DOMCheckedControl,
} from './internal/checked-control.js';
import { getCheckboxInputAttributes, type CheckboxInputAttributes, type CheckboxInputOptions } from './checkbox.js';
export interface SwitchOptions { readonly element: HTMLElement; readonly checked?: boolean; readonly defaultChecked?: boolean; readonly disabled?: boolean; readonly readOnly?: boolean; readonly onCheckedChange?: (checked: boolean) => void; readonly onUpdate?: () => void }

export type SwitchCheckedChangeHandler = NonNullable<SwitchOptions['onCheckedChange']>;
export type SwitchUpdateHandler = NonNullable<SwitchOptions['onUpdate']>;
export type SwitchConnection = DOMCheckedControl<SwitchState, SwitchEvent, boolean>;
export interface SwitchControllerOptions { readonly checked?: boolean; readonly defaultChecked?: boolean; readonly disabled?: boolean; readonly readOnly?: boolean; readonly onCheckedChange?: (checked: boolean) => void }

export type SwitchControllerCheckedChangeHandler = NonNullable<SwitchControllerOptions['onCheckedChange']>;
export type SwitchController = CheckedControlController<SwitchState, SwitchEvent, boolean>;
export interface SwitchAttributeOptions { readonly disabled?: boolean; readonly readOnly?: boolean; readonly required?: boolean; readonly native?: boolean }
export type SwitchAttributes = CheckedControlAttributes & { readonly 'aria-required': 'true' | undefined; readonly 'data-scope': 'switch'; readonly 'data-part': 'root' };
export type SwitchInputOptions = CheckboxInputOptions;
export type SwitchInputAttributes = CheckboxInputAttributes;

export function createSwitchController(options: SwitchControllerOptions = {}): Result<SwitchController> {
  return createCheckedControlController<SwitchState, SwitchEvent, SwitchCommand, boolean>({
    controlled: options.checked !== undefined,
    initial: tryCreateSwitchState(options.checked ?? options.defaultChecked ?? false),
    reducer: applySwitchEvent,
    create: tryCreateSwitchState,
    read: (state) => state.checked,
    onChange: options.onCheckedChange,
    interaction: options,
  });
}

export function getSwitchAttributes(
  state: SwitchState,
  options: SwitchAttributeOptions = {},
): SwitchAttributes {
  return Object.freeze({
    ...getCheckedControlAttributes({
      role: 'switch',
      attribute: 'aria-checked',
      value: state.checked,
      format: String,
      supportsReadOnly: true,
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      ...(options.native === undefined ? {} : { native: options.native }),
    }),
    'aria-required': options.required === true ? 'true' : undefined,
    'data-scope': 'switch',
    'data-part': 'root',
  });
}

export function getSwitchInputAttributes(
  state: SwitchState,
  options: SwitchInputOptions = {},
): SwitchInputAttributes {
  return getCheckboxInputAttributes({ checked: state.checked }, options);
}
export function createSwitch(options: SwitchOptions): FacadeConnection<SwitchConnection> {
  return unwrap(tryCreateSwitch(options));
}

export function tryCreateSwitch(options: SwitchOptions): Result<FacadeConnection<SwitchConnection>> {
  return createFacadeConnection(options, (options) => tryCreateSwitchConnection(options));
}

function tryCreateSwitchConnection(options: SwitchOptions): Result<SwitchConnection> { return createDOMCheckedControl<SwitchState, SwitchEvent, SwitchCommand, boolean>({ element: options.element, role: 'switch', attribute: 'aria-checked', controlled: options.checked !== undefined, initial: tryCreateSwitchState(options.checked ?? options.defaultChecked ?? false), toggleEvent: 'toggle', reducer: applySwitchEvent, create: tryCreateSwitchState, read: (state) => state.checked, format: String, interaction: options, supportsReadOnly: true, onChange: options.onCheckedChange, onUpdate: options.onUpdate }); }

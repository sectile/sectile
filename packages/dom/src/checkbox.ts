import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyCheckboxEvent, createCheckboxState, type CheckboxCommand, type CheckboxEvent, type CheckboxPolicies, type CheckboxState, type CheckboxValue } from '@sectile/core/checkbox';
import {
  createCheckedControlController,
  createDOMCheckedControl,
  getCheckedControlAttributes,
  type CheckedControlAttributes,
  type CheckedControlController,
  type DOMCheckedControl,
} from './internal/checked-control.js';
export type { CheckboxPolicies, CheckboxState, CheckboxValue } from '@sectile/core/checkbox';
export interface CheckboxOptions { readonly element: HTMLElement; readonly value?: CheckboxValue; readonly defaultValue?: CheckboxValue; readonly policies?: CheckboxPolicies; readonly disabled?: boolean; readonly readOnly?: boolean; readonly onValueChange?: (value: CheckboxValue) => void; readonly onUpdate?: () => void }
export type CheckboxConnection = DOMCheckedControl<CheckboxState, CheckboxEvent, CheckboxValue>;
export interface CheckboxControllerOptions { readonly value?: CheckboxValue; readonly defaultValue?: CheckboxValue; readonly policies?: CheckboxPolicies; readonly disabled?: boolean; readonly readOnly?: boolean; readonly onValueChange?: (value: CheckboxValue) => void }
export type CheckboxController = CheckedControlController<CheckboxState, CheckboxEvent, CheckboxValue>;
export interface CheckboxAttributeOptions { readonly disabled?: boolean; readonly readOnly?: boolean; readonly native?: boolean }
export type CheckboxAttributes = CheckedControlAttributes & { readonly 'data-scope': 'checkbox'; readonly 'data-part': 'root' };

export function createCheckboxController(options: CheckboxControllerOptions = {}): Result<CheckboxController> {
  return createCheckedControlController<CheckboxState, CheckboxEvent, CheckboxCommand, CheckboxValue>({
    controlled: options.value !== undefined,
    initial: createCheckboxState(options.value ?? options.defaultValue ?? false, options.policies),
    reducer: (state, event) => applyCheckboxEvent(state, event, options.policies),
    create: (value) => createCheckboxState(value, options.policies),
    read: (state) => state.checked,
    interaction: options,
    onChange: options.onValueChange,
  });
}

export function getCheckboxAttributes(
  state: CheckboxState,
  options: CheckboxAttributeOptions = {},
): CheckboxAttributes {
  return Object.freeze({
    ...getCheckedControlAttributes({
      role: 'checkbox',
      attribute: 'aria-checked',
      value: state.checked,
      format: String,
      supportsReadOnly: true,
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      ...(options.native === undefined ? {} : { native: options.native }),
    }),
    'data-scope': 'checkbox',
    'data-part': 'root',
  });
}
export function createCheckbox(options: CheckboxOptions): FacadeConnection<CheckboxConnection> {
  return unwrap(tryCreateCheckbox(options));
}

export function tryCreateCheckbox(options: CheckboxOptions): Result<FacadeConnection<CheckboxConnection>> {
  return createFacadeConnection(options, (options) => tryCreateCheckboxConnection(options));
}

function tryCreateCheckboxConnection(options: CheckboxOptions): Result<CheckboxConnection> { return createDOMCheckedControl<CheckboxState, CheckboxEvent, CheckboxCommand, CheckboxValue>({ element: options.element, role: 'checkbox', attribute: 'aria-checked', controlled: options.value !== undefined, initial: createCheckboxState(options.value ?? options.defaultValue ?? false, options.policies), toggleEvent: 'toggle', reducer: (state, event) => applyCheckboxEvent(state, event, options.policies), create: (value) => createCheckboxState(value, options.policies), read: (state) => state.checked, format: String, interaction: options, supportsReadOnly: true, onChange: options.onValueChange, onUpdate: options.onUpdate }); }

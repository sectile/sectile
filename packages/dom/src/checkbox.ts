import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyCheckboxEvent, tryCreateCheckboxState, type CheckboxCommand, type CheckboxEvent, type CheckboxPolicies, type CheckboxState, type CheckboxValue } from '@sectile/core/checkbox';
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

export type CheckboxValueChangeHandler = NonNullable<CheckboxOptions['onValueChange']>;
export type CheckboxUpdateHandler = NonNullable<CheckboxOptions['onUpdate']>;
export type CheckboxConnection = DOMCheckedControl<CheckboxState, CheckboxEvent, CheckboxValue>;
export interface CheckboxControllerOptions { readonly value?: CheckboxValue; readonly defaultValue?: CheckboxValue; readonly policies?: CheckboxPolicies; readonly disabled?: boolean; readonly readOnly?: boolean; readonly onValueChange?: (value: CheckboxValue) => void }

export type CheckboxControllerValueChangeHandler = NonNullable<CheckboxControllerOptions['onValueChange']>;
export type CheckboxController = CheckedControlController<CheckboxState, CheckboxEvent, CheckboxValue>;
export interface CheckboxAttributeOptions { readonly disabled?: boolean; readonly readOnly?: boolean; readonly required?: boolean; readonly native?: boolean }
export type CheckboxAttributes = CheckedControlAttributes & { readonly 'aria-required': 'true' | undefined; readonly 'data-scope': 'checkbox'; readonly 'data-part': 'root' };
export interface CheckboxInputOptions {
  readonly name?: string;
  readonly value?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
}
export interface CheckboxInputAttributes {
  readonly type: 'checkbox';
  readonly name: string | undefined;
  readonly value: string;
  readonly form: string | undefined;
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly required: boolean;
  readonly disabled: boolean;
  readonly tabIndex: -1;
  readonly 'aria-hidden': 'true';
}

export function createCheckboxController(options: CheckboxControllerOptions = {}): Result<CheckboxController> {
  return createCheckedControlController<CheckboxState, CheckboxEvent, CheckboxCommand, CheckboxValue>({
    controlled: options.value !== undefined,
    initial: tryCreateCheckboxState(options.value ?? options.defaultValue ?? false, options.policies),
    reducer: (state, event) => applyCheckboxEvent(state, event, options.policies),
    create: (value) => tryCreateCheckboxState(value, options.policies),
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
    'aria-required': options.required === true ? 'true' : undefined,
    'data-scope': 'checkbox',
    'data-part': 'root',
  });
}

export function getCheckboxInputAttributes(
  state: CheckboxState,
  options: CheckboxInputOptions = {},
): CheckboxInputAttributes {
  return Object.freeze({
    type: 'checkbox',
    name: options.name,
    value: options.value ?? 'on',
    form: options.form,
    checked: state.checked === true,
    indeterminate: state.checked === 'mixed',
    required: options.required ?? false,
    disabled: options.disabled ?? false,
    tabIndex: -1,
    'aria-hidden': 'true',
  });
}
export function createCheckbox(options: CheckboxOptions): FacadeConnection<CheckboxConnection> {
  return unwrap(tryCreateCheckbox(options));
}

export function tryCreateCheckbox(options: CheckboxOptions): Result<FacadeConnection<CheckboxConnection>> {
  return createFacadeConnection(options, (options) => tryCreateCheckboxConnection(options));
}

function tryCreateCheckboxConnection(options: CheckboxOptions): Result<CheckboxConnection> { return createDOMCheckedControl<CheckboxState, CheckboxEvent, CheckboxCommand, CheckboxValue>({ element: options.element, role: 'checkbox', attribute: 'aria-checked', controlled: options.value !== undefined, initial: tryCreateCheckboxState(options.value ?? options.defaultValue ?? false, options.policies), toggleEvent: 'toggle', reducer: (state, event) => applyCheckboxEvent(state, event, options.policies), create: (value) => tryCreateCheckboxState(value, options.policies), read: (state) => state.checked, format: String, interaction: options, supportsReadOnly: true, applyValue: applyNativeCheckboxValue, onChange: options.onValueChange, onUpdate: options.onUpdate }); }

function applyNativeCheckboxValue(element: HTMLElement, value: CheckboxValue): void {
  if (!('checked' in element) || !('indeterminate' in element)) return;
  const input = element as HTMLInputElement;
  if (input.type !== 'checkbox') return;
  input.checked = value === true;
  input.indeterminate = value === 'mixed';
}

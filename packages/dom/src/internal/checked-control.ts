import type { Result } from '@sectile/core';
import type { InteractionStateInput } from '@sectile/core/interaction';
import type { MachineUpdate, RevisionSnapshot } from '@sectile/core/revision';
import {
  createControlledComponentController,
  type ControlledComponentController,
} from '@sectile/core/adapter-runtime';

export interface DOMCheckedControl<State, Event, Value> {
  getSnapshot(): RevisionSnapshot<State>;
  syncControlledValue(value: Value): Result<RevisionSnapshot<State>>;
  handleEvent(event: Event): boolean;
  updateAttributes(): void;
  disconnect(): void;
}
export interface CheckedControlController<State, Event, Value> {
  getSnapshot(): RevisionSnapshot<State>;
  syncControlledValue(value: Value): Result<RevisionSnapshot<State>>;
  handleEvent(event: Event): boolean;
}
export interface CheckedControlControllerOptions<State, Event, Command extends object, Value> {
  readonly controlled: boolean;
  readonly initial: Result<State>;
  readonly reducer: (state: State, event: Event) => Result<MachineUpdate<State, Command>>;
  readonly create: (value: Value) => Result<State>;
  readonly read: (state: State) => Value;
  readonly onChange: ((value: Value) => void) | undefined;
  readonly interaction?: InteractionStateInput;
}
export interface DOMCheckedControlOptions<State, Event, Command extends object, Value> {
  readonly element: HTMLElement; readonly role?: string; readonly attribute: 'aria-checked' | 'aria-pressed';
  readonly controlled: boolean; readonly initial: Result<State>; readonly toggleEvent: Event;
  readonly reducer: (state: State, event: Event) => Result<MachineUpdate<State, Command>>;
  readonly create: (value: Value) => Result<State>; readonly read: (state: State) => Value;
  readonly format: (value: Value) => string; readonly onChange: ((value: Value) => void) | undefined; readonly onUpdate: (() => void) | undefined;
  readonly interaction?: InteractionStateInput;
  readonly supportsReadOnly?: boolean;
  readonly applyValue?: (element: HTMLElement, value: Value) => void;
}
export interface CheckedControlAttributes {
  readonly role: string | undefined;
  readonly 'aria-checked'?: string;
  readonly 'aria-pressed'?: string;
  readonly 'aria-disabled': string | undefined;
  readonly 'aria-readonly': string | undefined;
  readonly 'data-state': string;
  readonly 'data-disabled': string | undefined;
  readonly 'data-readonly': string | undefined;
  readonly disabled: boolean | undefined;
  readonly readOnly: boolean | undefined;
}

export function createCheckedControlController<State, Event, Command extends object, Value>(
  options: CheckedControlControllerOptions<State, Event, Command, Value>,
): Result<CheckedControlController<State, Event, Value>> {
  const runtime = createControlledComponentController<State, Event, Command, Value>({
    controlled: options.controlled,
    initial: options.initial,
    reducer: options.reducer,
    create: (value) => options.create(value),
    read: options.read,
    onChange: (value) => options.onChange?.(value),
    ...(options.interaction === undefined ? {} : { interaction: options.interaction }),
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: checkedControlAdapter(runtime.value) };
}

export function getCheckedControlAttributes<Value>(options: {
  readonly role?: string;
  readonly attribute: 'aria-checked' | 'aria-pressed';
  readonly value: Value;
  readonly format: (value: Value) => string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly supportsReadOnly?: boolean;
  readonly native?: boolean;
  readonly nativeReadOnly?: boolean;
}): CheckedControlAttributes {
  const disabled = options.disabled ?? false;
  const readOnly = options.readOnly ?? false;
  const exposesARIAReadOnly = options.supportsReadOnly === true && readOnly;
  const formatted = options.format(options.value);
  return Object.freeze({
    role: options.role,
    ...(options.attribute === 'aria-checked'
      ? { 'aria-checked': formatted }
      : { 'aria-pressed': formatted }),
    'aria-disabled': disabled ? 'true' : undefined,
    'aria-readonly': exposesARIAReadOnly ? 'true' : undefined,
    'data-state': checkedDataState(formatted),
    'data-disabled': disabled ? '' : undefined,
    'data-readonly': readOnly ? '' : undefined,
    disabled: options.native === true ? disabled : undefined,
    readOnly: options.nativeReadOnly === true && options.supportsReadOnly === true
      ? readOnly
      : undefined,
  });
}

export function createDOMCheckedControl<State, Event, Command extends object, Value>(options: DOMCheckedControlOptions<State, Event, Command, Value>): Result<DOMCheckedControl<State, Event, Value>> {
  const controller = createCheckedControlController<State, Event, Command, Value>({
    controlled: options.controlled,
    initial: options.initial,
    reducer: options.reducer,
    create: options.create,
    read: options.read,
    onChange: options.onChange,
    ...(options.interaction === undefined ? {} : { interaction: options.interaction }),
  });
  if (!controller.ok) return controller;
  return { ok: true, value: new DOMCheckedControlImpl(options, controller.value) };
}
class DOMCheckedControlImpl<State, Event, Command extends object, Value> implements DOMCheckedControl<State, Event, Value> {
  readonly #options: DOMCheckedControlOptions<State, Event, Command, Value>;
  readonly #controller: CheckedControlController<State, Event, Value>; readonly #click: () => void;
  public constructor(options: DOMCheckedControlOptions<State, Event, Command, Value>, controller: CheckedControlController<State, Event, Value>) {
    this.#options = options; this.#controller = controller; this.#click = (): void => { this.handleEvent(options.toggleEvent); };
    options.element.addEventListener('click', this.#click); this.updateAttributes();
  }
  public getSnapshot(): RevisionSnapshot<State> { return this.#controller.getSnapshot(); }
  public syncControlledValue(value: Value): Result<RevisionSnapshot<State>> {
    const result = this.#controller.syncControlledValue(value); if (result.ok) { this.updateAttributes(); this.#options.onUpdate?.(); } return result;
  }
  public handleEvent(event: Event): boolean { const accepted = this.#controller.handleEvent(event); this.updateAttributes(); if (accepted) this.#options.onUpdate?.(); return accepted; }
  public updateAttributes(): void {
    const value = this.#options.read(this.#controller.getSnapshot().state);
    applyCheckedControlAttributes(this.#options.element, getCheckedControlAttributes({
      attribute: this.#options.attribute,
      value,
      format: this.#options.format,
      native: true,
      nativeReadOnly: true,
      ...(this.#options.role === undefined ? {} : { role: this.#options.role }),
      ...(this.#options.interaction?.disabled === undefined ? {} : { disabled: this.#options.interaction.disabled }),
      ...(this.#options.interaction?.readOnly === undefined ? {} : { readOnly: this.#options.interaction.readOnly }),
      ...(this.#options.supportsReadOnly === undefined ? {} : { supportsReadOnly: this.#options.supportsReadOnly }),
    }));
    this.#options.applyValue?.(this.#options.element, value);
  }
  public disconnect(): void { this.#options.element.removeEventListener('click', this.#click); }
}

function checkedControlAdapter<State, Event, Command, Value>(
  controller: ControlledComponentController<State, Event, Command, Value>,
): CheckedControlController<State, Event, Value> {
  return Object.freeze({
    getSnapshot: () => controller.getSnapshot(),
    syncControlledValue: (value: Value) => controller.syncControlledValue(value),
    handleEvent: (event: Event) => controller.handle(event).ok,
  });
}

function applyCheckedControlAttributes(element: HTMLElement, attributes: CheckedControlAttributes): void {
  setOptionalAttribute(element, 'role', attributes.role);
  setOptionalAttribute(element, 'aria-checked', attributes['aria-checked']);
  setOptionalAttribute(element, 'aria-pressed', attributes['aria-pressed']);
  setOptionalAttribute(element, 'aria-disabled', attributes['aria-disabled']);
  setOptionalAttribute(element, 'aria-readonly', attributes['aria-readonly']);
  setOptionalAttribute(element, 'data-state', attributes['data-state']);
  setOptionalAttribute(element, 'data-disabled', attributes['data-disabled']);
  setOptionalAttribute(element, 'data-readonly', attributes['data-readonly']);
  if (attributes.disabled !== undefined && 'disabled' in element) {
    (element as HTMLButtonElement).disabled = attributes.disabled;
  }
  if (attributes.readOnly !== undefined && 'readOnly' in element) {
    (element as HTMLInputElement).readOnly = attributes.readOnly;
  }
}

function setOptionalAttribute(element: HTMLElement, name: string, value: string | undefined): void {
  if (value === undefined) (element as Partial<HTMLElement>).removeAttribute?.(name);
  else element.setAttribute(name, value);
}

function checkedDataState(value: string): string {
  if (value === 'mixed') return 'indeterminate';
  return value === 'true' ? 'checked' : 'unchecked';
}

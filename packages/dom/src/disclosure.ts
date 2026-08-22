import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applyDisclosureEvent, createDisclosureState,
  type DisclosureCommand, type DisclosureEvent, type DisclosureState,
} from '@sectile/core/disclosure';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { setInteractionAttributes } from './internal/interaction.js';

export interface DisclosureOptions {
  readonly trigger: HTMLElement;
  readonly panel?: HTMLElement;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly panelID?: string;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
}
export interface DisclosureControllerOptions {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}
export interface DisclosureController {
  getSnapshot(): RevisionSnapshot<DisclosureState>;
  syncControlledValue(open: boolean): Result<RevisionSnapshot<DisclosureState>>;
  handleEvent(event: DisclosureEvent): boolean;
}
export interface DisclosureTriggerOptions {
  readonly panelID?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly native?: boolean;
}
export interface DisclosureTriggerAttributes {
  readonly 'aria-expanded': 'true' | 'false';
  readonly 'aria-controls': string | undefined;
  readonly 'aria-disabled': 'true' | undefined;
  readonly 'data-state': 'open' | 'closed';
  readonly 'data-disabled': '' | undefined;
  readonly 'data-readonly': '' | undefined;
  readonly disabled: boolean | undefined;
  readonly 'data-scope': 'disclosure';
  readonly 'data-part': 'trigger';
}
export interface DisclosureContentOptions { readonly id?: string }
export interface DisclosureContentAttributes {
  readonly id: string | undefined;
  readonly hidden: boolean;
  readonly 'data-state': 'open' | 'closed';
  readonly 'data-scope': 'disclosure';
  readonly 'data-part': 'content';
}
export interface DisclosureConnection {
  getSnapshot(): RevisionSnapshot<DisclosureState>;
  syncControlledValue(open: boolean): Result<RevisionSnapshot<DisclosureState>>;
  handleEvent(event: DisclosureEvent): boolean;
  updateAttributes(): void;
  disconnect(): void;
}

export function createDisclosureController(
  options: DisclosureControllerOptions = {},
): Result<DisclosureController> {
  const controlled = options.open !== undefined;
  const runtime = createSemanticController<DisclosureState, DisclosureEvent, DisclosureCommand, DisclosureCommand>({
    initial: createDisclosureState(options.open ?? options.defaultOpen ?? false),
    reducer: applyDisclosureEvent,
    reconcile: (previous, proposed) => createDisclosureState(controlled ? previous.open : proposed.open),
    notify: (previous, proposed) => {
      if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open);
    },
    toEffect: (command) => command,
    interaction: options,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DisclosureControllerImpl(runtime.value, controlled) };
}

export function getDisclosureTriggerAttributes(
  state: DisclosureState,
  options: DisclosureTriggerOptions = {},
): DisclosureTriggerAttributes {
  const disabled = options.disabled ?? false;
  const readOnly = options.readOnly ?? false;
  return Object.freeze({
    'aria-expanded': String(state.open) as 'true' | 'false',
    'aria-controls': options.panelID,
    'aria-disabled': disabled ? 'true' : undefined,
    'data-state': state.open ? 'open' : 'closed',
    'data-disabled': disabled ? '' : undefined,
    'data-readonly': readOnly ? '' : undefined,
    disabled: options.native === true ? disabled : undefined,
    'data-scope': 'disclosure',
    'data-part': 'trigger',
  });
}

export function getDisclosureContentAttributes(
  state: DisclosureState,
  options: DisclosureContentOptions = {},
): DisclosureContentAttributes {
  return Object.freeze({
    id: options.id,
    hidden: !state.open,
    'data-state': state.open ? 'open' : 'closed',
    'data-scope': 'disclosure',
    'data-part': 'content',
  });
}

export function createDisclosure(options: DisclosureOptions): FacadeConnection<DisclosureConnection> {
  return unwrap(tryCreateDisclosure(options));
}

export function tryCreateDisclosure(options: DisclosureOptions): Result<FacadeConnection<DisclosureConnection>> {
  return createFacadeConnection(options, (options) => tryCreateDisclosureConnection(options));
}

function tryCreateDisclosureConnection(options: DisclosureOptions): Result<DisclosureConnection> {
  const controller = createDisclosureController({
    ...(options.open === undefined ? {} : { open: options.open }),
    ...(options.defaultOpen === undefined ? {} : { defaultOpen: options.defaultOpen }),
    ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
    ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
    ...(options.onOpenChange === undefined ? {} : { onOpenChange: options.onOpenChange }),
  });
  if (!controller.ok) return controller;
  return { ok: true, value: new DOMDisclosureConnection(options, controller.value) };
}

class DOMDisclosureConnection implements DisclosureConnection {
  readonly #options: DisclosureOptions;
  readonly #controller: DisclosureController;
  readonly #click: () => void;

  public constructor(
    options: DisclosureOptions,
    controller: DisclosureController,
  ) {
    this.#options = options;
    this.#controller = controller;
    this.#click = (): void => { this.handleEvent('toggle'); };
    options.trigger.addEventListener('click', this.#click);
    setInteractionAttributes(options.trigger, options, { native: true });
    this.updateAttributes();
  }
  public getSnapshot(): RevisionSnapshot<DisclosureState> { return this.#controller.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<DisclosureState>> {
    const result = this.#controller.syncControlledValue(open);
    if (result.ok) { this.updateAttributes(); this.#options.onUpdate?.(); }
    return result;
  }
  public handleEvent(event: DisclosureEvent): boolean {
    const accepted = this.#controller.handleEvent(event);
    this.updateAttributes();
    if (accepted) this.#options.onUpdate?.();
    return accepted;
  }
  public updateAttributes(): void {
    const state = this.#controller.getSnapshot().state;
    const trigger = getDisclosureTriggerAttributes(state, {
      ...(this.#options.panelID === undefined ? {} : { panelID: this.#options.panelID }),
      ...(this.#options.disabled === undefined ? {} : { disabled: this.#options.disabled }),
      ...(this.#options.readOnly === undefined ? {} : { readOnly: this.#options.readOnly }),
      native: true,
    });
    setOptionalAttribute(this.#options.trigger, 'aria-expanded', trigger['aria-expanded']);
    setOptionalAttribute(this.#options.trigger, 'aria-controls', trigger['aria-controls']);
    setOptionalAttribute(this.#options.trigger, 'aria-disabled', trigger['aria-disabled']);
    setOptionalAttribute(this.#options.trigger, 'data-state', trigger['data-state']);
    setOptionalAttribute(this.#options.trigger, 'data-disabled', trigger['data-disabled']);
    setOptionalAttribute(this.#options.trigger, 'data-readonly', trigger['data-readonly']);
    if (trigger.disabled !== undefined && 'disabled' in this.#options.trigger) {
      (this.#options.trigger as HTMLButtonElement).disabled = trigger.disabled;
    }
    if (this.#options.panel !== undefined) {
      const content = getDisclosureContentAttributes(state, {
        ...(this.#options.panelID === undefined ? {} : { id: this.#options.panelID }),
      });
      this.#options.panel.hidden = content.hidden;
      setOptionalAttribute(this.#options.panel, 'id', content.id);
      setOptionalAttribute(this.#options.panel, 'data-state', content['data-state']);
    }
  }
  public disconnect(): void { this.#options.trigger.removeEventListener('click', this.#click); }
}

class DisclosureControllerImpl implements DisclosureController {
  readonly #runtime: SemanticController<DisclosureState, DisclosureEvent, DisclosureCommand>;
  readonly #controlled: boolean;
  public constructor(runtime: SemanticController<DisclosureState, DisclosureEvent, DisclosureCommand>, controlled: boolean) {
    this.#runtime = runtime;
    this.#controlled = controlled;
  }
  public getSnapshot(): RevisionSnapshot<DisclosureState> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<DisclosureState>> {
    if (!this.#controlled) return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'An uncontrolled disclosure cannot be synchronized externally.' } };
    return this.#runtime.replace(createDisclosureState(open));
  }
  public handleEvent(event: DisclosureEvent): boolean { return this.#runtime.handle(event).ok; }
}

function setOptionalAttribute(element: HTMLElement, name: string, value: string | undefined): void {
  if (value === undefined) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

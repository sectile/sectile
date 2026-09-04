import { createFacadeConnection, createSemanticController, type FacadeConnection, type SemanticController } from '@sectile/core/adapter-runtime';
import { controlledFieldError as fieldError } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, SectileError, StableID } from '@sectile/core';
import {
  applyComboboxEvent,
  tryCreateComboboxState,
  type ComboboxCommand,
  type ComboboxEvent,
  type ComboboxPolicies,
  type ComboboxState,
} from '@sectile/core/combobox';
export type { ComboboxPolicies } from '@sectile/core/combobox';
import type { RevisionResult, RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import {
  sameTextEditingState,
  tryCreateTextEditingState,
  type TextEditingState,
} from '@sectile/core/text';
import { toTextEvent, type TextInput } from './text.js';
import type { TextElement } from './text.js';
import { DOMTextElementBinding } from './internal/text-element.js';
import { setInteractionAttributes } from './internal/interaction.js';
import { findDelegatedStableID } from './internal/delegated-event.js';
import { stableIDElementToken, stableIDToken } from './internal/stable-id-token.js';
import { createDOMLayerBinding, type DOMLayerBinding } from './internal/layer-binding.js';
import {
  createPosition,
  manualPositionConnection,
  type PositionConnection,
} from './internal/position-connection.js';
import type { PositionOptions } from './position.js';
import { createHiddenBinding, type HiddenBinding } from './internal/hidden-binding.js';

export interface KeyboardInput {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly isComposing?: boolean;
}

export type ComboboxEffect<ID extends StableID = StableID> =
  | { readonly type: 'set-active-descendant'; readonly id: ID }
  | { readonly type: 'dispatch-accept'; readonly id: ID };

export interface ComboboxValueChangeDetails<ID extends StableID = StableID> {
  readonly value: ID | null;
  readonly previousValue: ID | null;
}

export interface ComboboxInputStateChangeDetails {
  readonly value: TextEditingState;
  readonly previousValue: TextEditingState;
}

export interface ComboboxOpenChangeDetails {
  readonly value: boolean;
  readonly previousValue: boolean;
}

export interface ComboboxHighlightChangeDetails<ID extends StableID = StableID> {
  readonly value: ID | null;
  readonly previousValue: ID | null;
}

export interface ComboboxControllerOptions<ID extends StableID = StableID> {
  readonly domain: Sequence<ID>;
  readonly labels: ReadonlyMap<ID, string>;
  readonly policies?: ComboboxPolicies<ID>;
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly inputState?: TextEditingState;
  readonly defaultInputState?: TextEditingState;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onValueChange?: (change: ComboboxValueChangeDetails<ID>) => void;
  readonly onInputStateChange?: (change: ComboboxInputStateChangeDetails) => void;
  readonly onOpenChange?: (change: ComboboxOpenChangeDetails) => void;
  readonly onHighlightedValueChange?: (change: ComboboxHighlightChangeDetails<ID>) => void;
}

export type ComboboxControllerValueChangeHandler<ID extends StableID = StableID> = NonNullable<ComboboxControllerOptions<ID>['onValueChange']>;
export type ComboboxControllerInputStateChangeHandler<ID extends StableID = StableID> = NonNullable<ComboboxControllerOptions<ID>['onInputStateChange']>;
export type ComboboxControllerOpenChangeHandler<ID extends StableID = StableID> = NonNullable<ComboboxControllerOptions<ID>['onOpenChange']>;
export type ComboboxControllerHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<ComboboxControllerOptions<ID>['onHighlightedValueChange']>;

export interface ComboboxControlledValues<ID extends StableID = StableID> {
  readonly value?: ID | null;
  readonly inputState?: TextEditingState;
  readonly open?: boolean;
  readonly highlightedValue?: ID | null;
}

export interface ComboboxController<ID extends StableID = StableID> {
  readonly domain: Sequence<ID>;
  readonly labels: ReadonlyMap<ID, string>;
  getSnapshot(): RevisionSnapshot<ComboboxState<ID>>;
  syncControlledValues(
    values: ComboboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ComboboxState<ID>>>;
  handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision?: number,
  ): RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>>;
  handleTextInput(
    input: TextInput,
    expectedRevision?: number,
  ): RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>>;
  handleEvent(
    event: ComboboxEvent<ID>,
    expectedRevision?: number,
  ): RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>>;
}

export interface ComboboxItem<ID extends StableID = StableID> {
  readonly id: ID;
  readonly label: string;
}

export interface ComboboxTransitionDetails<ID extends StableID = StableID> {
  readonly event: ComboboxEvent<ID>;
  readonly result: RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>>;
}

export interface ComboboxConnectionOptions<ID extends StableID = StableID> extends PositionOptions {
  readonly controller: ComboboxController<ID>;
  readonly input: TextElement;
  readonly popup?: HTMLElement;
  readonly position?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly getItemElementID?: (id: ID) => string;
  readonly onAccept?: (id: ID) => void;
  readonly onTransition?: (details: ComboboxTransitionDetails<ID>) => void;
  readonly onUpdate?: () => void;
}

export type ComboboxConnectionItemElementIDResolver<ID extends StableID = StableID> = NonNullable<ComboboxConnectionOptions<ID>['getItemElementID']>;
export type ComboboxConnectionAcceptHandler<ID extends StableID = StableID> = NonNullable<ComboboxConnectionOptions<ID>['onAccept']>;
export type ComboboxConnectionTransitionHandler<ID extends StableID = StableID> = NonNullable<ComboboxConnectionOptions<ID>['onTransition']>;
export type ComboboxConnectionUpdateHandler<ID extends StableID = StableID> = NonNullable<ComboboxConnectionOptions<ID>['onUpdate']>;

export interface ComboboxItemAttributes<ID extends StableID = StableID> {
  readonly id: ID;
  readonly disabled?: boolean;
}

export interface ComboboxConnection<ID extends StableID = StableID> {
  readonly domain: Sequence<ID>;
  readonly labels: ReadonlyMap<ID, string>;
  getSnapshot(): RevisionSnapshot<ComboboxState<ID>>;
  syncControlledValues(
    values: ComboboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ComboboxState<ID>>>;
  setInputAttributes(label?: string): void;
  setPopupAttributes(label?: string): void;
  setItemAttributes(element: HTMLElement, attributes: ComboboxItemAttributes<ID>): void;
  handleEvent(event: ComboboxEvent<ID>): boolean;
  handleKeyboardEvent(event: KeyboardEvent): boolean;
  handleBeforeInput(event: InputEvent): boolean;
  render(): void;
  disconnect(): void;
}

export type ComboboxOptions<ID extends StableID = StableID> =
  Omit<ComboboxControllerOptions<ID>, 'domain' | 'labels'>
  & Omit<ComboboxConnectionOptions<ID>, 'controller'>
  & { readonly items: readonly ComboboxItem<ID>[] };

export function createComboboxController<ID extends StableID>(
  options: ComboboxControllerOptions<ID>,
): Result<ComboboxController<ID>> {
  const value = options.value !== undefined ? options.value : options.defaultValue ?? null;
  const requestedInput = options.inputState !== undefined
    ? options.inputState
    : options.defaultInputState;
  const inputState = requestedInput === undefined
    ? tryCreateTextEditingState()
    : { ok: true as const, value: requestedInput };
  if (!inputState.ok) return inputState;
  const initial = tryCreateComboboxState(options.domain, {
    text: inputState.value,
    popupOpen: options.open !== undefined ? options.open : options.defaultOpen ?? false,
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? null,
    selected: value === null ? [] : [value],
    anchor: value,
  });
  if (!initial.ok) return initial;
  let controller: DOMComboboxController<ID>;
  const runtime = createSemanticController<ComboboxState<ID>, ComboboxEvent<ID>, ComboboxCommand<ID>, ComboboxEffect<ID>>({
    initial,
    reducer: (state, event) => controller.reduce(state, event),
    reconcile: (previous, proposed) => controller.reconcile(previous, proposed),
    notify: (previous, proposed) => controller.notify(previous, proposed),
    toEffect: toComboboxEffect,
    interaction: options,
    interactionIntent: comboboxIntent,
  });
  if (!runtime.ok) return runtime;
  controller = new DOMComboboxController(options, runtime.value);
  return { ok: true, value: controller };
}

export function createCombobox<ID extends StableID>(
  options: ComboboxOptions<ID>,
): FacadeConnection<ComboboxConnection<ID>> {
  return unwrap(tryCreateCombobox(options));
}

export function tryCreateCombobox<ID extends StableID>(
  options: ComboboxOptions<ID>,
): Result<FacadeConnection<ComboboxConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateComboboxConnection(options));
}

function tryCreateComboboxConnection<ID extends StableID>(
  options: ComboboxOptions<ID>,
): Result<ComboboxConnection<ID>> {
  const domain = tryCreateSequence(options.items.map((item) => item.id));
  if (!domain.ok) return domain;
  const labels = new Map(options.items.map((item) => [item.id, item.label] as const));
  const controller = createComboboxController({ ...options, domain: domain.value, labels });
  if (!controller.ok) return controller;
  return { ok: true, value: connectCombobox({ ...options, controller: controller.value }) };
}

export function connectCombobox<ID extends StableID>(
  options: ComboboxConnectionOptions<ID>,
): ComboboxConnection<ID> {
  return new DOMComboboxConnection(options);
}

export function toComboboxEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
): ComboboxEvent<ID> | null {
  if (input.isComposing === true) return null;
  if (input.altKey === true || input.ctrlKey === true || input.metaKey === true) return null;
  if (input.key === 'ArrowDown') return 'next';
  if (input.key === 'ArrowUp') return 'previous';
  if (input.key === 'Escape') return 'close';
  if (input.key === 'Enter') return 'accept';
  return null;
}

export function toComboboxTextEvent<ID extends StableID = StableID>(
  input: TextInput,
): ComboboxEvent<ID> | null {
  const event = toTextEvent(input);
  return event === null ? null : Object.freeze({ type: 'text', event });
}

export function toComboboxEffect<ID extends StableID>(
  command: ComboboxCommand<ID>,
): ComboboxEffect<ID> {
  return Object.freeze(command.type === 'focus'
    ? { type: 'set-active-descendant', id: command.id }
    : { type: 'dispatch-accept', id: command.id });
}

class DOMComboboxConnection<ID extends StableID> implements ComboboxConnection<ID> {
  public readonly domain: Sequence<ID>;
  public readonly labels: ReadonlyMap<ID, string>;
  readonly #controller: ComboboxController<ID>;
  readonly #input: TextElement;
  readonly #popup: HTMLElement | undefined;
  readonly #visibility: HiddenBinding | undefined;
  readonly #getItemElementID: (id: ID) => string;
  readonly #onAccept: ((id: ID) => void) | undefined;
  readonly #onTransition: ((details: ComboboxTransitionDetails<ID>) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;
  readonly #binding: DOMTextElementBinding;
  readonly #layer: DOMLayerBinding | undefined;
  readonly #position: PositionConnection;
  readonly #handleKeydown: (event: Event) => void;
  readonly #handleClick: (event: MouseEvent) => void;

  public constructor(options: ComboboxConnectionOptions<ID>) {
    this.#controller = options.controller;
    this.domain = options.controller.domain;
    this.labels = options.controller.labels;
    this.#input = options.input;
    this.#popup = options.popup;
    this.#visibility = this.#popup === undefined ? undefined : createHiddenBinding(this.#popup);
    this.#getItemElementID = options.getItemElementID
      ?? ((id): string => `sectile-combobox-${stableIDElementToken(id)}`);
    this.#onAccept = options.onAccept;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    this.#binding = new DOMTextElementBinding({
      element: this.#input,
      getState: () => this.#controller.getSnapshot().state.text,
      dispatch: (input) => this.#dispatchTextInput(input).ok,
    });
    this.#layer = this.#popup === undefined ? undefined : createDOMLayerBinding({
      surface: this.#popup,
      owner: this.#input,
      dismissOnInteractOutside: true,
      readOpen: () => this.#controller.getSnapshot().state.popupOpen,
      close: () => { this.handleEvent('close'); },
    });
    this.#position = this.#popup === undefined || options.position === false
      ? manualPositionConnection
      : createPosition({
          root: this.#popup,
          reference: this.#input,
          side: options.side,
          align: options.align,
          sideOffset: options.sideOffset,
          collisionPadding: options.collisionPadding,
          collisionBoundary: options.collisionBoundary,
          avoidCollisions: options.avoidCollisions,
          arrowPadding: options.arrowPadding,
          hideWhenDetached: options.hideWhenDetached,
          strategy: options.strategy,
          tracking: options.tracking,
        });
    this.#handleKeydown = (event): void => {
      if (this.handleKeyboardEvent(event as KeyboardEvent)) event.preventDefault();
    };
    this.#handleClick = (event): void => {
      if (this.#popup === undefined) return;
      const id = findDelegatedStableID(event.target, this.#popup, 'comboboxId');
      if (id !== null) this.handleEvent({ type: 'accept', id: id as ID });
    };
    this.#input.addEventListener('keydown', this.#handleKeydown);
    this.#popup?.addEventListener('click', this.#handleClick);
    setInteractionAttributes(this.#input, options, { native: true, readOnly: true });
    this.render();
  }

  public getSnapshot(): RevisionSnapshot<ComboboxState<ID>> {
    return this.#controller.getSnapshot();
  }

  public syncControlledValues(
    values: ComboboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ComboboxState<ID>>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) {
      this.render();
      this.#onUpdate?.();
    }
    return result;
  }

  public setInputAttributes(label?: string): void {
    const state = this.#controller.getSnapshot().state;
    this.#input.setAttribute('role', 'combobox');
    this.#input.setAttribute('aria-autocomplete', 'list');
    this.#input.setAttribute('aria-expanded', String(state.popupOpen));
    if (this.#popup?.id) this.#input.setAttribute('aria-controls', this.#popup.id);
    else this.#input.removeAttribute('aria-controls');
    if (state.cursor.current === null) this.#input.removeAttribute('aria-activedescendant');
    else {
      this.#input.setAttribute(
        'aria-activedescendant',
        this.#getItemElementID(state.cursor.current),
      );
    }
    if (label === undefined) this.#input.removeAttribute('aria-label');
    else this.#input.setAttribute('aria-label', label);
  }

  public setPopupAttributes(label?: string): void {
    if (this.#popup === undefined) return;
    this.#popup.setAttribute('role', 'listbox');
    this.#visibility?.setHidden(!this.#controller.getSnapshot().state.popupOpen);
    if (label === undefined) this.#popup.removeAttribute('aria-label');
    else this.#popup.setAttribute('aria-label', label);
  }

  public setItemAttributes(
    element: HTMLElement,
    attributes: ComboboxItemAttributes<ID>,
  ): void {
    const state = this.#controller.getSnapshot().state;
    element.id = this.#getItemElementID(attributes.id);
    element.dataset['comboboxId'] = stableIDToken(attributes.id);
    element.setAttribute('role', 'option');
    element.setAttribute('aria-selected', String(state.selection.has(attributes.id)));
    if (attributes.disabled === true) element.setAttribute('aria-disabled', 'true');
    else element.removeAttribute('aria-disabled');
  }

  public handleKeyboardEvent(event: KeyboardEvent): boolean {
    const input: KeyboardInput = {
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      isComposing: event.isComposing || this.#binding.isComposing,
    };
    const semanticEvent = toComboboxEvent<ID>(input);
    if (semanticEvent === null) return false;
    return this.handleEvent(semanticEvent);
  }

  public handleEvent(event: ComboboxEvent<ID>): boolean {
    const result = this.#controller.handleEvent(event);
    if (result.ok) this.#applyEffects(result.commands);
    this.#onTransition?.(Object.freeze({ event, result }));
    this.render();
    if (result.ok) this.#onUpdate?.();
    return result.ok;
  }

  public handleBeforeInput(event: InputEvent): boolean {
    return this.#binding.handleBeforeInput(event);
  }

  public render(): void {
    this.#binding.render();
    this.#renderPopupState();
  }

  #renderPopupState(): void {
    this.setInputAttributes(this.#input.getAttribute('aria-label') ?? undefined);
    this.setPopupAttributes(this.#popup?.getAttribute('aria-label') ?? undefined);
    this.#layer?.sync();
    this.#position.update();
  }

  public disconnect(): void {
    this.#layer?.disconnect();
    this.#position.disconnect();
    this.#visibility?.disconnect();
    this.#binding.disconnect();
    this.#input.removeEventListener('keydown', this.#handleKeydown);
    this.#popup?.removeEventListener('click', this.#handleClick);
  }

  #dispatchTextInput(
    input: TextInput,
  ): RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>> {
    const event = toComboboxTextEvent<ID>(input);
    const result = event === null
      ? this.#controller.handleTextInput(input)
      : this.#controller.handleEvent(event);
    if (result.ok) this.#applyEffects(result.commands);
    if (event !== null) this.#onTransition?.(Object.freeze({ event, result }));
    this.#renderPopupState();
    if (result.ok) this.#onUpdate?.();
    return result;
  }

  #applyEffects(effects: readonly ComboboxEffect<ID>[]): void {
    for (const effect of effects) {
      if (effect.type === 'dispatch-accept') this.#onAccept?.(effect.id);
    }
  }
}

class DOMComboboxController<ID extends StableID> implements ComboboxController<ID> {
  public readonly domain: Sequence<ID>;
  public readonly labels: ReadonlyMap<ID, string>;
  readonly #domain: Sequence<ID>;
  readonly #labels: ReadonlyMap<ID, string>;
  readonly #policies: ComboboxPolicies<ID>;
  readonly #valueControlled: boolean;
  readonly #inputStateControlled: boolean;
  readonly #openControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #options: ComboboxControllerOptions<ID>;
  readonly #runtime: SemanticController<ComboboxState<ID>, ComboboxEvent<ID>, ComboboxEffect<ID>>;
  #pendingInputState: TextEditingState | null = null;
  #handlingTextEvent = false;

  public constructor(
    options: ComboboxControllerOptions<ID>,
    runtime: SemanticController<ComboboxState<ID>, ComboboxEvent<ID>, ComboboxEffect<ID>>,
  ) {
    this.domain = options.domain;
    this.labels = options.labels;
    this.#domain = options.domain;
    this.#labels = options.labels;
    this.#policies = options.policies ?? {};
    this.#valueControlled = options.value !== undefined;
    this.#inputStateControlled = options.inputState !== undefined;
    this.#openControlled = options.open !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#options = options;
    this.#runtime = runtime;
  }

  public getSnapshot(): RevisionSnapshot<ComboboxState<ID>> {
    return this.#runtime.getSnapshot();
  }

  public syncControlledValues(
    values: ComboboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ComboboxState<ID>>> {
    const error = controlledInputError(
      this.#valueControlled,
      this.#inputStateControlled,
      this.#openControlled,
      this.#highlightControlled,
      values,
    );
    if (error !== null) return { ok: false, error };
    const selected = this.#valueControlled
      ? (values.value as ID | null)
      : selectedValue(this.#runtime.getSnapshot().state);
    const state = tryCreateComboboxState(this.#domain, {
      text: this.#inputStateControlled
        ? values.inputState as TextEditingState
        : this.#runtime.getSnapshot().state.text,
      popupOpen: this.#openControlled
        ? values.open as boolean
        : this.#runtime.getSnapshot().state.popupOpen,
      current: this.#highlightControlled
        ? values.highlightedValue as ID | null
        : this.#runtime.getSnapshot().state.cursor.current,
      selected: selected === null ? [] : [selected],
      anchor: this.#valueControlled ? selected : this.#runtime.getSnapshot().state.selection.anchor,
    });
    const snapshot = this.#runtime.replace(state);
    if (!snapshot.ok) return snapshot;
    if (this.#inputStateControlled) {
      const inputState = values.inputState as TextEditingState;
      this.#pendingInputState = inputState.composition === null ? null : inputState;
    }
    return snapshot;
  }

  public handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision = this.#runtime.getSnapshot().revision,
  ): RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>> {
    const event = toComboboxEvent<ID>(input);
    return event === null
      ? this.#runtime.reject('unsupported-dom-key', 'DOM keyboard input does not map to a combobox semantic event.', { key: input.key })
      : this.handleEvent(event, expectedRevision);
  }

  public handleTextInput(
    input: TextInput,
    expectedRevision = this.#runtime.getSnapshot().revision,
  ): RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>> {
    const event = toComboboxTextEvent<ID>(input);
    return event === null
      ? this.#runtime.reject('unsupported-dom-text-input', 'DOM text input does not map to a combobox semantic event.')
      : this.handleEvent(event, expectedRevision);
  }

  public handleEvent(
    event: ComboboxEvent<ID>,
    expectedRevision = this.#runtime.getSnapshot().revision,
  ): RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>> {
    return this.#runtime.handle(event, expectedRevision);
  }

  public reduce(state: ComboboxState<ID>, event: ComboboxEvent<ID>) {
    this.#handlingTextEvent = typeof event === 'object' && event.type === 'text';
    const base = this.#inputStateControlled && this.#handlingTextEvent && this.#pendingInputState !== null
      ? unwrap(tryCreateComboboxState(this.#domain, {
          text: this.#pendingInputState,
          popupOpen: state.popupOpen,
          current: state.cursor.current,
          selected: state.selection.selected,
          anchor: state.selection.anchor,
        }))
      : state;
    return applyComboboxEvent(this.#domain, this.#labels, base, event, this.#policies);
  }

  public reconcile(previous: ComboboxState<ID>, proposed: ComboboxState<ID>): Result<ComboboxState<ID>> {
    if (this.#inputStateControlled && this.#handlingTextEvent) {
      this.#pendingInputState = proposed.text.composition === null ? null : proposed.text;
    }
    return controlledState(
      this.#domain,
      previous,
      proposed,
      this.#valueControlled,
      this.#inputStateControlled,
      this.#openControlled,
      this.#highlightControlled,
    );
  }

  public notify(previous: ComboboxState<ID>, proposed: ComboboxState<ID>): void {
    const previousValue = selectedValue(previous);
    const value = selectedValue(proposed);
    if (previousValue !== value) this.#options.onValueChange?.(Object.freeze({ value, previousValue }));
    if (!sameTextEditingState(previous.text, proposed.text)) {
      this.#options.onInputStateChange?.(Object.freeze({
        value: proposed.text,
        previousValue: previous.text,
      }));
    }
    if (previous.popupOpen !== proposed.popupOpen) {
      this.#options.onOpenChange?.(Object.freeze({
        value: proposed.popupOpen,
        previousValue: previous.popupOpen,
      }));
    }
    if (previous.cursor.current !== proposed.cursor.current) {
      this.#options.onHighlightedValueChange?.(Object.freeze({
        value: proposed.cursor.current,
        previousValue: previous.cursor.current,
      }));
    }
  }
}

function comboboxIntent<ID extends StableID>(event: ComboboxEvent<ID>): 'navigate' | 'mutate' {
  return event === 'next' || event === 'previous' || event === 'close' ? 'navigate' : 'mutate';
}

function controlledState<ID extends StableID>(
  domain: Sequence<ID>,
  previous: ComboboxState<ID>,
  proposed: ComboboxState<ID>,
  valueControlled: boolean,
  inputStateControlled: boolean,
  openControlled: boolean,
  highlightControlled: boolean,
): Result<ComboboxState<ID>> {
  return tryCreateComboboxState(domain, {
    text: inputStateControlled ? previous.text : proposed.text,
    popupOpen: openControlled ? previous.popupOpen : proposed.popupOpen,
    current: highlightControlled ? previous.cursor.current : proposed.cursor.current,
    selected: valueControlled ? previous.selection.selected : proposed.selection.selected,
    anchor: valueControlled ? previous.selection.anchor : proposed.selection.anchor,
  });
}

function selectedValue<ID extends StableID>(state: ComboboxState<ID>): ID | null {
  return state.selection.selected[0] ?? null;
}

function controlledInputError<ID extends StableID>(
  valueControlled: boolean,
  inputStateControlled: boolean,
  openControlled: boolean,
  highlightControlled: boolean,
  values: ComboboxControlledValues<ID>,
): SectileError | null {
  return fieldError(valueControlled, values.value !== undefined, 'value', 'combobox value')
    ?? fieldError(
      inputStateControlled,
      values.inputState !== undefined,
      'input-state',
      'combobox input state',
    )
    ?? fieldError(openControlled, values.open !== undefined, 'open', 'combobox open state')
    ?? fieldError(
      highlightControlled,
      values.highlightedValue !== undefined,
      'highlighted-value',
      'combobox highlight',
    );
}

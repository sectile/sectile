import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { controlledFieldError as fieldError } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, SectileError, StableID } from '@sectile/core';
import { tryCreateInteractionState, requireInteraction, type InteractionState } from '@sectile/core/interaction';
import {
  applyComboboxEvent,
  tryCreateComboboxState,
  type ComboboxCommand,
  type ComboboxEvent,
  type ComboboxPolicies,
  type ComboboxState,
} from '@sectile/core/combobox';
import {
  tryCreateRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import {
  sameTextEditingState,
  tryCreateTextEditingState,
  type TextEditingState,
} from '@sectile/core/text';
import {
  applyControllerEvent,
  synchronizeControllerState,
} from '@sectile/core/adapter-runtime';
import { toTextEvent, type TextInput } from './text.js';
import type { TerminalKeyboardInput } from './keyboard.js';
import { toTerminalTextInput } from './internal/text-input.js';

export type KeyboardInput = TerminalKeyboardInput;

export type ComboboxEffect<ID extends StableID = StableID> =
  | { readonly type: 'highlight-candidate'; readonly id: ID }
  | { readonly type: 'submit-candidate'; readonly id: ID };

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
}

export interface ComboboxItem<ID extends StableID = StableID> {
  readonly id: ID;
  readonly label: string;
}

export interface ComboboxTransitionDetails<ID extends StableID = StableID> {
  readonly event: ComboboxEvent<ID>;
  readonly result: RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>>;
}

export interface ComboboxConnectionOptions<ID extends StableID = StableID> {
  readonly controller: ComboboxController<ID>;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onAccept?: (id: ID) => void;
  readonly onTransition?: (details: ComboboxTransitionDetails<ID>) => void;
  readonly onUpdate?: () => void;
}

export type ComboboxConnectionAcceptHandler<ID extends StableID = StableID> = NonNullable<ComboboxConnectionOptions<ID>['onAccept']>;
export type ComboboxConnectionTransitionHandler<ID extends StableID = StableID> = NonNullable<ComboboxConnectionOptions<ID>['onTransition']>;
export type ComboboxConnectionUpdateHandler<ID extends StableID = StableID> = NonNullable<ComboboxConnectionOptions<ID>['onUpdate']>;

export interface ComboboxConnection<ID extends StableID = StableID> {
  readonly domain: Sequence<ID>;
  readonly labels: ReadonlyMap<ID, string>;
  getSnapshot(): RevisionSnapshot<ComboboxState<ID>>;
  getInputValue(): string;
  syncControlledValues(
    values: ComboboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ComboboxState<ID>>>;
  handleKeyboardInput(input: KeyboardInput): boolean;
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
  const snapshot = tryCreateRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  const interaction = tryCreateInteractionState(options);
  if (!interaction.ok) return interaction;
  return { ok: true, value: new TerminalComboboxController(options, interaction.value, snapshot.value) };
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
  return new TerminalComboboxConnection(options);
}

export function toComboboxEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
): ComboboxEvent<ID> | null {
  if (input.key === 'down') return 'next';
  if (input.key === 'up') return 'previous';
  if (input.key === 'escape') return 'close';
  if (input.key === 'enter') return 'accept';
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
    ? { type: 'highlight-candidate', id: command.id }
    : { type: 'submit-candidate', id: command.id });
}

class TerminalComboboxConnection<ID extends StableID> implements ComboboxConnection<ID> {
  public readonly domain: Sequence<ID>;
  public readonly labels: ReadonlyMap<ID, string>;
  readonly #controller: ComboboxController<ID>;
  readonly #onAccept: ((id: ID) => void) | undefined;
  readonly #onTransition: ((details: ComboboxTransitionDetails<ID>) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;

  public constructor(options: ComboboxConnectionOptions<ID>) {
    this.#controller = options.controller;
    this.domain = options.controller.domain;
    this.labels = options.controller.labels;
    this.#onAccept = options.onAccept;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
  }

  public getSnapshot(): RevisionSnapshot<ComboboxState<ID>> {
    return this.#controller.getSnapshot();
  }

  public getInputValue(): string {
    return this.#controller.getSnapshot().state.text.snapshot.text;
  }

  public syncControlledValues(
    values: ComboboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ComboboxState<ID>>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) this.#onUpdate?.();
    return result;
  }

  public handleKeyboardInput(input: KeyboardInput): boolean {
    const keyboardEvent = toComboboxEvent<ID>(input);
    if (keyboardEvent !== null) {
      const result = this.#controller.handleKeyboardInput(input);
      if (result.ok) this.#applyEffects(result.commands);
      this.#onTransition?.(Object.freeze({ event: keyboardEvent, result }));
      if (result.ok) this.#onUpdate?.();
      return result.ok;
    }
    const textInput = toTerminalTextInput(this.#controller.getSnapshot().state.text, input);
    if (textInput === null) return false;
    const event = toComboboxTextEvent<ID>(textInput);
    const result = this.#controller.handleTextInput(textInput);
    if (result.ok) this.#applyEffects(result.commands);
    if (event !== null) this.#onTransition?.(Object.freeze({ event, result }));
    if (result.ok) this.#onUpdate?.();
    return result.ok;
  }

  #applyEffects(effects: readonly ComboboxEffect<ID>[]): void {
    for (const effect of effects) {
      if (effect.type === 'submit-candidate') this.#onAccept?.(effect.id);
    }
  }
}

class TerminalComboboxController<ID extends StableID> implements ComboboxController<ID> {
  public readonly domain: Sequence<ID>;
  public readonly labels: ReadonlyMap<ID, string>;
  readonly #domain: Sequence<ID>;
  readonly #labels: ReadonlyMap<ID, string>;
  readonly #policies: ComboboxPolicies<ID>;
  readonly #interaction: InteractionState;
  readonly #valueControlled: boolean;
  readonly #inputStateControlled: boolean;
  readonly #openControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #onValueChange: ((change: ComboboxValueChangeDetails<ID>) => void) | undefined;
  readonly #onInputStateChange:
    | ((change: ComboboxInputStateChangeDetails) => void)
    | undefined;
  readonly #onOpenChange: ((change: ComboboxOpenChangeDetails) => void) | undefined;
  readonly #onHighlightedValueChange:
    | ((change: ComboboxHighlightChangeDetails<ID>) => void)
    | undefined;
  #snapshot: RevisionSnapshot<ComboboxState<ID>>;

  public constructor(
    options: ComboboxControllerOptions<ID>,
    interaction: InteractionState,
    snapshot: RevisionSnapshot<ComboboxState<ID>>,
  ) {
    this.domain = options.domain;
    this.labels = options.labels;
    this.#domain = options.domain;
    this.#labels = options.labels;
    this.#policies = options.policies ?? {};
    this.#interaction = interaction;
    this.#valueControlled = options.value !== undefined;
    this.#inputStateControlled = options.inputState !== undefined;
    this.#openControlled = options.open !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#onValueChange = options.onValueChange;
    this.#onInputStateChange = options.onInputStateChange;
    this.#onOpenChange = options.onOpenChange;
    this.#onHighlightedValueChange = options.onHighlightedValueChange;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): RevisionSnapshot<ComboboxState<ID>> {
    return this.#snapshot;
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
      : selectedValue(this.#snapshot.state);
    const state = tryCreateComboboxState(this.#domain, {
      text: this.#inputStateControlled
        ? values.inputState as TextEditingState
        : this.#snapshot.state.text,
      popupOpen: this.#openControlled
        ? values.open as boolean
        : this.#snapshot.state.popupOpen,
      current: this.#highlightControlled
        ? values.highlightedValue as ID | null
        : this.#snapshot.state.cursor.current,
      selected: selected === null ? [] : [selected],
      anchor: this.#valueControlled ? selected : this.#snapshot.state.selection.anchor,
    });
    const snapshot = synchronizeControllerState(this.#snapshot, state);
    if (!snapshot.ok) return snapshot;
    this.#snapshot = snapshot.value;
    return snapshot;
  }

  public handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>> {
    const event = toComboboxEvent<ID>(input);
    return event === null
      ? rejectRevisionInput(this.#snapshot, {
          class: 'transition-rejection',
          code: 'unsupported-terminal-key',
          message: 'Terminal keyboard input does not map to a combobox semantic event.',
          details: { key: input.key },
        })
      : this.#applyEvent(event, expectedRevision);
  }

  public handleTextInput(
    input: TextInput,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>> {
    const event = toComboboxTextEvent<ID>(input);
    return event === null
      ? rejectRevisionInput(this.#snapshot, {
          class: 'transition-rejection',
          code: 'unsupported-terminal-text-input',
          message: 'Terminal text input does not map to a combobox semantic event.',
        })
      : this.#applyEvent(event, expectedRevision);
  }

  #applyEvent(
    event: ComboboxEvent<ID>,
    expectedRevision: number,
  ): RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>> {
    const permitted = requireInteraction(this.#interaction, comboboxIntent(event));
    if (!permitted.ok) return rejectRevisionInput(this.#snapshot, permitted.error);
    const result = applyControllerEvent(
      this.#snapshot,
      expectedRevision,
      event,
      (state, semanticEvent) => applyComboboxEvent(
        this.#domain,
        this.#labels,
        state,
        semanticEvent,
        this.#policies,
      ),
      (previous, proposed) => controlledState(
        this.#domain,
        previous,
        proposed,
        this.#valueControlled,
        this.#inputStateControlled,
        this.#openControlled,
        this.#highlightControlled,
      ),
      (previous, proposed) => this.#notify(previous, proposed),
      toComboboxEffect,
    );
    if (result.ok) this.#snapshot = result.snapshot;
    return result;
  }

  #notify(previous: ComboboxState<ID>, proposed: ComboboxState<ID>): void {
    const previousValue = selectedValue(previous);
    const value = selectedValue(proposed);
    if (previousValue !== value) this.#onValueChange?.(Object.freeze({ value, previousValue }));
    if (!sameTextEditingState(previous.text, proposed.text)) {
      this.#onInputStateChange?.(Object.freeze({
        value: proposed.text,
        previousValue: previous.text,
      }));
    }
    if (previous.popupOpen !== proposed.popupOpen) {
      this.#onOpenChange?.(Object.freeze({
        value: proposed.popupOpen,
        previousValue: previous.popupOpen,
      }));
    }
    if (previous.cursor.current !== proposed.cursor.current) {
      this.#onHighlightedValueChange?.(Object.freeze({
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

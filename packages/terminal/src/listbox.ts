import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, SectileError, StableID } from '@sectile/core';
import { tryCreateInteractionState, requireInteraction, type InteractionState } from '@sectile/core/interaction';
import {
  DEFAULT_LISTBOX_SELECTION_MODE,
  applyListboxEvent,
  tryCreateListboxState,
  findListboxTypeaheadMatch,
  type ListboxCommand,
  type ListboxEvent,
  type ListboxPolicies,
  type ListboxSelectionMode,
  type ListboxState,
  type ListboxStateInput,
} from '@sectile/core/listbox';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import {
  tryCreateRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';
import { applyControllerEvent, synchronizeControllerState } from '@sectile/core/adapter-runtime';
import { createDisabledItems } from './internal/disabled-items.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export type KeyboardInput = TerminalKeyboardInput;

export type ListboxEffect<ID extends StableID = StableID> =
  | { readonly type: 'move-highlight'; readonly id: ID }
  | { readonly type: 'submit-item'; readonly id: ID };

export interface ListboxValueChangeDetails<ID extends StableID = StableID> {
  readonly value: readonly ID[];
  readonly previousValue: readonly ID[];
}

export interface ListboxHighlightChangeDetails<ID extends StableID = StableID> {
  readonly value: ID | null;
  readonly previousValue: ID | null;
}

export interface ListboxControllerOptions<ID extends StableID = StableID> {
  readonly domain: Sequence<ID>;
  readonly policies?: ListboxPolicies<ID>;
  readonly selectionMode?: ListboxSelectionMode;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly activationMode?: 'activate' | 'toggle';
  readonly clearOnEscape?: boolean;
  readonly disabledItems?: readonly ID[];
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly typeahead?: ListboxTypeaheadOptions<ID>;
  readonly value?: readonly ID[];
  readonly defaultValue?: readonly ID[];
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly onValueChange?: (change: ListboxValueChangeDetails<ID>) => void;
  readonly onHighlightedValueChange?: (change: ListboxHighlightChangeDetails<ID>) => void;
}

export type ListboxControllerValueChangeHandler<ID extends StableID = StableID> = NonNullable<ListboxControllerOptions<ID>['onValueChange']>;
export type ListboxControllerHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<ListboxControllerOptions<ID>['onHighlightedValueChange']>;

export interface ListboxTypeaheadOptions<ID extends StableID = StableID> {
  readonly textValue: (id: ID) => string;
  readonly normalize?: (text: string) => string;
  readonly timeoutMs?: number;
  readonly now?: () => number;
}

export type ListboxTypeaheadTextValueResolver<ID extends StableID = StableID> = NonNullable<ListboxTypeaheadOptions<ID>['textValue']>;
export type ListboxTypeaheadNormalizer<ID extends StableID = StableID> = NonNullable<ListboxTypeaheadOptions<ID>['normalize']>;
export type ListboxTypeaheadClock<ID extends StableID = StableID> = NonNullable<ListboxTypeaheadOptions<ID>['now']>;

export interface ListboxControlledValues<ID extends StableID = StableID> {
  readonly value?: readonly ID[];
  readonly highlightedValue?: ID | null;
}

export interface ListboxController<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<ListboxState<ID>>;
  syncControlledValues(
    values: ListboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ListboxState<ID>>>;
  handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision?: number,
  ): RevisionResult<ListboxState<ID>, ListboxEffect<ID>>;
  handleEvent(
    event: ListboxEvent<ID>,
    expectedRevision?: number,
  ): RevisionResult<ListboxState<ID>, ListboxEffect<ID>>;
}

export interface ListboxTransitionDetails<ID extends StableID = StableID> {
  readonly event: ListboxEvent<ID> | { readonly type: 'typeahead'; readonly query: string };
  readonly result: RevisionResult<ListboxState<ID>, ListboxEffect<ID>>;
}

export interface ListboxConnectionOptions<ID extends StableID = StableID> {
  readonly controller: ListboxController<ID>;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly activationMode?: 'activate' | 'toggle';
  readonly typeahead?: ListboxTypeaheadOptions<ID>;
  readonly onActivate?: (id: ID) => void;
  readonly onTransition?: (details: ListboxTransitionDetails<ID>) => void;
  readonly onUpdate?: () => void;
}

export type ListboxConnectionActivateHandler<ID extends StableID = StableID> = NonNullable<ListboxConnectionOptions<ID>['onActivate']>;
export type ListboxConnectionTransitionHandler<ID extends StableID = StableID> = NonNullable<ListboxConnectionOptions<ID>['onTransition']>;
export type ListboxConnectionUpdateHandler<ID extends StableID = StableID> = NonNullable<ListboxConnectionOptions<ID>['onUpdate']>;

export interface ListboxConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<ListboxState<ID>>;
  syncControlledValues(
    values: ListboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ListboxState<ID>>>;
  handleKeyboardInput(input: KeyboardInput): boolean;
  handleEvent(event: ListboxEvent<ID>): boolean;
}

export type ListboxOptions<ID extends StableID = StableID> =
  Omit<ListboxControllerOptions<ID>, 'domain'>
  & Omit<ListboxConnectionOptions<ID>, 'controller'>
  & { readonly items: readonly ID[] };

export function createListboxController<ID extends StableID>(
  options: ListboxControllerOptions<ID>,
): Result<ListboxController<ID>> {
  const policies = listboxPolicies(options);
  if (!policies.ok) return policies;
  const interaction = tryCreateInteractionState(options);
  if (!interaction.ok) return interaction;
  const initial = tryCreateListboxState(options.domain, {
    selected: options.value ?? options.defaultValue ?? [],
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? null,
  }, options.selectionMode ?? options.policies?.selectionMode ?? DEFAULT_LISTBOX_SELECTION_MODE);
  if (!initial.ok) return initial;
  const snapshot = tryCreateRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  return { ok: true, value: new TerminalListboxController(options, policies.value, interaction.value, snapshot.value) };
}

export function createListbox<ID extends StableID>(
  options: ListboxOptions<ID>,
): FacadeConnection<ListboxConnection<ID>> {
  return unwrap(tryCreateListbox(options));
}

export function tryCreateListbox<ID extends StableID>(
  options: ListboxOptions<ID>,
): Result<FacadeConnection<ListboxConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateListboxConnection(options));
}

function tryCreateListboxConnection<ID extends StableID>(
  options: ListboxOptions<ID>,
): Result<ListboxConnection<ID>> {
  const domain = tryCreateSequence(options.items);
  if (!domain.ok) return domain;
  const controller = createListboxController({ ...options, domain: domain.value });
  if (!controller.ok) return controller;
  return { ok: true, value: connectListbox({ ...options, controller: controller.value }) };
}

export function connectListbox<ID extends StableID>(
  options: ListboxConnectionOptions<ID>,
): ListboxConnection<ID> {
  return new TerminalListboxConnection(options);
}

export function toListboxEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
  orientation: 'horizontal' | 'vertical' = 'vertical',
): ListboxEvent<ID> | null {
  if (input.key === 'home') return 'first';
  if (input.key === 'end') return 'last';
  if (orientation === 'vertical' && input.key === 'down') return 'next';
  if (orientation === 'vertical' && input.key === 'up') return 'previous';
  if (orientation === 'horizontal' && input.key === 'right') return 'next';
  if (orientation === 'horizontal' && input.key === 'left') return 'previous';
  if (input.key === 'space') return 'toggle';
  if (input.key === 'enter') return 'activate';
  if (input.key === 'escape') return 'clear';
  return null;
}

export function toListboxEffect<ID extends StableID>(
  command: ListboxCommand<ID>,
): ListboxEffect<ID> {
  return Object.freeze(command.type === 'focus'
    ? { type: 'move-highlight', id: command.id }
    : { type: 'submit-item', id: command.id });
}

class TerminalListboxConnection<ID extends StableID> implements ListboxConnection<ID> {
  readonly #controller: ListboxController<ID>;
  readonly #onActivate: ((id: ID) => void) | undefined;
  readonly #onTransition: ((details: ListboxTransitionDetails<ID>) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;
  readonly #orientation: 'horizontal' | 'vertical';
  readonly #typeaheadEnabled: boolean;

  public constructor(options: ListboxConnectionOptions<ID>) {
    this.#controller = options.controller;
    this.#onActivate = options.onActivate;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    this.#orientation = options.orientation ?? 'vertical';
    this.#typeaheadEnabled = options.typeahead !== undefined;
  }

  public getSnapshot(): RevisionSnapshot<ListboxState<ID>> {
    return this.#controller.getSnapshot();
  }

  public syncControlledValues(
    values: ListboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ListboxState<ID>>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) this.#onUpdate?.();
    return result;
  }

  public handleKeyboardInput(input: KeyboardInput): boolean {
    const event = toListboxEvent<ID>(input, this.#orientation);
    const query = printableText(input);
    if (event === null && (query === null || !this.#typeaheadEnabled)) return false;
    const result = this.#controller.handleKeyboardInput(input);
    if (result.ok) {
      for (const effect of result.commands) {
        if (effect.type === 'submit-item') this.#onActivate?.(effect.id);
      }
    }
    const transitionEvent: ListboxTransitionDetails<ID>['event'] = event
      ?? { type: 'typeahead', query: query as string };
    this.#onTransition?.(Object.freeze({ event: transitionEvent, result }));
    if (result.ok) this.#onUpdate?.();
    return result.ok;
  }

  public handleEvent(event: ListboxEvent<ID>): boolean {
    const result = this.#controller.handleEvent(event);
    if (result.ok) {
      for (const effect of result.commands) {
        if (effect.type === 'submit-item') this.#onActivate?.(effect.id);
      }
    }
    this.#onTransition?.(Object.freeze({ event, result }));
    if (result.ok) this.#onUpdate?.();
    return result.ok;
  }
}

class TerminalListboxController<ID extends StableID> implements ListboxController<ID> {
  readonly #domain: Sequence<ID>;
  readonly #policies: ListboxPolicies<ID>;
  readonly #interaction: InteractionState;
  readonly #selectionMode: ListboxSelectionMode;
  readonly #orientation: 'horizontal' | 'vertical';
  readonly #activationMode: 'activate' | 'toggle';
  readonly #clearOnEscape: boolean;
  readonly #typeahead: ListboxTypeaheadOptions<ID> | undefined;
  readonly #valueControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #onValueChange: ((change: ListboxValueChangeDetails<ID>) => void) | undefined;
  readonly #onHighlightedValueChange:
    | ((change: ListboxHighlightChangeDetails<ID>) => void)
    | undefined;
  #snapshot: RevisionSnapshot<ListboxState<ID>>;
  #typeaheadBuffer = '';
  #lastTypeaheadAt = Number.NEGATIVE_INFINITY;

  public constructor(
    options: ListboxControllerOptions<ID>,
    policies: ListboxPolicies<ID>,
    interaction: InteractionState,
    snapshot: RevisionSnapshot<ListboxState<ID>>,
  ) {
    this.#domain = options.domain;
    this.#policies = policies;
    this.#interaction = interaction;
    this.#selectionMode = policies.selectionMode ?? DEFAULT_LISTBOX_SELECTION_MODE;
    this.#orientation = options.orientation ?? 'vertical';
    this.#activationMode = options.activationMode ?? 'activate';
    this.#clearOnEscape = options.clearOnEscape ?? true;
    this.#typeahead = options.typeahead;
    this.#valueControlled = options.value !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#onValueChange = options.onValueChange;
    this.#onHighlightedValueChange = options.onHighlightedValueChange;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): RevisionSnapshot<ListboxState<ID>> {
    return this.#snapshot;
  }

  public syncControlledValues(
    values: ListboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ListboxState<ID>>> {
    if (!this.#valueControlled && !this.#highlightControlled) {
      return {
        ok: false,
        error: {
          class: 'construction',
          code: 'uncontrolled-controller-sync',
          message: 'An uncontrolled listbox controller has no external values to synchronize.',
        },
      };
    }
    const inputError = controlledInputError(
      this.#valueControlled,
      this.#highlightControlled,
      values,
    );
    if (inputError !== null) return { ok: false, error: inputError };
    const state = tryCreateListboxState<ID>(this.#domain, {
      selected: this.#valueControlled
        ? (values.value as readonly ID[])
        : this.#snapshot.state.selection.selected,
      anchor: this.#snapshot.state.selection.anchor,
      current: this.#highlightControlled
        ? (values.highlightedValue as ID | null)
        : this.#snapshot.state.cursor.current,
    }, this.#selectionMode);
    const snapshot = synchronizeControllerState(this.#snapshot, state);
    if (!snapshot.ok) return snapshot;
    this.#snapshot = snapshot.value;
    return snapshot;
  }

  public handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<ListboxState<ID>, ListboxEffect<ID>> {
    const permitted = requireInteraction(this.#interaction, 'navigate');
    if (!permitted.ok) return rejectRevisionInput(this.#snapshot, permitted.error);
    const mapped = toListboxEvent<ID>(input, this.#orientation);
    const event = mapped === 'activate' && this.#activationMode === 'toggle'
      ? 'toggle'
      : mapped === 'clear' && !this.#clearOnEscape ? null : mapped;
    if (event !== null) return this.handleEvent(event, expectedRevision);
    const queryPart = printableText(input);
    if (queryPart === null || this.#typeahead === undefined) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-terminal-key',
        message: 'Terminal keyboard input does not map to a listbox semantic event.',
        details: { key: input.key },
      });
    }
    const now = this.#typeahead.now?.() ?? Date.now();
    const timeoutMs = this.#typeahead.timeoutMs ?? 500;
    if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection', code: 'invalid-typeahead-timeout',
        message: 'Listbox typeahead timeout must be a non-negative finite number.',
      });
    }
    const buffer = now - this.#lastTypeaheadAt > timeoutMs
      ? queryPart
      : repeatedTypeahead(this.#typeaheadBuffer, queryPart);
    const match = findListboxTypeaheadMatch(this.#domain, this.#snapshot.state.cursor.current, buffer, {
      textValue: this.#typeahead.textValue,
      ...(this.#typeahead.normalize === undefined ? {} : { normalize: this.#typeahead.normalize }),
      ...(this.#policies.eligible === undefined ? {} : { eligible: this.#policies.eligible }),
      ...(this.#policies.maxScan === undefined ? {} : { maxScan: this.#policies.maxScan }),
    });
    this.#typeaheadBuffer = buffer;
    this.#lastTypeaheadAt = now;
    if (!match.ok) return rejectRevisionInput(this.#snapshot, match.error);
    if (match.value === null) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection', code: 'typeahead-no-match',
        message: 'Listbox typeahead did not match an eligible item.',
        details: { query: buffer },
      });
    }
    return this.handleEvent({ type: 'focus', id: match.value }, expectedRevision);
  }

  public handleEvent(
    event: ListboxEvent<ID>,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<ListboxState<ID>, ListboxEffect<ID>> {
    const permitted = requireInteraction(this.#interaction, listboxIntent(event));
    if (!permitted.ok) return rejectRevisionInput(this.#snapshot, permitted.error);
    const result = applyControllerEvent(
      this.#snapshot,
      expectedRevision,
      event,
      (state, semanticEvent) => applyListboxEvent(
        this.#domain,
        state,
        semanticEvent,
        this.#policies,
      ),
      (previous, proposed) => controlledState(
        this.#domain,
        previous,
        proposed,
        this.#valueControlled,
        this.#highlightControlled,
        this.#selectionMode,
      ),
      (previous, proposed) => this.#notify(previous, proposed),
      toListboxEffect,
    );
    if (result.ok) this.#snapshot = result.snapshot;
    return result;
  }

  #notify(previous: ListboxState<ID>, proposed: ListboxState<ID>): void {
    if (!sameIDs(previous.selection.selected, proposed.selection.selected)) {
      this.#onValueChange?.(Object.freeze({
        value: proposed.selection.selected,
        previousValue: previous.selection.selected,
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

function controlledState<ID extends StableID>(
  domain: Sequence<ID>,
  previous: ListboxState<ID>,
  proposed: ListboxState<ID>,
  valueControlled: boolean,
  highlightControlled: boolean,
  selectionMode: ListboxSelectionMode,
): Result<ListboxState<ID>> {
  const input: ListboxStateInput<ID> = {
    selected: valueControlled ? previous.selection.selected : proposed.selection.selected,
    anchor: proposed.selection.anchor,
    current: highlightControlled ? previous.cursor.current : proposed.cursor.current,
  };
  return tryCreateListboxState(domain, input, selectionMode);
}

function listboxPolicies<ID extends StableID>(
  options: ListboxControllerOptions<ID>,
): Result<ListboxPolicies<ID>> {
  const disabled = createDisabledItems(options.domain, options.disabledItems);
  if (!disabled.ok) return disabled;
  const eligible = options.policies?.eligible;
  return { ok: true, value: Object.freeze({
    ...options.policies,
    selectionFollowsFocus: options.readOnly ? false : options.policies?.selectionFollowsFocus ?? false,
    selectionMode: options.selectionMode ?? options.policies?.selectionMode ?? DEFAULT_LISTBOX_SELECTION_MODE,
    eligible: (id: ID) => !disabled.value.has(id) && (eligible?.(id) ?? true),
  }) };
}

function listboxIntent<ID extends StableID>(event: ListboxEvent<ID>): 'navigate' | 'mutate' {
  if (typeof event === 'object') return event.type === 'focus' ? 'navigate' : 'mutate';
  return event === 'next' || event === 'previous' || event === 'first' || event === 'last'
    ? 'navigate'
    : 'mutate';
}

function printableText(input: KeyboardInput): string | null {
  return input.altKey === true || input.ctrlKey === true
    || input.text === undefined || input.text.length === 0
    ? null
    : input.text;
}

function repeatedTypeahead(buffer: string, next: string): string {
  return buffer.length > 0 && Array.from(buffer).every((character) => character === next)
    ? next
    : `${buffer}${next}`;
}

function controlledInputError<ID extends StableID>(
  valueControlled: boolean,
  highlightControlled: boolean,
  values: ListboxControlledValues<ID>,
): SectileError | null {
  if (valueControlled !== (values.value !== undefined)) {
    return {
      class: 'construction',
      code: valueControlled ? 'controlled-value-required' : 'uncontrolled-value-update',
      message: valueControlled
        ? 'Controlled listbox selection sync requires value.'
        : 'Uncontrolled listbox selection cannot be synchronized externally.',
    };
  }
  if (highlightControlled !== (values.highlightedValue !== undefined)) {
    return {
      class: 'construction',
      code: highlightControlled
        ? 'controlled-highlighted-value-required'
        : 'uncontrolled-highlighted-value-update',
      message: highlightControlled
        ? 'Controlled listbox highlight sync requires highlightedValue.'
        : 'Uncontrolled listbox highlight cannot be synchronized externally.',
    };
  }
  return null;
}

function sameIDs<ID extends StableID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

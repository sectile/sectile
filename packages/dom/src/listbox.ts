import type { Result, SectileError, StableID } from '@sectile/primitives';
import { createInteractionState, requireInteraction, type InteractionState } from '@sectile/primitives/interaction';
import {
  applyListboxEvent,
  createListboxState,
  findListboxTypeaheadMatch,
  type ListboxCommand,
  type ListboxEvent,
  type ListboxPolicies,
  type ListboxSelectionMode,
  type ListboxState,
  type ListboxStateInput,
} from '@sectile/primitives/listbox';
import { createSequence, type Sequence } from '@sectile/primitives/sequence';
import {
  createRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/primitives/revision';
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';
import { findDelegatedID } from './internal/delegated-event.js';
import { createDisabledItems } from './internal/disabled-items.js';
import { setInteractionAttributes } from './internal/interaction.js';

export interface KeyboardInput {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

export type ListboxEffect<ID extends StableID = StableID> =
  | { readonly type: 'focus-element'; readonly id: ID }
  | { readonly type: 'dispatch-activation'; readonly id: ID };

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

export interface ListboxTypeaheadOptions<ID extends StableID = StableID> {
  readonly textValue: (id: ID) => string;
  readonly normalize?: (text: string) => string;
  readonly timeoutMs?: number;
  readonly now?: () => number;
}

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
  readonly root: HTMLElement;
  readonly selectionMode?: ListboxSelectionMode;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly disabledItems?: readonly ID[];
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly typeahead?: ListboxTypeaheadOptions<ID>;
  readonly label?: string;
  readonly onActivate?: (id: ID) => void;
  readonly onTransition?: (details: ListboxTransitionDetails<ID>) => void;
  readonly onUpdate?: () => void;
}

export interface ListboxItemAttributes<ID extends StableID = StableID> {
  readonly id: ID;
  readonly disabled?: boolean;
}

export interface ListboxConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<ListboxState<ID>>;
  syncControlledValues(
    values: ListboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ListboxState<ID>>>;
  setListboxAttributes(label?: string): void;
  setItemAttributes(element: HTMLElement, attributes: ListboxItemAttributes<ID>): void;
  handleEvent(event: ListboxEvent<ID>): boolean;
  handleKeyboardEvent(event: KeyboardEvent): boolean;
  focusCurrent(): void;
  disconnect(): void;
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
  const interaction = createInteractionState(options);
  if (!interaction.ok) return interaction;
  const initial = createListboxState(options.domain, {
    selected: options.value ?? options.defaultValue ?? [],
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? null,
  }, options.selectionMode ?? options.policies?.selectionMode ?? 'multiple');
  if (!initial.ok) return initial;
  const snapshot = createRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  return { ok: true, value: new DOMListboxController(options, policies.value, interaction.value, snapshot.value) };
}

export function createListbox<ID extends StableID>(
  options: ListboxOptions<ID>,
): Result<ListboxConnection<ID>> {
  const domain = createSequence(options.items);
  if (!domain.ok) return domain;
  const controller = createListboxController({ ...options, domain: domain.value });
  if (!controller.ok) return controller;
  return { ok: true, value: connectListbox({
    ...options,
    selectionMode: options.selectionMode ?? options.policies?.selectionMode ?? 'multiple',
    controller: controller.value,
  }) };
}

export function connectListbox<ID extends StableID>(
  options: ListboxConnectionOptions<ID>,
): ListboxConnection<ID> {
  return new DOMListboxConnection(options);
}

export function toListboxEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
  orientation: 'horizontal' | 'vertical' = 'vertical',
): ListboxEvent<ID> | null {
  if (input.altKey === true || input.ctrlKey === true || input.metaKey === true) return null;
  if (input.key === 'Home') return 'first';
  if (input.key === 'End') return 'last';
  if (orientation === 'vertical' && input.key === 'ArrowDown') return 'next';
  if (orientation === 'vertical' && input.key === 'ArrowUp') return 'previous';
  if (orientation === 'horizontal' && input.key === 'ArrowRight') return 'next';
  if (orientation === 'horizontal' && input.key === 'ArrowLeft') return 'previous';
  if (input.key === ' ') return 'toggle';
  if (input.key === 'Enter') return 'activate';
  if (input.key === 'Escape') return 'clear';
  return null;
}

export function toListboxEffect<ID extends StableID>(
  command: ListboxCommand<ID>,
): ListboxEffect<ID> {
  return Object.freeze(command.type === 'focus'
    ? { type: 'focus-element', id: command.id }
    : { type: 'dispatch-activation', id: command.id });
}

class DOMListboxConnection<ID extends StableID> implements ListboxConnection<ID> {
  readonly #controller: ListboxController<ID>;
  readonly #root: HTMLElement;
  readonly #onActivate: ((id: ID) => void) | undefined;
  readonly #onTransition: ((details: ListboxTransitionDetails<ID>) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;
  readonly #selectionMode: ListboxSelectionMode;
  readonly #orientation: 'horizontal' | 'vertical';
  readonly #disabledItems: ReadonlySet<ID>;
  readonly #typeaheadEnabled: boolean;
  readonly #handleKeydown: (event: KeyboardEvent) => void;
  readonly #handleClick: (event: MouseEvent) => void;

  public constructor(options: ListboxConnectionOptions<ID>) {
    this.#controller = options.controller;
    this.#root = options.root;
    this.#onActivate = options.onActivate;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    this.#selectionMode = options.selectionMode ?? 'multiple';
    this.#orientation = options.orientation ?? 'vertical';
    this.#disabledItems = new Set(options.disabledItems ?? []);
    this.#typeaheadEnabled = options.typeahead !== undefined;
    this.#handleKeydown = (event): void => {
      if (this.handleKeyboardEvent(event)) event.preventDefault();
    };
    this.#handleClick = (event): void => {
      const id = findDelegatedID(event.target, this.#root, 'listboxId') as ID | null;
      if (id === null || this.#disabledItems.has(id)) return;
      this.handleEvent(this.#selectionMode === 'multiple'
        ? { type: 'toggle', id }
        : { type: 'activate', id });
    };
    this.#root.addEventListener('keydown', this.#handleKeydown);
    this.#root.addEventListener('click', this.#handleClick);
    setInteractionAttributes(this.#root, options, { readOnly: true });
    this.setListboxAttributes(options.label);
  }

  public getSnapshot(): RevisionSnapshot<ListboxState<ID>> {
    return this.#controller.getSnapshot();
  }

  public syncControlledValues(
    values: ListboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ListboxState<ID>>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) {
      this.#onUpdate?.();
      this.focusCurrent();
    }
    return result;
  }

  public setListboxAttributes(label?: string): void {
    this.#root.setAttribute('role', 'listbox');
    this.#root.setAttribute('aria-orientation', this.#orientation);
    if (this.#selectionMode === 'multiple') {
      this.#root.setAttribute('aria-multiselectable', 'true');
    } else {
      this.#root.removeAttribute('aria-multiselectable');
    }
    if (label === undefined) this.#root.removeAttribute('aria-label');
    else this.#root.setAttribute('aria-label', label);
  }

  public setItemAttributes(
    element: HTMLElement,
    attributes: ListboxItemAttributes<ID>,
  ): void {
    const state = this.#controller.getSnapshot().state;
    const current = state.cursor.current === attributes.id;
    element.dataset['listboxId'] = String(attributes.id);
    element.tabIndex = current ? 0 : -1;
    element.setAttribute('role', 'option');
    element.setAttribute('aria-selected', String(state.selection.has(attributes.id)));
    const disabled = attributes.disabled === true || this.#disabledItems.has(attributes.id);
    if (disabled) element.setAttribute('aria-disabled', 'true');
    else element.removeAttribute('aria-disabled');
  }

  public handleKeyboardEvent(event: KeyboardEvent): boolean {
    const input: KeyboardInput = {
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    };
    const semanticEvent = toListboxEvent<ID>(input, this.#orientation);
    const query = printableKey(input);
    if (semanticEvent === null && (query === null || !this.#typeaheadEnabled)) return false;
    const result = this.#controller.handleKeyboardInput(input);
    if (result.ok) this.#applyEffects(result.commands);
    const transitionEvent: ListboxTransitionDetails<ID>['event'] = semanticEvent
      ?? { type: 'typeahead', query: query as string };
    this.#onTransition?.(Object.freeze({
      event: transitionEvent,
      result,
    }));
    if (result.ok) {
      this.#onUpdate?.();
      this.focusCurrent();
    }
    return result.ok;
  }

  public handleEvent(event: ListboxEvent<ID>): boolean {
    const result = this.#controller.handleEvent(event);
    if (result.ok) this.#applyEffects(result.commands);
    this.#onTransition?.(Object.freeze({ event, result }));
    if (result.ok) {
      this.#onUpdate?.();
      this.focusCurrent();
    }
    return result.ok;
  }

  public focusCurrent(): void {
    queueMicrotask((): void => {
      const current = this.#controller.getSnapshot().state.cursor.current;
      if (current === null) {
        this.#root.focus();
        return;
      }
      for (const element of this.#root.querySelectorAll<HTMLElement>('[data-listbox-id]')) {
        if (element.dataset['listboxId'] !== String(current)) continue;
        element.focus();
        return;
      }
    });
  }

  public disconnect(): void {
    this.#root.removeEventListener('keydown', this.#handleKeydown);
    this.#root.removeEventListener('click', this.#handleClick);
  }

  #applyEffects(effects: readonly ListboxEffect<ID>[]): void {
    for (const effect of effects) {
      if (effect.type === 'dispatch-activation') this.#onActivate?.(effect.id);
    }
  }
}

class DOMListboxController<ID extends StableID> implements ListboxController<ID> {
  readonly #domain: Sequence<ID>;
  readonly #policies: ListboxPolicies<ID>;
  readonly #interaction: InteractionState;
  readonly #selectionMode: ListboxSelectionMode;
  readonly #orientation: 'horizontal' | 'vertical';
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
    this.#selectionMode = policies.selectionMode ?? 'multiple';
    this.#orientation = options.orientation ?? 'vertical';
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
    const state = createListboxState<ID>(this.#domain, {
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
    const event = toListboxEvent<ID>(input, this.#orientation);
    if (event !== null) return this.handleEvent(event, expectedRevision);
    const queryPart = printableKey(input);
    if (queryPart === null || this.#typeahead === undefined) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-dom-key',
        message: 'DOM keyboard input does not map to a listbox semantic event.',
        details: { key: input.key },
      });
    }
    const now = this.#typeahead.now?.() ?? Date.now();
    const timeoutMs = this.#typeahead.timeoutMs ?? 500;
    if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'invalid-typeahead-timeout',
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
        class: 'transition-rejection',
        code: 'typeahead-no-match',
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
  return createListboxState(domain, input, selectionMode);
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
    selectionMode: options.selectionMode ?? options.policies?.selectionMode ?? 'multiple',
    eligible: (id: ID) => !disabled.value.has(id) && (eligible?.(id) ?? true),
  }) };
}

function listboxIntent<ID extends StableID>(event: ListboxEvent<ID>): 'navigate' | 'mutate' {
  if (typeof event === 'object') return event.type === 'focus' ? 'navigate' : 'mutate';
  return event === 'next' || event === 'previous' || event === 'first' || event === 'last'
    ? 'navigate'
    : 'mutate';
}

function printableKey(input: KeyboardInput): string | null {
  return input.altKey === true || input.ctrlKey === true || input.metaKey === true
    || Array.from(input.key).length !== 1
    ? null
    : input.key;
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

import type { Result, SectileError, StableID } from '@sectile/primitives';
import {
  applyListboxEvent,
  createListboxState,
  type ListboxCommand,
  type ListboxEvent,
  type ListboxPolicies,
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
  readonly value?: readonly ID[];
  readonly defaultValue?: readonly ID[];
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly onValueChange?: (change: ListboxValueChangeDetails<ID>) => void;
  readonly onHighlightedValueChange?: (change: ListboxHighlightChangeDetails<ID>) => void;
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
}

export interface ListboxTransitionDetails<ID extends StableID = StableID> {
  readonly event: ListboxEvent;
  readonly result: RevisionResult<ListboxState<ID>, ListboxEffect<ID>>;
}

export interface ListboxConnectionOptions<ID extends StableID = StableID> {
  readonly controller: ListboxController<ID>;
  readonly root: HTMLElement;
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
  const initial = createListboxState(options.domain, {
    selected: options.value ?? options.defaultValue ?? [],
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? null,
  });
  if (!initial.ok) return initial;
  const snapshot = createRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  return { ok: true, value: new DOMListboxController(options, snapshot.value) };
}

export function createListbox<ID extends StableID>(
  options: ListboxOptions<ID>,
): Result<ListboxConnection<ID>> {
  const domain = createSequence(options.items);
  if (!domain.ok) return domain;
  const controller = createListboxController({ ...options, domain: domain.value });
  if (!controller.ok) return controller;
  return { ok: true, value: connectListbox({ ...options, controller: controller.value }) };
}

export function connectListbox<ID extends StableID>(
  options: ListboxConnectionOptions<ID>,
): ListboxConnection<ID> {
  return new DOMListboxConnection(options);
}

export function toListboxEvent(input: KeyboardInput): ListboxEvent | null {
  if (input.altKey === true || input.ctrlKey === true || input.metaKey === true) return null;
  if (input.key === 'ArrowDown') return 'next';
  if (input.key === 'ArrowUp') return 'previous';
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
  readonly #handleKeydown: (event: KeyboardEvent) => void;

  public constructor(options: ListboxConnectionOptions<ID>) {
    this.#controller = options.controller;
    this.#root = options.root;
    this.#onActivate = options.onActivate;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    this.#handleKeydown = (event): void => {
      if (this.handleKeyboardEvent(event)) event.preventDefault();
    };
    this.#root.addEventListener('keydown', this.#handleKeydown);
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
    this.#root.setAttribute('aria-multiselectable', 'true');
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
    if (attributes.disabled === true) element.setAttribute('aria-disabled', 'true');
    else element.removeAttribute('aria-disabled');
  }

  public handleKeyboardEvent(event: KeyboardEvent): boolean {
    const input: KeyboardInput = {
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    };
    const semanticEvent = toListboxEvent(input);
    if (semanticEvent === null) return false;
    const result = this.#controller.handleKeyboardInput(input);
    if (result.ok) this.#applyEffects(result.commands);
    this.#onTransition?.(Object.freeze({ event: semanticEvent, result }));
    this.#onUpdate?.();
    this.focusCurrent();
    return true;
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
  readonly #valueControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #onValueChange: ((change: ListboxValueChangeDetails<ID>) => void) | undefined;
  readonly #onHighlightedValueChange:
    | ((change: ListboxHighlightChangeDetails<ID>) => void)
    | undefined;
  #snapshot: RevisionSnapshot<ListboxState<ID>>;

  public constructor(
    options: ListboxControllerOptions<ID>,
    snapshot: RevisionSnapshot<ListboxState<ID>>,
  ) {
    this.#domain = options.domain;
    this.#policies = options.policies ?? {};
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
    });
    const snapshot = synchronizeControllerState(this.#snapshot, state);
    if (!snapshot.ok) return snapshot;
    this.#snapshot = snapshot.value;
    return snapshot;
  }

  public handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<ListboxState<ID>, ListboxEffect<ID>> {
    const event = toListboxEvent(input);
    if (event === null) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-dom-key',
        message: 'DOM keyboard input does not map to a listbox semantic event.',
        details: { key: input.key },
      });
    }
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
): Result<ListboxState<ID>> {
  const input: ListboxStateInput<ID> = {
    selected: valueControlled ? previous.selection.selected : proposed.selection.selected,
    anchor: proposed.selection.anchor,
    current: highlightControlled ? previous.cursor.current : proposed.cursor.current,
  };
  return createListboxState(domain, input);
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

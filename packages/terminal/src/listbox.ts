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
import type { Sequence } from '@sectile/primitives/sequence';
import {
  applyRevisionedEvent,
  createRevisionSnapshot,
  mapRevisionCommands,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/primitives/revision';

export interface KeyboardInput {
  readonly key: string;
}

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
  return { ok: true, value: new TerminalListboxController(options, snapshot.value) };
}

export function toListboxEvent(input: KeyboardInput): ListboxEvent | null {
  if (input.key === 'down') return 'next';
  if (input.key === 'up') return 'previous';
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

class TerminalListboxController<ID extends StableID> implements ListboxController<ID> {
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
    if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) {
      return {
        ok: false,
        error: {
          class: 'resource-rejection',
          code: 'revision-ceiling-reached',
          message: 'Listbox controller revision cannot advance beyond the safe-integer ceiling.',
          details: { revision: this.#snapshot.revision },
        },
      };
    }
    const state = createListboxState<ID>(this.#domain, {
      selected: this.#valueControlled
        ? (values.value as readonly ID[])
        : this.#snapshot.state.selection.selected,
      anchor: this.#snapshot.state.selection.anchor,
      current: this.#highlightControlled
        ? (values.highlightedValue as ID | null)
        : this.#snapshot.state.cursor.current,
    });
    if (!state.ok) return state;
    const snapshot = createRevisionSnapshot(state.value, this.#snapshot.revision + 1);
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
        code: 'unsupported-terminal-key',
        message: 'Terminal keyboard input does not map to a listbox semantic event.',
        details: { key: input.key },
      });
    }
    const previous = this.#snapshot.state;
    const semantic = applyRevisionedEvent(
      this.#snapshot,
      expectedRevision,
      event,
      (state, semanticEvent) => applyListboxEvent(
        this.#domain,
        state,
        semanticEvent,
        this.#policies,
      ),
    );
    if (!semantic.ok) return semantic;
    const proposed = semantic.snapshot.state;
    const committed = controlledState(
      this.#domain,
      previous,
      proposed,
      this.#valueControlled,
      this.#highlightControlled,
    );
    if (!committed.ok) return rejectRevisionInput(this.#snapshot, committed.error);
    this.#snapshot = Object.freeze({
      revision: semantic.snapshot.revision,
      state: committed.value,
    });
    this.#notify(previous, proposed);
    const mapped = mapRevisionCommands(
      Object.freeze({
        ok: true as const,
        snapshot: this.#snapshot,
        commands: semantic.commands,
      }),
      toListboxEffect,
    );
    return this.#snapshot === mapped.snapshot
      ? mapped
      : Object.freeze({ ...mapped, snapshot: this.#snapshot });
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

import type { Result, SectileError, StableID } from '@sectile/primitives';
import {
  applyComboboxEvent,
  createComboboxState,
  type ComboboxCommand,
  type ComboboxEvent,
  type ComboboxState,
} from '@sectile/primitives/combobox';
import {
  createRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/primitives/revision';
import type { Sequence } from '@sectile/primitives/sequence';
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';

export interface KeyboardInput {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

export interface ComboboxEffect<ID extends StableID = StableID> {
  readonly type: 'dispatch-accept';
  readonly id: ID;
}

export interface ComboboxValueChangeDetails<ID extends StableID = StableID> {
  readonly value: ID | null;
  readonly previousValue: ID | null;
}

export interface ComboboxInputValueChangeDetails {
  readonly value: string;
  readonly previousValue: string;
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
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly inputValue?: string;
  readonly defaultInputValue?: string;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly onValueChange?: (change: ComboboxValueChangeDetails<ID>) => void;
  readonly onInputValueChange?: (change: ComboboxInputValueChangeDetails) => void;
  readonly onOpenChange?: (change: ComboboxOpenChangeDetails) => void;
  readonly onHighlightedValueChange?: (change: ComboboxHighlightChangeDetails<ID>) => void;
}

export interface ComboboxControlledValues<ID extends StableID = StableID> {
  readonly value?: ID | null;
  readonly inputValue?: string;
  readonly open?: boolean;
  readonly highlightedValue?: ID | null;
}

export interface ComboboxController<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<ComboboxState<ID>>;
  syncControlledValues(
    values: ComboboxControlledValues<ID>,
  ): Result<RevisionSnapshot<ComboboxState<ID>>>;
  handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision?: number,
  ): RevisionResult<ComboboxState<ID>, ComboboxEffect<ID>>;
}

export function createComboboxController<ID extends StableID>(
  options: ComboboxControllerOptions<ID>,
): Result<ComboboxController<ID>> {
  const value = options.value !== undefined ? options.value : options.defaultValue ?? null;
  const initial = createComboboxState(options.domain, {
    inputValue: options.inputValue !== undefined
      ? options.inputValue
      : options.defaultInputValue !== undefined
        ? options.defaultInputValue
        : '',
    popupOpen: options.open !== undefined ? options.open : options.defaultOpen ?? false,
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? null,
    selected: value === null ? [] : [value],
    anchor: value,
  });
  if (!initial.ok) return initial;
  const snapshot = createRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  return { ok: true, value: new DOMComboboxController(options, snapshot.value) };
}

export function toComboboxEvent(input: KeyboardInput): ComboboxEvent | null {
  if (input.altKey === true || input.ctrlKey === true || input.metaKey === true) return null;
  return input.key === 'Enter' ? 'accept' : null;
}

export function toComboboxEffect<ID extends StableID>(
  command: ComboboxCommand<ID>,
): ComboboxEffect<ID> {
  return Object.freeze({ type: 'dispatch-accept', id: command.id });
}

class DOMComboboxController<ID extends StableID> implements ComboboxController<ID> {
  readonly #domain: Sequence<ID>;
  readonly #labels: ReadonlyMap<ID, string>;
  readonly #valueControlled: boolean;
  readonly #inputValueControlled: boolean;
  readonly #openControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #onValueChange: ((change: ComboboxValueChangeDetails<ID>) => void) | undefined;
  readonly #onInputValueChange: ((change: ComboboxInputValueChangeDetails) => void) | undefined;
  readonly #onOpenChange: ((change: ComboboxOpenChangeDetails) => void) | undefined;
  readonly #onHighlightedValueChange:
    | ((change: ComboboxHighlightChangeDetails<ID>) => void)
    | undefined;
  #snapshot: RevisionSnapshot<ComboboxState<ID>>;

  public constructor(
    options: ComboboxControllerOptions<ID>,
    snapshot: RevisionSnapshot<ComboboxState<ID>>,
  ) {
    this.#domain = options.domain;
    this.#labels = options.labels;
    this.#valueControlled = options.value !== undefined;
    this.#inputValueControlled = options.inputValue !== undefined;
    this.#openControlled = options.open !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#onValueChange = options.onValueChange;
    this.#onInputValueChange = options.onInputValueChange;
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
      this.#inputValueControlled,
      this.#openControlled,
      this.#highlightControlled,
      values,
    );
    if (error !== null) return { ok: false, error };
    const selected = this.#valueControlled
      ? (values.value as ID | null)
      : selectedValue(this.#snapshot.state);
    const state = createComboboxState(this.#domain, {
      inputValue: this.#inputValueControlled
        ? values.inputValue as string
        : inputValue(this.#snapshot.state),
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
    const event = toComboboxEvent(input);
    if (event === null) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-dom-key',
        message: 'DOM keyboard input does not map to a combobox acceptance event.',
        details: { key: input.key },
      });
    }
    const result = applyControllerEvent(
      this.#snapshot,
      expectedRevision,
      event,
      (state, semanticEvent) => applyComboboxEvent(
        this.#domain,
        this.#labels,
        state,
        semanticEvent,
      ),
      (previous, proposed) => controlledState(
        this.#domain,
        previous,
        proposed,
        this.#valueControlled,
        this.#inputValueControlled,
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
    const previousInputValue = inputValue(previous);
    const nextInputValue = inputValue(proposed);
    if (previousInputValue !== nextInputValue) {
      this.#onInputValueChange?.(Object.freeze({
        value: nextInputValue,
        previousValue: previousInputValue,
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

function controlledState<ID extends StableID>(
  domain: Sequence<ID>,
  previous: ComboboxState<ID>,
  proposed: ComboboxState<ID>,
  valueControlled: boolean,
  inputValueControlled: boolean,
  openControlled: boolean,
  highlightControlled: boolean,
): Result<ComboboxState<ID>> {
  return createComboboxState(domain, {
    inputValue: inputValueControlled ? inputValue(previous) : inputValue(proposed),
    popupOpen: openControlled ? previous.popupOpen : proposed.popupOpen,
    current: highlightControlled ? previous.cursor.current : proposed.cursor.current,
    selected: valueControlled ? previous.selection.selected : proposed.selection.selected,
    anchor: valueControlled ? previous.selection.anchor : proposed.selection.anchor,
  });
}

function selectedValue<ID extends StableID>(state: ComboboxState<ID>): ID | null {
  return state.selection.selected[0] ?? null;
}

function inputValue<ID extends StableID>(state: ComboboxState<ID>): string {
  return state.text.snapshot.text;
}

function controlledInputError<ID extends StableID>(
  valueControlled: boolean,
  inputValueControlled: boolean,
  openControlled: boolean,
  highlightControlled: boolean,
  values: ComboboxControlledValues<ID>,
): SectileError | null {
  return fieldError(valueControlled, values.value !== undefined, 'value', 'combobox value')
    ?? fieldError(
      inputValueControlled,
      values.inputValue !== undefined,
      'input-value',
      'combobox input value',
    )
    ?? fieldError(openControlled, values.open !== undefined, 'open', 'combobox open state')
    ?? fieldError(
      highlightControlled,
      values.highlightedValue !== undefined,
      'highlighted-value',
      'combobox highlight',
    );
}

function fieldError(
  controlled: boolean,
  provided: boolean,
  codeName: string,
  label: string,
): SectileError | null {
  if (controlled === provided) return null;
  return {
    class: 'construction',
    code: controlled ? `controlled-${codeName}-required` : `uncontrolled-${codeName}-update`,
    message: controlled
      ? `Controlled ${label} sync requires its external value.`
      : `Uncontrolled ${label} cannot be synchronized externally.`,
  };
}

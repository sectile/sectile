import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TextEditingState, TextEvent, TextSelectionInput } from '@sectile/core/text';
import {
  applyNumberFieldEvent,
  tryCreateNumberFieldState,
  type NumberFieldCommand,
  type NumberFieldEvent,
  type NumberFieldPolicies,
  type NumberFieldState,
} from '@sectile/core/number-field';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { toTerminalTextInput } from './internal/text-input.js';
import { toTextEvent } from './text.js';

export interface NumberFieldValueChangeDetails {
  readonly value: string | null;
  readonly expression: string;
}

export interface NumberFieldInputStateChangeDetails {
  readonly value: TextEditingState;
  readonly previousValue: TextEditingState;
}

export interface NumberFieldOptions {
  readonly policies?: NumberFieldPolicies;
  readonly value?: string | null;
  readonly defaultValue?: string | null;
  readonly inputState?: TextEditingState;
  readonly defaultInputState?: TextEditingState;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly onValueChange?: (details: NumberFieldValueChangeDetails) => void;
  readonly onInputStateChange?: (details: NumberFieldInputStateChangeDetails) => void;
  readonly onUpdate?: () => void;
}

export interface NumberFieldControlledValues {
  readonly value?: string | null;
  readonly inputState?: TextEditingState;
}

export interface NumberFieldConnection {
  getSnapshot(): RevisionSnapshot<NumberFieldState>;
  getText(): string;
  getValue(): string | null;
  getCaret(): number;
  syncControlledValues(values: NumberFieldControlledValues): Result<RevisionSnapshot<NumberFieldState>>;
  handleEvent(event: NumberFieldEvent): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
  handleTextInput(text: string): boolean;
}

export function createNumberField(options: NumberFieldOptions = {}): FacadeConnection<NumberFieldConnection> {
  return unwrap(tryCreateNumberField(options));
}

export function tryCreateNumberField(options: NumberFieldOptions = {}): Result<FacadeConnection<NumberFieldConnection>> {
  return createFacadeConnection(options, (options) => tryCreateNumberFieldConnection(options));
}

function tryCreateNumberFieldConnection(options: NumberFieldOptions = {}): Result<NumberFieldConnection> {
  const valueControlled = options.value !== undefined;
  const inputControlled = options.inputState !== undefined;
  const required = options.required ?? options.policies?.required;
  const policies: NumberFieldPolicies = Object.freeze({
    ...options.policies,
    ...(required === undefined ? {} : { required }),
  });
  const runtime = createSemanticController<NumberFieldState, NumberFieldEvent, NumberFieldCommand, NumberFieldCommand>({
    initial: tryCreateNumberFieldState(
      options.value !== undefined ? options.value : options.defaultValue ?? null,
      options.inputState !== undefined ? options.inputState : options.defaultInputState,
    ),
    reducer: (state, event) => applyNumberFieldEvent(state, event, policies),
    reconcile: (previous, proposed) => tryCreateNumberFieldState(
      valueControlled ? previous.value : proposed.value,
      inputControlled ? previous.inputState : proposed.inputState,
    ),
    notify: (previous, proposed) => {
      if (!sameInputState(previous.inputState, proposed.inputState)) {
        options.onInputStateChange?.(Object.freeze({
          value: proposed.inputState,
          previousValue: previous.inputState,
        }));
      }
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new TerminalNumberField(options, runtime.value, valueControlled, inputControlled) }
    : runtime;
}

class TerminalNumberField implements NumberFieldConnection {
  readonly #options: NumberFieldOptions;
  readonly #runtime: SemanticController<NumberFieldState, NumberFieldEvent, NumberFieldCommand>;
  readonly #valueControlled: boolean;
  readonly #inputControlled: boolean;

  public constructor(
    options: NumberFieldOptions,
    runtime: SemanticController<NumberFieldState, NumberFieldEvent, NumberFieldCommand>,
    valueControlled: boolean,
    inputControlled: boolean,
  ) {
    this.#options = options;
    this.#runtime = runtime;
    this.#valueControlled = valueControlled;
    this.#inputControlled = inputControlled;
  }

  public getSnapshot(): RevisionSnapshot<NumberFieldState> {
    return this.#runtime.getSnapshot();
  }

  public getText(): string {
    return this.getSnapshot().state.inputState.snapshot.text;
  }

  public getValue(): string | null {
    return this.getSnapshot().state.value;
  }

  public getCaret(): number {
    return this.getSnapshot().state.inputState.snapshot.selection.focusCodeUnitOffset;
  }

  public syncControlledValues(values: NumberFieldControlledValues): Result<RevisionSnapshot<NumberFieldState>> {
    if (this.#valueControlled !== (values.value !== undefined)
      || this.#inputControlled !== (values.inputState !== undefined)) {
      return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled number field values must preserve their construction-time shape.' } };
    }
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateNumberFieldState(
      this.#valueControlled ? values.value as string | null : state.value,
      this.#inputControlled ? values.inputState as TextEditingState : state.inputState,
    ));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public handleEvent(event: NumberFieldEvent): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'value-committed') {
          this.#options.onValueChange?.(Object.freeze({ value: command.value, expression: command.expression }));
        }
      }
      this.#options.onUpdate?.();
    }
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    if (input.ctrlKey === true || input.altKey === true) return false;
    if (input.key === 'enter') return this.handleEvent('commit');
    if (input.key === 'escape') return this.handleEvent('cancel');
    const state = this.getSnapshot().state.inputState;
    if (input.key === 'left' || input.key === 'right' || input.key === 'home' || input.key === 'end') {
      return this.#moveSelection(input, state);
    }
    const semanticInput = toTerminalTextInput(state, input);
    if (semanticInput === null) return false;
    const event = toTextEvent(semanticInput);
    return event !== null && this.handleEvent({ type: 'text', event });
  }

  public handleTextInput(text: string): boolean {
    if (typeof text !== 'string' || text.length === 0) return false;
    return this.handleKeyboardInput({ key: text, text });
  }

  #moveSelection(input: TerminalKeyboardInput, state: TextEditingState): boolean {
    const snapshot = state.snapshot;
    const selection = snapshot.selection;
    let focus: number;
    if (input.key === 'home') focus = 0;
    else if (input.key === 'end') focus = snapshot.text.length;
    else if (selection.startCodeUnitOffset !== selection.endCodeUnitOffset && input.shiftKey !== true) {
      focus = input.key === 'left' ? selection.startCodeUnitOffset : selection.endCodeUnitOffset;
    } else {
      focus = input.key === 'left'
        ? previousGraphemeOffset(snapshot.text, selection.focusCodeUnitOffset)
        : nextGraphemeOffset(snapshot.text, selection.focusCodeUnitOffset);
    }
    const nextSelection: TextSelectionInput = Object.freeze({
      anchorCodeUnitOffset: input.shiftKey === true ? selection.anchorCodeUnitOffset : focus,
      focusCodeUnitOffset: focus,
    });
    const event: TextEvent = Object.freeze({
      type: 'replace',
      startCodeUnitOffset: focus,
      endCodeUnitOffset: focus,
      text: '',
      selection: nextSelection,
    });
    return this.handleEvent({ type: 'text', event });
  }
}

function previousGraphemeOffset(text: string, offset: number): number {
  let previous = 0;
  for (const segment of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) {
    if (segment.index >= offset) break;
    previous = segment.index;
  }
  return previous;
}

function nextGraphemeOffset(text: string, offset: number): number {
  for (const segment of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) {
    if (segment.index > offset) return segment.index;
  }
  return text.length;
}

function sameInputState(left: TextEditingState, right: TextEditingState): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

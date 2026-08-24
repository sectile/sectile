import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import {
  applyQuantityFieldEvent,
  tryCreateQuantityFieldState,
  type QuantityFieldCommand,
  type QuantityFieldEvent,
  type QuantityFieldPolicies,
  type QuantityFieldState,
  type QuantityValue,
} from '@sectile/core/quantity-field';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TextEditingState, TextEvent, TextSelectionInput } from '@sectile/core/text';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { toTerminalTextInput } from './internal/text-input.js';
import { toTextEvent } from './text.js';

export interface QuantityFieldValueChangeDetails {
  readonly value: QuantityValue | null;
  readonly expression: string;
  readonly displayUnit: string;
}

export interface QuantityFieldOptions {
  readonly policies: QuantityFieldPolicies;
  readonly quantity?: QuantityValue | null;
  readonly defaultQuantity?: QuantityValue | null;
  readonly displayUnit?: string;
  readonly defaultDisplayUnit?: string;
  readonly inputState?: TextEditingState;
  readonly defaultInputState?: TextEditingState;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onQuantityChange?: (details: QuantityFieldValueChangeDetails) => void;
  readonly onDisplayUnitChange?: (unit: string) => void;
  readonly onInputStateChange?: (value: TextEditingState) => void;
  readonly onUpdate?: () => void;
}

export interface QuantityFieldControlledValues {
  readonly quantity?: QuantityValue | null;
  readonly displayUnit?: string;
  readonly inputState?: TextEditingState;
}

export interface QuantityFieldConnection {
  getSnapshot(): RevisionSnapshot<QuantityFieldState>;
  getText(): string;
  getQuantity(): QuantityValue | null;
  getDisplayUnit(): string;
  getCaret(): number;
  syncControlledValues(values: QuantityFieldControlledValues): Result<RevisionSnapshot<QuantityFieldState>>;
  handleEvent(event: QuantityFieldEvent): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
  handleTextInput(text: string): boolean;
}

export function createQuantityField(options: QuantityFieldOptions): FacadeConnection<QuantityFieldConnection> {
  return unwrap(tryCreateQuantityField(options));
}

export function tryCreateQuantityField(options: QuantityFieldOptions): Result<FacadeConnection<QuantityFieldConnection>> {
  return createFacadeConnection(options, (options) => tryCreateQuantityFieldConnection(options));
}

function tryCreateQuantityFieldConnection(options: QuantityFieldOptions): Result<QuantityFieldConnection> {
  const quantityControlled = options.quantity !== undefined;
  const displayUnitControlled = options.displayUnit !== undefined;
  const inputControlled = options.inputState !== undefined;
  const runtime = createSemanticController<QuantityFieldState, QuantityFieldEvent, QuantityFieldCommand, QuantityFieldCommand>({
    initial: tryCreateQuantityFieldState(
      options.policies,
      options.quantity !== undefined ? options.quantity : options.defaultQuantity ?? null,
      options.displayUnit ?? options.defaultDisplayUnit,
      options.inputState !== undefined ? options.inputState : options.defaultInputState,
    ),
    reducer: (state, event) => applyQuantityFieldEvent(state, event, options.policies),
    reconcile: (previous, proposed) => tryCreateQuantityFieldState(
      options.policies,
      quantityControlled ? previous.quantity : proposed.quantity,
      displayUnitControlled ? previous.displayUnit : proposed.displayUnit,
      inputControlled ? previous.inputState : proposed.inputState,
    ),
    notify: (previous, proposed) => {
      if (!sameValue(previous.displayUnit, proposed.displayUnit)) options.onDisplayUnitChange?.(proposed.displayUnit);
      if (!sameValue(previous.inputState, proposed.inputState)) options.onInputStateChange?.(proposed.inputState);
    },
    toEffect: (command) => command,
    interaction: options,
    interactionIntent: (event) => typeof event === 'object' && event.type === 'set-display-unit' ? 'navigate' : 'mutate',
  });
  return runtime.ok
    ? { ok: true, value: new TerminalQuantityField(options, runtime.value, quantityControlled, displayUnitControlled, inputControlled) }
    : runtime;
}

class TerminalQuantityField implements QuantityFieldConnection {
  readonly #options: QuantityFieldOptions;
  readonly #runtime: SemanticController<QuantityFieldState, QuantityFieldEvent, QuantityFieldCommand>;
  readonly #quantityControlled: boolean;
  readonly #displayUnitControlled: boolean;
  readonly #inputControlled: boolean;

  public constructor(
    options: QuantityFieldOptions,
    runtime: SemanticController<QuantityFieldState, QuantityFieldEvent, QuantityFieldCommand>,
    quantityControlled: boolean,
    displayUnitControlled: boolean,
    inputControlled: boolean,
  ) {
    this.#options = options;
    this.#runtime = runtime;
    this.#quantityControlled = quantityControlled;
    this.#displayUnitControlled = displayUnitControlled;
    this.#inputControlled = inputControlled;
  }

  public getSnapshot(): RevisionSnapshot<QuantityFieldState> { return this.#runtime.getSnapshot(); }
  public getText(): string { return this.getSnapshot().state.inputState.snapshot.text; }
  public getQuantity(): QuantityValue | null { return this.getSnapshot().state.quantity; }
  public getDisplayUnit(): string { return this.getSnapshot().state.displayUnit; }
  public getCaret(): number { return this.getSnapshot().state.inputState.snapshot.selection.focusCodeUnitOffset; }

  public syncControlledValues(values: QuantityFieldControlledValues): Result<RevisionSnapshot<QuantityFieldState>> {
    if (this.#quantityControlled !== (values.quantity !== undefined)
      || this.#displayUnitControlled !== (values.displayUnit !== undefined)
      || this.#inputControlled !== (values.inputState !== undefined)) {
      return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled quantity field values must preserve their construction-time shape.' } };
    }
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateQuantityFieldState(
      this.#options.policies,
      this.#quantityControlled ? values.quantity as QuantityValue | null : state.quantity,
      this.#displayUnitControlled ? values.displayUnit as string : state.displayUnit,
      this.#inputControlled ? values.inputState as TextEditingState : state.inputState,
    ));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public handleEvent(event: QuantityFieldEvent): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'quantity-committed') {
          this.#options.onQuantityChange?.(Object.freeze({
            value: command.value,
            expression: command.expression,
            displayUnit: command.displayUnit,
          }));
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
    if (input.key === '[') return this.#cycleUnit(-1);
    if (input.key === ']') return this.#cycleUnit(1);
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

  #cycleUnit(direction: -1 | 1): boolean {
    const policies = this.#options.policies;
    const preferred = policies.unitSystem?.getUnits(policies.canonicalUnit) ?? [];
    const compatible = preferred.length > 0
      ? preferred
      : policies.registry.units
        .filter((unit) => policies.registry.compatible(policies.canonicalUnit, unit.id))
        .map((unit) => unit.id);
    const units = [...new Set([...compatible, this.getDisplayUnit()])];
    const current = units.indexOf(this.getDisplayUnit());
    if (current < 0 || units.length < 2) return false;
    const next = (current + direction + units.length) % units.length;
    const unit = units[next];
    return unit !== undefined && this.handleEvent({ type: 'set-display-unit', unit });
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
      type: 'replace', startCodeUnitOffset: focus, endCodeUnitOffset: focus, text: '', selection: nextSelection,
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

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

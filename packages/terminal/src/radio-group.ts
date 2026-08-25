import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applyRadioGroupEvent,
  tryCreateRadioGroupState,
  type RadioGroupCommand,
  type RadioGroupEvent,
  type RadioGroupPolicies,
  type RadioGroupState,
} from '@sectile/core/radio-group';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { createDisabledItems } from './internal/disabled-items.js';

export type RadioGroupEffect<ID extends StableID = StableID> =
  { readonly type: 'move-radio-highlight'; readonly id: ID };

export interface RadioGroupOptions<ID extends StableID = StableID> {
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly items: readonly ID[];
  readonly policies?: RadioGroupPolicies<ID>;
  readonly disabledItems?: readonly ID[];
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onUpdate?: () => void;
}

export type RadioGroupValueChangeHandler<ID extends StableID = StableID> = NonNullable<RadioGroupOptions<ID>['onValueChange']>;
export type RadioGroupHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<RadioGroupOptions<ID>['onHighlightedValueChange']>;
export type RadioGroupUpdateHandler<ID extends StableID = StableID> = NonNullable<RadioGroupOptions<ID>['onUpdate']>;

export interface RadioGroupConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<RadioGroupState<ID>>;
  syncControlledValues(values: {
    readonly value?: ID | null;
    readonly highlightedValue?: ID | null;
  }): Result<RevisionSnapshot<RadioGroupState<ID>>>;
  handleEvent(event: RadioGroupEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createRadioGroup<ID extends StableID>(
  options: RadioGroupOptions<ID>,
): FacadeConnection<RadioGroupConnection<ID>> {
  return unwrap(tryCreateRadioGroup(options));
}

export function tryCreateRadioGroup<ID extends StableID>(
  options: RadioGroupOptions<ID>,
): Result<FacadeConnection<RadioGroupConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateRadioGroupConnection(options));
}

function tryCreateRadioGroupConnection<ID extends StableID>(
  options: RadioGroupOptions<ID>,
): Result<RadioGroupConnection<ID>> {
  const domain = tryCreateSequence(options.items);
  if (!domain.ok) return domain;
  const disabled = createDisabledItems(domain.value, options.disabledItems);
  if (!disabled.ok) return disabled;
  const suppliedEligibility = options.policies?.eligible;
  const policies: RadioGroupPolicies<ID> = Object.freeze({
    ...options.policies,
    eligible: (id: ID) => !disabled.value.has(id) && (suppliedEligibility?.(id) ?? true),
  });
  const valueControlled = options.value !== undefined;
  const highlightControlled = options.highlightedValue !== undefined;
  const runtime = createSemanticController<
    RadioGroupState<ID>, RadioGroupEvent<ID>, RadioGroupCommand<ID>, RadioGroupEffect<ID>
  >({
    interaction: options,
    interactionIntent: radioGroupIntent,
    initial: tryCreateRadioGroupState(domain.value, {
      selected: selected(options.value ?? options.defaultValue ?? null),
      current: options.highlightedValue !== undefined
        ? options.highlightedValue
        : options.defaultHighlightedValue ?? options.value ?? options.defaultValue ?? null,
    }),
    reducer: (state, event) => applyRadioGroupEvent(domain.value, state, event, policies),
    reconcile: (previous, proposed) => tryCreateRadioGroupState(domain.value, {
      selected: valueControlled || options.readOnly === true
        ? previous.selection.selected
        : proposed.selection.selected,
      current: highlightControlled ? previous.cursor.current : proposed.cursor.current,
    }),
    notify: (previous, proposed) => {
      if (previous.selection.selected[0] !== proposed.selection.selected[0]) {
        options.onValueChange?.(proposed.selection.selected[0] ?? null);
      }
      if (previous.cursor.current !== proposed.cursor.current) {
        options.onHighlightedValueChange?.(proposed.cursor.current);
      }
    },
    toEffect: (command) => Object.freeze({ type: 'move-radio-highlight', id: command.id }),
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new TerminalRadioGroupConnection(
    options, domain.value, runtime.value, valueControlled, highlightControlled,
  ) };
}

export function toRadioGroupEvent<ID extends StableID = StableID>(
  input: TerminalKeyboardInput,
  orientation: 'horizontal' | 'vertical' = 'vertical',
): RadioGroupEvent<ID> | null {
  if (input.key === 'home') return 'first';
  if (input.key === 'end') return 'last';
  if (input.key === 'enter' || input.key === 'space') return 'check';
  if (orientation === 'horizontal' && input.key === 'right') return 'next';
  if (orientation === 'horizontal' && input.key === 'left') return 'previous';
  if (orientation === 'vertical' && input.key === 'down') return 'next';
  if (orientation === 'vertical' && input.key === 'up') return 'previous';
  return null;
}

class TerminalRadioGroupConnection<ID extends StableID> implements RadioGroupConnection<ID> {
  readonly #options: RadioGroupOptions<ID>;
  readonly #domain: Sequence<ID>;
  readonly #runtime: SemanticController<RadioGroupState<ID>, RadioGroupEvent<ID>, RadioGroupEffect<ID>>;
  readonly #valueControlled: boolean;
  readonly #highlightControlled: boolean;

  public constructor(
    options: RadioGroupOptions<ID>, domain: Sequence<ID>,
    runtime: SemanticController<RadioGroupState<ID>, RadioGroupEvent<ID>, RadioGroupEffect<ID>>,
    valueControlled: boolean, highlightControlled: boolean,
  ) {
    this.#options = options;
    this.#domain = domain;
    this.#runtime = runtime;
    this.#valueControlled = valueControlled;
    this.#highlightControlled = highlightControlled;
  }

  public getSnapshot(): RevisionSnapshot<RadioGroupState<ID>> { return this.#runtime.getSnapshot(); }

  public syncControlledValues(values: {
    readonly value?: ID | null;
    readonly highlightedValue?: ID | null;
  }): Result<RevisionSnapshot<RadioGroupState<ID>>> {
    if (this.#valueControlled !== (values.value !== undefined)
      || this.#highlightControlled !== (values.highlightedValue !== undefined)) {
      return { ok: false, error: {
        class: 'construction', code: 'controlled-shape-mismatch',
        message: 'Controlled radio group values must preserve their construction-time shape.',
      } };
    }
    const state = this.#runtime.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateRadioGroupState(this.#domain, {
      selected: this.#valueControlled ? selected(values.value ?? null) : state.selection.selected,
      current: this.#highlightControlled ? (values.highlightedValue ?? null) : state.cursor.current,
    }));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public handleEvent(event: RadioGroupEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    const event = toRadioGroupEvent<ID>(input, this.#options.orientation);
    if (event === null) return false;
    return this.handleEvent(event);
  }
}

function radioGroupIntent<ID extends StableID>(event: RadioGroupEvent<ID>): 'navigate' | 'mutate' {
  return event === 'check' || (typeof event === 'object' && event.type === 'check')
    ? 'mutate'
    : 'navigate';
}

function selected<ID extends StableID>(value: ID | null): readonly ID[] {
  return value === null ? [] : [value];
}

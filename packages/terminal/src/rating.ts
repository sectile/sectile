import {
  createFacadeConnection,
  createSemanticController,
  type FacadeConnection,
  type SemanticController,
} from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applyRatingEvent,
  type RatingCommand,
  type RatingEvent,
  type RatingPolicies,
  type RatingState,
} from '@sectile/core/rating';
import { tryCreateRadioGroupState } from '@sectile/core/radio-group';
import type { RadioGroupOptions } from './radio-group.js';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createDisabledItems } from './internal/disabled-items.js';

export type RatingOptions<ID extends StableID = StableID> = Omit<
  RadioGroupOptions<ID>,
  'orientation' | 'onValueChange'
> & {
  readonly clearable?: boolean;
  readonly onValueChange?: (value: ID | null) => void;
};
export type RatingValueChangeHandler<ID extends StableID = StableID> = NonNullable<
  RatingOptions<ID>['onValueChange']
>;
export interface RatingConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<RatingState<ID>>;
  syncControlledValues(values: {
    readonly value?: ID | null;
    readonly highlightedValue?: ID | null;
  }): Result<RevisionSnapshot<RatingState<ID>>>;
  handleEvent(event: RatingEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}
type RatingEffect<ID extends StableID> = { readonly type: 'focus-rating'; readonly id: ID };

export function createRating<ID extends StableID>(
  options: RatingOptions<ID>,
): FacadeConnection<RatingConnection<ID>> {
  return unwrap(tryCreateRating(options));
}
export function tryCreateRating<ID extends StableID>(
  options: RatingOptions<ID>,
): Result<FacadeConnection<RatingConnection<ID>>> {
  return createFacadeConnection(options, (normalized) => tryCreateRatingConnection(normalized));
}

function tryCreateRatingConnection<ID extends StableID>(
  options: RatingOptions<ID>,
): Result<RatingConnection<ID>> {
  const domain = tryCreateSequence(options.items);
  if (!domain.ok) return domain;
  const disabled = createDisabledItems(domain.value, options.disabledItems);
  if (!disabled.ok) return disabled;
  const suppliedEligibility = options.policies?.eligible;
  const policies: RatingPolicies<ID> = Object.freeze({
    ...options.policies,
    eligible: (id: ID) => !disabled.value.has(id) && (suppliedEligibility?.(id) ?? true),
  });
  const valueControlled = options.value !== undefined;
  const highlightControlled = options.highlightedValue !== undefined;
  const initialValue = options.value ?? options.defaultValue ?? null;
  const runtime = createSemanticController<
    RatingState<ID>, RatingEvent<ID>, RatingCommand<ID>, RatingEffect<ID>
  >({
    interaction: options,
    interactionIntent: ratingIntent,
    initial: tryCreateRadioGroupState(domain.value, {
      selected: initialValue === null ? [] : [initialValue],
      current: options.highlightedValue !== undefined
        ? options.highlightedValue
        : options.defaultHighlightedValue ?? initialValue,
    }),
    reducer: (state, event) => applyRatingEvent(domain.value, state, event, policies),
    reconcile: (previous, proposed) => tryCreateRadioGroupState(domain.value, {
      selected: valueControlled || options.readOnly === true
        ? previous.selection.selected
        : proposed.selection.selected,
      anchor: valueControlled || options.readOnly === true
        ? previous.selection.anchor
        : proposed.selection.anchor,
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
    toEffect: (command) => Object.freeze({ type: 'focus-rating', id: command.id }),
  });
  if (!runtime.ok) return runtime;
  return {
    ok: true,
    value: new TerminalRatingConnection(
      options,
      domain.value,
      runtime.value,
      valueControlled,
      highlightControlled,
    ),
  };
}

class TerminalRatingConnection<ID extends StableID> implements RatingConnection<ID> {
  readonly options: RatingOptions<ID>;
  readonly domain: Sequence<ID>;
  readonly runtime: SemanticController<RatingState<ID>, RatingEvent<ID>, RatingEffect<ID>>;
  readonly valueControlled: boolean;
  readonly highlightControlled: boolean;

  public constructor(
    options: RatingOptions<ID>,
    domain: Sequence<ID>,
    runtime: SemanticController<RatingState<ID>, RatingEvent<ID>, RatingEffect<ID>>,
    valueControlled: boolean,
    highlightControlled: boolean,
  ) {
    this.options = options;
    this.domain = domain;
    this.runtime = runtime;
    this.valueControlled = valueControlled;
    this.highlightControlled = highlightControlled;
  }

  public getSnapshot(): RevisionSnapshot<RatingState<ID>> { return this.runtime.getSnapshot(); }

  public syncControlledValues(values: {
    readonly value?: ID | null;
    readonly highlightedValue?: ID | null;
  }): Result<RevisionSnapshot<RatingState<ID>>> {
    if (this.valueControlled !== (values.value !== undefined)
      || this.highlightControlled !== (values.highlightedValue !== undefined)) {
      return controlledShapeError();
    }
    const current = this.runtime.getSnapshot().state;
    const nextValue = this.valueControlled ? values.value ?? null : current.selection.selected[0] ?? null;
    const result = this.runtime.replace(tryCreateRadioGroupState(this.domain, {
      selected: nextValue === null ? [] : [nextValue],
      anchor: this.valueControlled && current.selection.selected[0] !== nextValue
        ? nextValue
        : current.selection.anchor,
      current: this.highlightControlled ? values.highlightedValue ?? null : current.cursor.current,
    }));
    if (result.ok) this.options.onUpdate?.();
    return result;
  }

  public handleEvent(event: RatingEvent<ID>): boolean {
    if (event === 'clear' && this.options.clearable !== true) return false;
    const result = this.runtime.handle(event);
    if (result.ok) this.options.onUpdate?.();
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    const event = ratingKeyboardEvent<ID>(input);
    return event === null ? false : this.handleEvent(event);
  }
}

function ratingIntent<ID extends StableID>(event: RatingEvent<ID>): 'navigate' | 'mutate' {
  return typeof event === 'object' && event.type === 'focus' ? 'navigate' : 'mutate';
}

function ratingKeyboardEvent<ID extends StableID>(input: TerminalKeyboardInput): RatingEvent<ID> | null {
  if (input.key === 'home') return 'minimum';
  if (input.key === 'end') return 'maximum';
  if (input.key === 'enter' || input.key === 'space') return 'set';
  if (input.key === 'right' || input.key === 'down') return 'increase';
  if (input.key === 'left' || input.key === 'up') return 'decrease';
  return null;
}

function controlledShapeError<T>(): Result<T> {
  return {
    ok: false,
    error: {
      class: 'construction',
      code: 'controlled-shape-mismatch',
      message: 'Controlled rating values must preserve their construction-time shape.',
    },
  };
}

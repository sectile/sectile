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
import {
  getRadioGroupItemAttributes,
  getRadioGroupRootAttributes,
  type RadioGroupOptions,
} from './radio-group.js';
import { createDisabledItems } from './internal/disabled-items.js';
import { findDelegatedID } from './internal/delegated-event.js';
import { horizontalArrow } from './internal/direction.js';

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
  setItemAttributes(element: HTMLElement, id: ID, disabled?: boolean): void;
  handleEvent(event: RatingEvent<ID>): boolean;
  disconnect(): void;
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
  const initial = tryCreateRadioGroupState(domain.value, {
    selected: initialValue === null ? [] : [initialValue],
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? initialValue,
  });
  const runtime = createSemanticController<
    RatingState<ID>, RatingEvent<ID>, RatingCommand<ID>, RatingEffect<ID>
  >({
    interaction: options,
    interactionIntent: ratingIntent,
    initial,
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
    value: new DOMRatingConnection(
      options,
      domain.value,
      runtime.value,
      disabled.value,
      valueControlled,
      highlightControlled,
    ),
  };
}

class DOMRatingConnection<ID extends StableID> implements RatingConnection<ID> {
  readonly options: RatingOptions<ID>;
  readonly domain: Sequence<ID>;
  readonly runtime: SemanticController<RatingState<ID>, RatingEvent<ID>, RatingEffect<ID>>;
  readonly disabledItems: ReadonlySet<ID>;
  readonly valueControlled: boolean;
  readonly highlightControlled: boolean;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #click: (event: MouseEvent) => void;
  #active = true;

  public constructor(
    options: RatingOptions<ID>,
    domain: Sequence<ID>,
    runtime: SemanticController<RatingState<ID>, RatingEvent<ID>, RatingEffect<ID>>,
    disabledItems: ReadonlySet<ID>,
    valueControlled: boolean,
    highlightControlled: boolean,
  ) {
    this.options = options;
    this.domain = domain;
    this.runtime = runtime;
    this.disabledItems = disabledItems;
    this.valueControlled = valueControlled;
    this.highlightControlled = highlightControlled;
    applyAttributes(options.root, getRadioGroupRootAttributes({ ...options, orientation: 'horizontal' }));
    this.#keydown = (event): void => {
      const semantic = ratingKeyboardEvent<ID>(event, options.direction);
      if (semantic === null) return;
      event.preventDefault();
      this.handleEvent(semantic);
    };
    this.#click = (event): void => {
      const id = findDelegatedID(event.target, options.root, 'radioGroupId');
      if (id !== null) this.handleEvent({ type: 'set', id: id as ID });
    };
    options.root.addEventListener('keydown', this.#keydown);
    options.root.addEventListener('click', this.#click);
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

  public setItemAttributes(element: HTMLElement, id: ID, disabled = false): void {
    const state = this.runtime.getSnapshot().state;
    const unavailable = this.options.disabled === true || disabled || this.disabledItems.has(id);
    element.dataset['radioGroupId'] = String(id);
    applyAttributes(element, {
      ...getRadioGroupItemAttributes({
        id,
        checked: state.selection.has(id),
        highlighted: state.cursor.current === id,
        disabled: unavailable,
      }),
      'aria-label': `${String(id)} rating`,
    });
  }

  public handleEvent(event: RatingEvent<ID>): boolean {
    if (event === 'clear' && this.options.clearable !== true) return false;
    const result = this.runtime.handle(event);
    if (result.ok) queueMicrotask(() => {
      if (!this.#active) return;
      for (const element of this.options.root.querySelectorAll<HTMLElement>('[data-radio-group-id]')) {
        if (element.dataset['radioGroupId'] === result.snapshot.state.cursor.current) element.focus();
      }
    });
    if (result.ok) this.options.onUpdate?.();
    return result.ok;
  }

  public disconnect(): void {
    this.#active = false;
    this.options.root.removeEventListener('keydown', this.#keydown);
    this.options.root.removeEventListener('click', this.#click);
  }
}

function ratingIntent<ID extends StableID>(event: RatingEvent<ID>): 'navigate' | 'mutate' {
  return typeof event === 'object' && event.type === 'focus' ? 'navigate' : 'mutate';
}

function ratingKeyboardEvent<ID extends StableID>(
  event: KeyboardEvent,
  direction: RatingOptions<ID>['direction'],
): RatingEvent<ID> | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.key === 'Home') return 'minimum';
  if (event.key === 'End') return 'maximum';
  if (event.key === 'Enter' || event.key === ' ') return 'set';
  if (event.key === 'ArrowDown') return 'increase';
  if (event.key === 'ArrowUp') return 'decrease';
  const horizontal = horizontalArrow(event.key, direction);
  return horizontal === 'next' ? 'increase' : horizontal === 'previous' ? 'decrease' : null;
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

function applyAttributes(
  element: HTMLElement,
  attributes: Readonly<Record<string, string | number | boolean | undefined>>,
): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'tabindex') {
      element.tabIndex = Number(value ?? -1);
      continue;
    }
    if (name === 'disabled' && 'disabled' in element) {
      (element as HTMLButtonElement).disabled = value === true;
      continue;
    }
    if (value === undefined || value === false) element.removeAttribute(name);
    else element.setAttribute(name, value === true ? '' : String(value));
  }
}

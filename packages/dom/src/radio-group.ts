import type { Result, StableID } from '@sectile/primitives';
import { createSequence, type Sequence } from '@sectile/primitives/sequence';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import {
  applyRadioGroupEvent,
  createRadioGroupState,
  type RadioGroupCommand,
  type RadioGroupEvent,
  type RadioGroupPolicies,
  type RadioGroupState,
} from '@sectile/primitives/radio-group';
import { findDelegatedID } from './internal/delegated-event.js';
import { createDisabledItems } from './internal/disabled-items.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import type { KeyboardInput } from './tabs.js';

export type RadioGroupEffect<ID extends StableID = StableID> =
  { readonly type: 'focus-radio'; readonly id: ID };

export interface RadioGroupOptions<ID extends StableID = StableID> {
  readonly root: HTMLElement;
  readonly items: readonly ID[];
  readonly policies?: RadioGroupPolicies<ID>;
  readonly disabledItems?: readonly ID[];
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly label?: string;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onUpdate?: () => void;
}

export interface RadioGroupConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<RadioGroupState<ID>>;
  syncControlledValues(values: {
    readonly value?: ID | null;
    readonly highlightedValue?: ID | null;
  }): Result<RevisionSnapshot<RadioGroupState<ID>>>;
  setItemAttributes(element: HTMLElement, id: ID, disabled?: boolean): void;
  handleEvent(event: RadioGroupEvent<ID>): boolean;
  disconnect(): void;
}

export function createRadioGroup<ID extends StableID>(
  options: RadioGroupOptions<ID>,
): Result<RadioGroupConnection<ID>> {
  const domain = createSequence(options.items);
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
    initial: createRadioGroupState(domain.value, {
      selected: selected(options.value ?? options.defaultValue ?? null),
      current: options.highlightedValue !== undefined
        ? options.highlightedValue
        : options.defaultHighlightedValue ?? options.value ?? options.defaultValue ?? null,
    }),
    reducer: (state, event) => applyRadioGroupEvent(domain.value, state, event, policies),
    reconcile: (previous, proposed) => createRadioGroupState(domain.value, {
      selected: valueControlled ? previous.selection.selected : proposed.selection.selected,
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
    toEffect: (command) => Object.freeze({ type: 'focus-radio', id: command.id }),
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMRadioGroupConnection(options, domain.value, runtime.value, disabled.value) };
}

export function toRadioGroupEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
  orientation: 'horizontal' | 'vertical' = 'vertical',
): RadioGroupEvent<ID> | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.key === 'Home') return 'first';
  if (input.key === 'End') return 'last';
  if (input.key === ' ' || input.key === 'Enter') return 'check';
  if (orientation === 'horizontal' && input.key === 'ArrowRight') return 'next';
  if (orientation === 'horizontal' && input.key === 'ArrowLeft') return 'previous';
  if (orientation === 'vertical' && input.key === 'ArrowDown') return 'next';
  if (orientation === 'vertical' && input.key === 'ArrowUp') return 'previous';
  return null;
}

class DOMRadioGroupConnection<ID extends StableID> implements RadioGroupConnection<ID> {
  readonly #options: RadioGroupOptions<ID>;
  readonly #domain: Sequence<ID>;
  readonly #runtime: SemanticController<RadioGroupState<ID>, RadioGroupEvent<ID>, RadioGroupEffect<ID>>;
  readonly #valueControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #disabledItems: ReadonlySet<ID>;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #click: (event: MouseEvent) => void;

  public constructor(
    options: RadioGroupOptions<ID>, domain: Sequence<ID>,
    runtime: SemanticController<RadioGroupState<ID>, RadioGroupEvent<ID>, RadioGroupEffect<ID>>,
    disabledItems: ReadonlySet<ID>,
  ) {
    this.#options = options;
    this.#domain = domain;
    this.#runtime = runtime;
    this.#valueControlled = options.value !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#disabledItems = disabledItems;
    options.root.setAttribute('role', 'radiogroup');
    options.root.setAttribute('aria-orientation', options.orientation ?? 'vertical');
    if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
    this.#keydown = (event): void => {
      const semantic = toRadioGroupEvent<ID>(event, options.orientation);
      if (semantic === null) return;
      event.preventDefault();
      this.handleEvent(semantic);
    };
    this.#click = (event): void => {
      const id = findDelegatedID(event.target, options.root, 'radioGroupId');
      if (id !== null) this.handleEvent({ type: 'check', id: id as ID });
    };
    options.root.addEventListener('keydown', this.#keydown);
    options.root.addEventListener('click', this.#click);
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
    const result = this.#runtime.replace(createRadioGroupState(this.#domain, {
      selected: this.#valueControlled ? selected(values.value ?? null) : state.selection.selected,
      current: this.#highlightControlled ? (values.highlightedValue ?? null) : state.cursor.current,
    }));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public setItemAttributes(element: HTMLElement, id: ID, disabled = false): void {
    const state = this.#runtime.getSnapshot().state;
    element.dataset['radioGroupId'] = id;
    element.setAttribute('role', 'radio');
    element.setAttribute('aria-checked', String(state.selection.has(id)));
    element.tabIndex = state.cursor.current === id ? 0 : -1;
    if (disabled || this.#disabledItems.has(id)) element.setAttribute('aria-disabled', 'true');
    else element.removeAttribute('aria-disabled');
  }

  public handleEvent(event: RadioGroupEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) queueMicrotask(() => {
      for (const element of this.#options.root.querySelectorAll<HTMLElement>('[data-radio-group-id]')) {
        if (element.dataset['radioGroupId'] === result.snapshot.state.cursor.current) element.focus();
      }
    });
    this.#options.onUpdate?.();
    return true;
  }

  public disconnect(): void {
    this.#options.root.removeEventListener('keydown', this.#keydown);
    this.#options.root.removeEventListener('click', this.#click);
  }
}

function selected<ID extends StableID>(value: ID | null): readonly ID[] {
  return value === null ? [] : [value];
}

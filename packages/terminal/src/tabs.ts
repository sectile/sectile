import type { Result, StableID } from '@sectile/primitives';
import { createSequence, type Sequence } from '@sectile/primitives/sequence';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import {
  applyTabsEvent,
  createTabsState,
  type TabsCommand,
  type TabsEvent,
  type TabsPolicies,
  type TabsState,
} from '@sectile/primitives/tabs';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export type KeyboardInput = TerminalKeyboardInput;
export type TabsEffect<ID extends StableID = StableID> =
  | { readonly type: 'move-tab-highlight'; readonly id: ID }
  | { readonly type: 'activate-tab'; readonly id: ID };

export interface TabsOptions<ID extends StableID = StableID> {
  readonly items: readonly ID[];
  readonly policies?: TabsPolicies<ID>;
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onActivate?: (id: ID) => void;
  readonly onUpdate?: () => void;
}

export interface TabsConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<TabsState<ID>>;
  syncControlledValues(values: {
    readonly value?: ID | null;
    readonly highlightedValue?: ID | null;
  }): Result<RevisionSnapshot<TabsState<ID>>>;
  handleEvent(event: TabsEvent<ID>): boolean;
  handleKeyboardInput(input: KeyboardInput): boolean;
}

export function createTabs<ID extends StableID>(options: TabsOptions<ID>): Result<TabsConnection<ID>> {
  const domain = createSequence(options.items);
  if (!domain.ok) return domain;
  const valueControlled = options.value !== undefined;
  const highlightControlled = options.highlightedValue !== undefined;
  const runtime = createSemanticController<TabsState<ID>, TabsEvent<ID>, TabsCommand<ID>, TabsEffect<ID>>({
    initial: createTabsState(domain.value, {
      selected: selected(options.value ?? options.defaultValue ?? null),
      current: options.highlightedValue !== undefined
        ? options.highlightedValue
        : options.defaultHighlightedValue ?? null,
    }),
    reducer: (state, event) => applyTabsEvent(domain.value, state, event, options.policies),
    reconcile: (previous, proposed) => createTabsState(domain.value, {
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
    toEffect: toTabsEffect,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new TerminalTabsConnection(
    options,
    domain.value,
    runtime.value,
    valueControlled,
    highlightControlled,
  ) };
}

export function toTabsEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): TabsEvent<ID> | null {
  if (input.key === 'home') return 'first';
  if (input.key === 'end') return 'last';
  if (input.key === 'enter' || input.key === 'space') return 'activate';
  if (orientation === 'horizontal' && input.key === 'right') return 'next';
  if (orientation === 'horizontal' && input.key === 'left') return 'previous';
  if (orientation === 'vertical' && input.key === 'down') return 'next';
  if (orientation === 'vertical' && input.key === 'up') return 'previous';
  return null;
}

export function toTabsEffect<ID extends StableID>(command: TabsCommand<ID>): TabsEffect<ID> {
  return command.type === 'focus'
    ? Object.freeze({ type: 'move-tab-highlight', id: command.id })
    : Object.freeze({ type: 'activate-tab', id: command.id });
}

class TerminalTabsConnection<ID extends StableID> implements TabsConnection<ID> {
  readonly #options: TabsOptions<ID>;
  readonly #domain: Sequence<ID>;
  readonly #runtime: SemanticController<TabsState<ID>, TabsEvent<ID>, TabsEffect<ID>>;
  readonly #valueControlled: boolean;
  readonly #highlightControlled: boolean;

  public constructor(
    options: TabsOptions<ID>, domain: Sequence<ID>,
    runtime: SemanticController<TabsState<ID>, TabsEvent<ID>, TabsEffect<ID>>,
    valueControlled: boolean, highlightControlled: boolean,
  ) {
    this.#options = options;
    this.#domain = domain;
    this.#runtime = runtime;
    this.#valueControlled = valueControlled;
    this.#highlightControlled = highlightControlled;
  }

  public getSnapshot(): RevisionSnapshot<TabsState<ID>> { return this.#runtime.getSnapshot(); }

  public syncControlledValues(values: {
    readonly value?: ID | null;
    readonly highlightedValue?: ID | null;
  }): Result<RevisionSnapshot<TabsState<ID>>> {
    if (this.#valueControlled !== (values.value !== undefined)
      || this.#highlightControlled !== (values.highlightedValue !== undefined)) {
      return { ok: false, error: {
        class: 'construction', code: 'controlled-shape-mismatch',
        message: 'Controlled tabs values must preserve their construction-time shape.',
      } };
    }
    const state = this.#runtime.getSnapshot().state;
    const result = this.#runtime.replace(createTabsState(this.#domain, {
      selected: this.#valueControlled ? selected(values.value ?? null) : state.selection.selected,
      current: this.#highlightControlled ? (values.highlightedValue ?? null) : state.cursor.current,
    }));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public handleEvent(event: TabsEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) for (const effect of result.commands) {
      if (effect.type === 'activate-tab') this.#options.onActivate?.(effect.id);
    }
    this.#options.onUpdate?.();
    return true;
  }

  public handleKeyboardInput(input: KeyboardInput): boolean {
    const event = toTabsEvent<ID>(input, this.#options.orientation);
    if (event === null) return false;
    return this.handleEvent(event);
  }
}

function selected<ID extends StableID>(value: ID | null): readonly ID[] {
  return value === null ? [] : [value];
}

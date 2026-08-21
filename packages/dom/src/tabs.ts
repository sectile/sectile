import type { Result, StableID } from '@sectile/primitives';
import { createSequence, type Sequence } from '@sectile/primitives/sequence';
import type { RevisionResult, RevisionSnapshot } from '@sectile/primitives/revision';
import {
  applyTabsEvent,
  createTabsState,
  type TabsCommand,
  type TabsEvent,
  type TabsPolicies,
  type TabsState,
} from '@sectile/primitives/tabs';
import { findDelegatedID } from './internal/delegated-event.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface KeyboardInput {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

export type TabsEffect<ID extends StableID = StableID> =
  | { readonly type: 'focus-tab'; readonly id: ID }
  | { readonly type: 'activate-tab'; readonly id: ID };

export interface TabsOptions<ID extends StableID = StableID> {
  readonly root: HTMLElement;
  readonly items: readonly ID[];
  readonly policies?: TabsPolicies<ID>;
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly label?: string;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onActivate?: (id: ID) => void;
  readonly onUpdate?: () => void;
}

export interface TabsItemAttributes<ID extends StableID = StableID> {
  readonly id: ID;
  readonly panelID?: string;
  readonly disabled?: boolean;
}

export interface TabsConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<TabsState<ID>>;
  syncControlledValues(values: {
    readonly value?: ID | null;
    readonly highlightedValue?: ID | null;
  }): Result<RevisionSnapshot<TabsState<ID>>>;
  setItemAttributes(element: HTMLElement, attributes: TabsItemAttributes<ID>): void;
  setPanelAttributes(element: HTMLElement, id: ID, tabID?: string): void;
  handleEvent(event: TabsEvent<ID>): boolean;
  disconnect(): void;
}

export function createTabs<ID extends StableID>(
  options: TabsOptions<ID>,
): Result<TabsConnection<ID>> {
  const domain = createSequence(options.items);
  if (!domain.ok) return domain;
  const valueControlled = options.value !== undefined;
  const highlightControlled = options.highlightedValue !== undefined;
  const initial = createTabsState(domain.value, {
    selected: selected(options.value ?? options.defaultValue ?? null),
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? null,
  });
  const runtime = createSemanticController<
    TabsState<ID>,
    TabsEvent<ID>,
    TabsCommand<ID>,
    TabsEffect<ID>
  >({
    initial,
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
  return {
    ok: true,
    value: new DOMTabsConnection(
      options,
      domain.value,
      runtime.value,
      valueControlled,
      highlightControlled,
    ),
  };
}

export function toTabsEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): TabsEvent<ID> | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.key === 'Home') return 'first';
  if (input.key === 'End') return 'last';
  if (input.key === 'Enter' || input.key === ' ') return 'activate';
  if (orientation === 'horizontal' && input.key === 'ArrowRight') return 'next';
  if (orientation === 'horizontal' && input.key === 'ArrowLeft') return 'previous';
  if (orientation === 'vertical' && input.key === 'ArrowDown') return 'next';
  if (orientation === 'vertical' && input.key === 'ArrowUp') return 'previous';
  return null;
}

export function toTabsEffect<ID extends StableID>(command: TabsCommand<ID>): TabsEffect<ID> {
  return command.type === 'focus'
    ? Object.freeze({ type: 'focus-tab', id: command.id })
    : Object.freeze({ type: 'activate-tab', id: command.id });
}

class DOMTabsConnection<ID extends StableID> implements TabsConnection<ID> {
  readonly #options: TabsOptions<ID>;
  readonly #domain: Sequence<ID>;
  readonly #runtime: SemanticController<TabsState<ID>, TabsEvent<ID>, TabsEffect<ID>>;
  readonly #valueControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #click: (event: MouseEvent) => void;

  public constructor(
    options: TabsOptions<ID>,
    domain: Sequence<ID>,
    runtime: SemanticController<TabsState<ID>, TabsEvent<ID>, TabsEffect<ID>>,
    valueControlled: boolean,
    highlightControlled: boolean,
  ) {
    this.#options = options;
    this.#domain = domain;
    this.#runtime = runtime;
    this.#valueControlled = valueControlled;
    this.#highlightControlled = highlightControlled;
    options.root.setAttribute('role', 'tablist');
    options.root.setAttribute('aria-orientation', options.orientation ?? 'horizontal');
    if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
    this.#keydown = (event): void => {
      const semantic = toTabsEvent<ID>(event, options.orientation);
      if (semantic === null) return;
      event.preventDefault();
      this.handleEvent(semantic);
    };
    this.#click = (event): void => {
      const id = findDelegatedID(event.target, options.root, 'tabsId');
      if (id !== null) this.handleEvent({ type: 'activate', id: id as ID });
    };
    options.root.addEventListener('keydown', this.#keydown);
    options.root.addEventListener('click', this.#click);
  }

  public getSnapshot(): RevisionSnapshot<TabsState<ID>> { return this.#runtime.getSnapshot(); }

  public syncControlledValues(values: {
    readonly value?: ID | null;
    readonly highlightedValue?: ID | null;
  }): Result<RevisionSnapshot<TabsState<ID>>> {
    if (this.#valueControlled !== (values.value !== undefined)
      || this.#highlightControlled !== (values.highlightedValue !== undefined)) {
      return controlledError('tabs');
    }
    const current = this.#runtime.getSnapshot().state;
    const result = this.#runtime.replace(createTabsState(this.#domain, {
      selected: this.#valueControlled ? selected(values.value ?? null) : current.selection.selected,
      current: this.#highlightControlled
        ? (values.highlightedValue ?? null)
        : current.cursor.current,
    }));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public setItemAttributes(element: HTMLElement, attributes: TabsItemAttributes<ID>): void {
    const state = this.#runtime.getSnapshot().state;
    const active = state.selection.has(attributes.id);
    element.dataset['tabsId'] = String(attributes.id);
    element.setAttribute('role', 'tab');
    element.setAttribute('aria-selected', String(active));
    element.tabIndex = state.cursor.current === attributes.id ? 0 : -1;
    if (attributes.panelID !== undefined) element.setAttribute('aria-controls', attributes.panelID);
    if (attributes.disabled) element.setAttribute('aria-disabled', 'true');
    else element.removeAttribute('aria-disabled');
  }

  public setPanelAttributes(element: HTMLElement, id: ID, tabID?: string): void {
    element.setAttribute('role', 'tabpanel');
    element.hidden = !this.#runtime.getSnapshot().state.selection.has(id);
    if (tabID !== undefined) element.setAttribute('aria-labelledby', tabID);
  }

  public handleEvent(event: TabsEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) {
      for (const effect of result.commands) {
        if (effect.type === 'activate-tab') this.#options.onActivate?.(effect.id);
      }
      queueMicrotask(() => focusData(this.#options.root, 'tabsId', result.snapshot.state.cursor.current));
    }
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

function focusData(root: HTMLElement, key: string, id: StableID | null): void {
  if (id === null) return;
  for (const element of root.querySelectorAll<HTMLElement>(`[data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}]`)) {
    if (element.dataset[key] === id) element.focus();
  }
}

function controlledError<State>(name: string): Result<RevisionSnapshot<State>> {
  return { ok: false, error: {
    class: 'construction',
    code: 'controlled-shape-mismatch',
    message: `Controlled ${name} values must preserve their construction-time shape.`,
  } };
}

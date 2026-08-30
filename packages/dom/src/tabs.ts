import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import type { RevisionResult, RevisionSnapshot } from '@sectile/core/revision';
import {
  applyTabsEvent,
  tryCreateTabsState,
  type TabsCommand,
  type TabsEvent,
  type TabsPolicies,
  type TabsState,
} from '@sectile/core/tabs';
import { findDelegatedStableID } from './internal/delegated-event.js';
import { stableIDToken } from './internal/stable-id-token.js';
import { createDisabledItems } from './internal/disabled-items.js';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { horizontalArrow, type ReadingDirection } from './internal/direction.js';

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
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly items: readonly ID[];
  readonly policies?: TabsPolicies<ID>;
  readonly disabledItems?: readonly ID[];
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly direction?: ReadingDirection;
  readonly label?: string;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onActivate?: (id: ID) => void;
  readonly onUpdate?: () => void;
}

export type TabsValueChangeHandler<ID extends StableID = StableID> = NonNullable<TabsOptions<ID>['onValueChange']>;
export type TabsHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<TabsOptions<ID>['onHighlightedValueChange']>;
export type TabsActivateHandler<ID extends StableID = StableID> = NonNullable<TabsOptions<ID>['onActivate']>;
export type TabsUpdateHandler<ID extends StableID = StableID> = NonNullable<TabsOptions<ID>['onUpdate']>;

export interface TabsListAttributesOptions {
  readonly orientation?: 'horizontal' | 'vertical';
  readonly direction?: ReadingDirection;
  readonly label?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}

export interface TabsTriggerAttributesOptions<ID extends StableID = StableID> {
  readonly id: ID;
  readonly selected: boolean;
  readonly highlighted: boolean;
  readonly disabled?: boolean;
  readonly triggerID?: string;
  readonly panelID?: string;
}

export interface TabsContentAttributesOptions {
  readonly selected: boolean;
  readonly contentID?: string;
  readonly triggerID?: string;
}

export function getTabsRootAttributes(): Readonly<Record<string, string>> {
  return Object.freeze({ 'data-scope': 'tabs', 'data-part': 'root' });
}

export function getTabsListAttributes(options: TabsListAttributesOptions = {}): Readonly<Record<string, string | undefined>> {
  return Object.freeze({
    role: 'tablist',
    'aria-orientation': options.orientation ?? 'horizontal',
    dir: options.direction,
    'aria-label': options.label,
    'aria-disabled': options.disabled === true ? 'true' : undefined,
    'aria-readonly': options.readOnly === true ? 'true' : undefined,
    'data-scope': 'tabs',
    'data-part': 'list',
    'data-disabled': options.disabled === true ? '' : undefined,
    'data-readonly': options.readOnly === true ? '' : undefined,
  });
}

export function getTabsTriggerAttributes<ID extends StableID>(options: TabsTriggerAttributesOptions<ID>): Readonly<Record<string, string | number | boolean | undefined>> {
  return Object.freeze({
    id: options.triggerID,
    role: 'tab',
    type: 'button',
    tabindex: options.disabled === true ? -1 : options.highlighted ? 0 : -1,
    'aria-selected': String(options.selected),
    'aria-controls': options.panelID,
    'aria-disabled': options.disabled === true ? 'true' : undefined,
    disabled: options.disabled === true ? true : undefined,
    'data-tabs-id': stableIDToken(options.id),
    'data-scope': 'tabs',
    'data-part': 'trigger',
    'data-state': options.selected ? 'active' : 'inactive',
    'data-highlighted': options.highlighted ? '' : undefined,
    'data-disabled': options.disabled === true ? '' : undefined,
  });
}

export function getTabsContentAttributes(options: TabsContentAttributesOptions): Readonly<Record<string, string | boolean | undefined>> {
  return Object.freeze({
    id: options.contentID,
    role: 'tabpanel',
    hidden: !options.selected,
    'aria-labelledby': options.triggerID,
    'data-scope': 'tabs',
    'data-part': 'content',
    'data-state': options.selected ? 'active' : 'inactive',
  });
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
): FacadeConnection<TabsConnection<ID>> {
  return unwrap(tryCreateTabs(options));
}

export function tryCreateTabs<ID extends StableID>(
  options: TabsOptions<ID>,
): Result<FacadeConnection<TabsConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateTabsConnection(options));
}

function tryCreateTabsConnection<ID extends StableID>(
  options: TabsOptions<ID>,
): Result<TabsConnection<ID>> {
  const domain = tryCreateSequence(options.items);
  if (!domain.ok) return domain;
  const disabled = createDisabledItems(domain.value, options.disabledItems);
  if (!disabled.ok) return disabled;
  const suppliedEligibility = options.policies?.eligible;
  const policies: TabsPolicies<ID> = Object.freeze({
    ...options.policies,
    eligible: (id: ID) => !disabled.value.has(id) && (suppliedEligibility?.(id) ?? true),
  });
  const valueControlled = options.value !== undefined;
  const highlightControlled = options.highlightedValue !== undefined;
  const initial = tryCreateTabsState(domain.value, {
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
    interaction: options,
    interactionIntent: tabsIntent,
    initial,
    reducer: (state, event) => applyTabsEvent(domain.value, state, event, policies),
    reconcile: (previous, proposed) => tryCreateTabsState(domain.value, {
      selected: valueControlled || options.readOnly === true ? previous.selection.selected : proposed.selection.selected,
      anchor: valueControlled || options.readOnly === true ? previous.selection.anchor : proposed.selection.anchor,
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
      disabled.value,
    ),
  };
}

export function toTabsEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
  direction: ReadingDirection = 'ltr',
): TabsEvent<ID> | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.key === 'Home') return 'first';
  if (input.key === 'End') return 'last';
  if (input.key === 'Enter' || input.key === ' ') return 'activate';
  if (orientation === 'horizontal') {
    const horizontal = horizontalArrow(input.key, direction);
    if (horizontal !== null) return horizontal;
  }
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
  readonly #disabledItems: ReadonlySet<ID>;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #click: (event: MouseEvent) => void;
  #active = true;

  public constructor(
    options: TabsOptions<ID>,
    domain: Sequence<ID>,
    runtime: SemanticController<TabsState<ID>, TabsEvent<ID>, TabsEffect<ID>>,
    valueControlled: boolean,
    highlightControlled: boolean,
    disabledItems: ReadonlySet<ID>,
  ) {
    this.#options = options;
    this.#domain = domain;
    this.#runtime = runtime;
    this.#valueControlled = valueControlled;
    this.#highlightControlled = highlightControlled;
    this.#disabledItems = disabledItems;
    applyAttributes(options.root, getTabsListAttributes(options));
    this.#keydown = (event): void => {
      const semantic = toTabsEvent<ID>(event, options.orientation, options.direction);
      if (semantic === null) return;
      event.preventDefault();
      this.handleEvent(semantic);
    };
    this.#click = (event): void => {
      const id = findDelegatedStableID(event.target, options.root, 'tabsId');
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
    const nextSelected = this.#valueControlled ? selected(values.value ?? null) : current.selection.selected;
    const nextID = nextSelected[0] ?? null;
    const result = this.#runtime.replace(tryCreateTabsState(this.#domain, {
      selected: nextSelected,
      anchor: this.#valueControlled && current.selection.selected[0] !== nextID
        ? nextID
        : current.selection.anchor,
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
    const disabled = this.#options.disabled === true || attributes.disabled === true || this.#disabledItems.has(attributes.id);
    element.dataset['tabsId'] = stableIDToken(attributes.id);
    applyAttributes(element, getTabsTriggerAttributes({
      id: attributes.id,
      selected: active,
      highlighted: state.cursor.current === attributes.id,
      disabled,
      ...(attributes.panelID === undefined ? {} : { panelID: attributes.panelID }),
    }));
  }

  public setPanelAttributes(element: HTMLElement, id: ID, tabID?: string): void {
    applyAttributes(element, getTabsContentAttributes({
      selected: this.#runtime.getSnapshot().state.selection.has(id),
      ...(tabID === undefined ? {} : { triggerID: tabID }),
    }));
  }

  public handleEvent(event: TabsEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) {
      for (const effect of result.commands) {
        if (effect.type === 'activate-tab') this.#options.onActivate?.(effect.id);
      }
      queueMicrotask(() => { if (this.#active) focusData(this.#options.root, 'tabsId', result.snapshot.state.cursor.current); });
    }
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }

  public disconnect(): void {
    this.#active = false;
    this.#options.root.removeEventListener('keydown', this.#keydown);
    this.#options.root.removeEventListener('click', this.#click);
  }
}

function tabsIntent<ID extends StableID>(event: TabsEvent<ID>): 'navigate' | 'mutate' {
  return event === 'activate' || (typeof event === 'object' && event.type === 'activate') ? 'mutate' : 'navigate';
}

function applyAttributes(element: HTMLElement, attributes: Readonly<Record<string, string | number | boolean | undefined>>): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'tabindex') { element.tabIndex = Number(value ?? -1); continue; }
    if (name === 'hidden') { element.hidden = value === true; continue; }
    if (name === 'disabled' && 'disabled' in element) { (element as HTMLButtonElement).disabled = value === true; continue; }
    if (value === undefined || value === false) element.removeAttribute(name);
    else element.setAttribute(name, value === true ? '' : String(value));
  }
}

function selected<ID extends StableID>(value: ID | null): readonly ID[] {
  return value === null ? [] : [value];
}

function focusData(root: HTMLElement, key: string, id: StableID | null): void {
  if (id === null) return;
  for (const element of root.querySelectorAll<HTMLElement>(`[data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}]`)) {
    if (element.dataset[key] === stableIDToken(id)) element.focus();
  }
}

function controlledError<State>(name: string): Result<RevisionSnapshot<State>> {
  return { ok: false, error: {
    class: 'construction',
    code: 'controlled-shape-mismatch',
    message: `Controlled ${name} values must preserve their construction-time shape.`,
  } };
}

import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateTree, type Tree, type TreeNodeInput } from '@sectile/core/tree';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applyCascadeSelectEvent, tryCreateCascadeSelectState, getCascadeSelectColumns,
  getCascadeSelectValuePath, type CascadeSelectCommand, type CascadeSelectEvent,
  type CascadeSelectPolicies, type CascadeSelectState,
} from '@sectile/core/cascade-select';
import { findDelegatedID } from './internal/delegated-event.js';
import { setInteractionAttributes } from './internal/interaction.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export type { TreeNodeInput as CascadeSelectItemDefinition } from '@sectile/core/tree';
export type { CascadeSelectPolicies } from '@sectile/core/cascade-select';

export interface CascadeSelectOptions<ID extends StableID = StableID> {
  readonly root: HTMLElement;
  readonly trigger: HTMLButtonElement;
  readonly popup: HTMLElement;
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly disabledItems?: readonly ID[];
  readonly policies?: CascadeSelectPolicies<ID>;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly label?: string;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
}

export type CascadeSelectEffect<ID extends StableID = StableID> =
  | { readonly type: 'focus-option'; readonly id: ID }
  | { readonly type: 'select-value'; readonly id: ID }
  | { readonly type: 'close-popup' };

export interface CascadeSelectControlledValues<ID extends StableID = StableID> {
  readonly value?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly open?: boolean;
}

export interface CascadeSelectConnection<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  getSnapshot(): RevisionSnapshot<CascadeSelectState<ID>>;
  getColumns(): readonly (readonly ID[])[];
  getValuePath(): readonly ID[];
  syncControlledValues(values: CascadeSelectControlledValues<ID>): Result<RevisionSnapshot<CascadeSelectState<ID>>>;
  setColumnAttributes(element: HTMLElement, parentID?: ID | null): void;
  setItemAttributes(element: HTMLElement, id: ID, disabled?: boolean): void;
  handleEvent(event: CascadeSelectEvent<ID>): boolean;
  disconnect(): void;
}

export function createCascadeSelect<ID extends StableID>(options: CascadeSelectOptions<ID>): FacadeConnection<CascadeSelectConnection<ID>> {
  return unwrap(tryCreateCascadeSelect(options));
}

export function tryCreateCascadeSelect<ID extends StableID>(options: CascadeSelectOptions<ID>): Result<FacadeConnection<CascadeSelectConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateCascadeSelectConnection(options));
}

function tryCreateCascadeSelectConnection<ID extends StableID>(options: CascadeSelectOptions<ID>): Result<CascadeSelectConnection<ID>> {
  const tree = tryCreateTree(options.nodes); if (!tree.ok) return tree;
  const disabled = new Set(options.disabledItems ?? []);
  for (const id of disabled) if (!tree.value.has(id)) return { ok: false, error: { class: 'construction', code: 'disabled-item-outside-domain', message: 'Every disabled cascade select item must exist in the tree.', details: { id } } };
  const suppliedEligibility = options.policies?.eligible;
  const policies: CascadeSelectPolicies<ID> = { ...options.policies, eligible: (id) => !disabled.has(id) && (suppliedEligibility?.(id) ?? true) };
  const controlled = { value: options.value !== undefined, highlighted: options.highlightedValue !== undefined, open: options.open !== undefined };
  const runtime = createSemanticController<CascadeSelectState<ID>, CascadeSelectEvent<ID>, CascadeSelectCommand<ID>, CascadeSelectEffect<ID>>({
    interaction: options,
    interactionIntent: (event) => event === 'select'
      || (typeof event === 'object' && event.type === 'select' && tree.value.isLeaf(event.id) === true)
      ? 'mutate'
      : 'navigate',
    initial: tryCreateCascadeSelectState(tree.value, {
      value: options.value ?? options.defaultValue ?? null,
      highlighted: options.highlightedValue ?? options.defaultHighlightedValue ?? options.value ?? options.defaultValue ?? null,
      open: options.open ?? options.defaultOpen ?? false,
    }),
    reducer: (state, event) => applyCascadeSelectEvent(tree.value, state, event, policies),
    reconcile: (previous, proposed) => tryCreateCascadeSelectState(tree.value, {
      value: controlled.value ? previous.value : proposed.value,
      highlighted: controlled.highlighted ? previous.highlighted : proposed.highlighted,
      open: controlled.open ? previous.open : proposed.open,
      path: proposed.path,
    }),
    notify: (previous, proposed) => {
      if (previous.value !== proposed.value) options.onValueChange?.(proposed.value);
      if (previous.highlighted !== proposed.highlighted) options.onHighlightedValueChange?.(proposed.highlighted);
      if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open);
    },
    toEffect: (command) => command.type === 'focus'
      ? { type: 'focus-option', id: command.id }
      : command,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMCascadeSelectConnection(options, tree.value, runtime.value, disabled, controlled) };
}

class DOMCascadeSelectConnection<ID extends StableID> implements CascadeSelectConnection<ID> {
  readonly tree: Tree<ID>;
  readonly #options: CascadeSelectOptions<ID>;
  readonly #runtime: SemanticController<CascadeSelectState<ID>, CascadeSelectEvent<ID>, CascadeSelectEffect<ID>>;
  readonly #disabled: ReadonlySet<ID>;
  readonly #controlled: { value: boolean; highlighted: boolean; open: boolean };
  readonly #triggerClick: () => void;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #click: (event: MouseEvent) => void;

  public constructor(options: CascadeSelectOptions<ID>, tree: Tree<ID>, runtime: SemanticController<CascadeSelectState<ID>, CascadeSelectEvent<ID>, CascadeSelectEffect<ID>>, disabled: ReadonlySet<ID>, controlled: { value: boolean; highlighted: boolean; open: boolean }) {
    this.#options = options; this.tree = tree; this.#runtime = runtime; this.#disabled = disabled; this.#controlled = controlled;
    setInteractionAttributes(options.root, options, { readOnly: true });
    options.trigger.disabled = options.disabled === true;
    options.trigger.setAttribute('aria-haspopup', 'listbox');
    options.popup.setAttribute('role', 'group');
    if (options.label !== undefined) { options.trigger.setAttribute('aria-label', options.label); options.popup.setAttribute('aria-label', options.label); }
    this.#triggerClick = () => { this.handleEvent('toggle'); };
    this.#keydown = (event) => { const semantic = toCascadeSelectEvent<ID>(event); if (semantic !== null) { event.preventDefault(); this.handleEvent(semantic); } };
    this.#click = (event) => { const id = findDelegatedID(event.target, options.popup, 'cascadeSelectId') as ID | null; if (id !== null && !this.#disabled.has(id)) this.handleEvent({ type: 'select', id }); };
    options.trigger.addEventListener('click', this.#triggerClick); options.root.addEventListener('keydown', this.#keydown); options.popup.addEventListener('click', this.#click); this.#render();
  }
  public getSnapshot(): RevisionSnapshot<CascadeSelectState<ID>> { return this.#runtime.getSnapshot(); }
  public getColumns(): readonly (readonly ID[])[] { return getCascadeSelectColumns(this.tree, this.getSnapshot().state); }
  public getValuePath(): readonly ID[] { return getCascadeSelectValuePath(this.tree, this.getSnapshot().state.value); }
  public syncControlledValues(values: CascadeSelectControlledValues<ID>): Result<RevisionSnapshot<CascadeSelectState<ID>>> {
    if (this.#controlled.value !== (values.value !== undefined) || this.#controlled.highlighted !== (values.highlightedValue !== undefined) || this.#controlled.open !== (values.open !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled cascade select values must preserve their construction-time shape.' } };
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateCascadeSelectState(this.tree, { value: this.#controlled.value ? values.value ?? null : state.value, highlighted: this.#controlled.highlighted ? values.highlightedValue ?? null : state.highlighted, open: this.#controlled.open ? values.open ?? false : state.open }));
    if (result.ok) { this.#render(); this.#options.onUpdate?.(); } return result;
  }
  public setColumnAttributes(element: HTMLElement, parentID: ID | null = null): void { element.setAttribute('role', 'listbox'); element.dataset['cascadeSelectParent'] = parentID ?? ''; }
  public setItemAttributes(element: HTMLElement, id: ID, disabled = false): void {
    const state = this.getSnapshot().state; const selected = state.value === id; const highlighted = state.highlighted === id; const unavailable = disabled || this.#disabled.has(id) || this.#options.disabled === true;
    element.dataset['cascadeSelectId'] = id; element.setAttribute('role', 'option'); element.setAttribute('aria-selected', String(selected)); element.setAttribute('aria-haspopup', this.tree.isLeaf(id) === false ? 'listbox' : 'false'); element.tabIndex = unavailable ? -1 : highlighted ? 0 : -1;
    if (unavailable) element.setAttribute('aria-disabled', 'true'); else element.removeAttribute('aria-disabled');
    if (selected) element.dataset['selected'] = ''; else delete element.dataset['selected'];
    if (highlighted) element.dataset['highlighted'] = ''; else delete element.dataset['highlighted'];
  }
  public handleEvent(event: CascadeSelectEvent<ID>): boolean {
    const result = this.#runtime.handle(event); if (!result.ok) return false; this.#render();
    for (const effect of result.commands) {
      if (effect.type === 'focus-option') queueMicrotask(() => { for (const element of this.#options.popup.querySelectorAll<HTMLElement>('[data-cascade-select-id]')) if (element.dataset['cascadeSelectId'] === effect.id) element.focus(); });
      else if (effect.type === 'close-popup') this.#options.trigger.focus();
    }
    this.#options.onUpdate?.(); return true;
  }
  public disconnect(): void { this.#options.trigger.removeEventListener('click', this.#triggerClick); this.#options.root.removeEventListener('keydown', this.#keydown); this.#options.popup.removeEventListener('click', this.#click); }
  #render(): void { const state = this.getSnapshot().state; this.#options.trigger.setAttribute('aria-expanded', String(state.open)); this.#options.popup.hidden = !state.open; }
}

export function toCascadeSelectEvent<ID extends StableID>(input: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey'>): CascadeSelectEvent<ID> | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.key === 'ArrowDown') return 'next'; if (input.key === 'ArrowUp') return 'previous';
  if (input.key === 'ArrowRight') return 'right'; if (input.key === 'ArrowLeft') return 'left';
  if (input.key === 'Home') return 'first'; if (input.key === 'End') return 'last';
  if (input.key === 'Enter' || input.key === ' ') return 'select'; if (input.key === 'Escape') return 'close';
  return null;
}

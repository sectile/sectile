import { createFacadeConnection, createSemanticController, type FacadeConnection, type SemanticController } from '@sectile/core/adapter-runtime';
import { controlledFieldError as fieldError } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, SectileError, StableID } from '@sectile/core';
import type { RevisionResult, RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateTree, type Tree, type TreeNodeInput } from '@sectile/core/tree';
import {
  applyTreeViewEvent,
  tryCreateTreeViewState,
  type TreeViewCommand,
  type TreeViewEvent,
  type TreeViewPolicies,
  type TreeViewSelectionMode,
  type TreeViewState,
} from '@sectile/core/tree-view';
import { findDelegatedStableID } from './internal/delegated-event.js';
import { stableIDToken } from './internal/stable-id-token.js';
import { setInteractionAttributes } from './internal/interaction.js';

export type { TreeNodeInput } from '@sectile/core/tree';
export type { TreeViewPolicies } from '@sectile/core/tree-view';
export type { TreeViewSelectionMode } from '@sectile/core/tree-view';

export interface KeyboardInput {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

export interface TreeViewEffect<ID extends StableID = StableID> {
  readonly type: 'focus-element';
  readonly id: ID;
}

export interface TreeViewValueChangeDetails<ID extends StableID = StableID> {
  readonly value: readonly ID[];
  readonly previousValue: readonly ID[];
}

export interface TreeViewExpandedValuesChangeDetails<ID extends StableID = StableID> {
  readonly value: readonly ID[];
  readonly previousValue: readonly ID[];
}

export interface TreeViewHighlightChangeDetails<ID extends StableID = StableID> {
  readonly value: ID | null;
  readonly previousValue: ID | null;
}

export interface TreeViewControllerOptions<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  readonly selectionMode?: TreeViewSelectionMode;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly value?: readonly ID[];
  readonly defaultValue?: readonly ID[];
  readonly expandedValues?: readonly ID[];
  readonly defaultExpandedValues?: readonly ID[];
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly policies?: TreeViewPolicies<ID>;
  readonly onValueChange?: (change: TreeViewValueChangeDetails<ID>) => void;
  readonly onExpandedValuesChange?: (change: TreeViewExpandedValuesChangeDetails<ID>) => void;
  readonly onHighlightedValueChange?: (change: TreeViewHighlightChangeDetails<ID>) => void;
}

export type TreeViewControllerValueChangeHandler<ID extends StableID = StableID> = NonNullable<TreeViewControllerOptions<ID>['onValueChange']>;
export type TreeViewControllerExpandedValuesChangeHandler<ID extends StableID = StableID> = NonNullable<TreeViewControllerOptions<ID>['onExpandedValuesChange']>;
export type TreeViewControllerHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<TreeViewControllerOptions<ID>['onHighlightedValueChange']>;

export interface TreeViewControlledValues<ID extends StableID = StableID> {
  readonly value?: readonly ID[];
  readonly expandedValues?: readonly ID[];
  readonly highlightedValue?: ID | null;
}

export interface TreeViewController<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  readonly selectionMode: TreeViewSelectionMode;
  getSnapshot(): RevisionSnapshot<TreeViewState<ID>>;
  syncControlledValues(
    values: TreeViewControlledValues<ID>,
  ): Result<RevisionSnapshot<TreeViewState<ID>>>;
  handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision?: number,
  ): RevisionResult<TreeViewState<ID>, TreeViewEffect<ID>>;
  handleEvent(
    event: TreeViewEvent<ID>,
    expectedRevision?: number,
  ): RevisionResult<TreeViewState<ID>, TreeViewEffect<ID>>;
  setItemDisabled(id: ID, disabled: boolean): void;
}

export interface TreeViewTransitionDetails<ID extends StableID = StableID> {
  readonly event: TreeViewEvent<ID>;
  readonly result: RevisionResult<TreeViewState<ID>, TreeViewEffect<ID>>;
}

export interface TreeViewConnectionOptions<ID extends StableID = StableID> {
  readonly controller: TreeViewController<ID>;
  readonly root: HTMLElement;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onTransition?: (details: TreeViewTransitionDetails<ID>) => void;
  readonly onUpdate?: () => void;
  readonly disabledItems?: readonly ID[];
}

export type TreeViewConnectionTransitionHandler<ID extends StableID = StableID> = NonNullable<TreeViewConnectionOptions<ID>['onTransition']>;
export type TreeViewConnectionUpdateHandler<ID extends StableID = StableID> = NonNullable<TreeViewConnectionOptions<ID>['onUpdate']>;

export interface TreeViewItemAttributes<ID extends StableID = StableID> {
  readonly id: ID;
  readonly disabled?: boolean;
}

export interface TreeViewConnection<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  getSnapshot(): RevisionSnapshot<TreeViewState<ID>>;
  syncControlledValues(
    values: TreeViewControlledValues<ID>,
  ): Result<RevisionSnapshot<TreeViewState<ID>>>;
  setTreeAttributes(label?: string): void;
  setItemAttributes(element: HTMLElement, attributes: TreeViewItemAttributes<ID>): void;
  setDisclosureAttributes(element: HTMLElement, id: ID): void;
  handleEvent(event: TreeViewEvent<ID>): boolean;
  handleKeyboardEvent(event: KeyboardEvent): boolean;
  focusCurrent(): void;
  disconnect(): void;
}

export type TreeViewOptions<ID extends StableID = StableID> =
  Omit<TreeViewControllerOptions<ID>, 'tree'>
  & Omit<TreeViewConnectionOptions<ID>, 'controller'>
  & { readonly nodes: readonly TreeNodeInput<ID>[] };

export function createTreeViewController<ID extends StableID>(
  options: TreeViewControllerOptions<ID>,
): Result<TreeViewController<ID>> {
  const selectionMode = options.selectionMode ?? options.policies?.selectionMode ?? 'single';
  const initial = tryCreateTreeViewState(options.tree, {
    selected: options.value ?? options.defaultValue ?? [],
    expanded: options.expandedValues ?? options.defaultExpandedValues ?? [],
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? null,
  }, selectionMode);
  if (!initial.ok) return initial;
  const valueControlled = options.value !== undefined;
  const expandedControlled = options.expandedValues !== undefined;
  const highlightControlled = options.highlightedValue !== undefined;
  const itemDisabled = new Set<ID>();
  const suppliedEligibility = options.policies?.eligible;
  const policies: TreeViewPolicies<ID> = {
    ...options.policies,
    selectionMode,
    eligible: (id) => !itemDisabled.has(id) && (suppliedEligibility?.(id) ?? true),
  };
  const runtime = createSemanticController<TreeViewState<ID>, TreeViewEvent<ID>, TreeViewCommand<ID>, TreeViewEffect<ID>>({
    initial,
    reducer: (state, event) => applyTreeViewEvent(options.tree, state, event, policies),
    reconcile: (previous, proposed) => controlledState(
      options.tree,
      previous,
      proposed,
      valueControlled,
      expandedControlled,
      highlightControlled,
      selectionMode,
    ),
    notify: (previous, proposed) => notifyTreeViewChange(options, previous, proposed),
    toEffect: toTreeViewEffect,
    interaction: options,
    interactionIntent: treeViewIntent,
  });
  return runtime.ok
    ? { ok: true, value: new DOMTreeViewController({ ...options, selectionMode }, runtime.value, itemDisabled) }
    : runtime;
}

export function createTreeView<ID extends StableID>(
  options: TreeViewOptions<ID>,
): FacadeConnection<TreeViewConnection<ID>> {
  return unwrap(tryCreateTreeView(options));
}

export function tryCreateTreeView<ID extends StableID>(
  options: TreeViewOptions<ID>,
): Result<FacadeConnection<TreeViewConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateTreeViewConnection(options));
}

function tryCreateTreeViewConnection<ID extends StableID>(
  options: TreeViewOptions<ID>,
): Result<TreeViewConnection<ID>> {
  const tree = tryCreateTree(options.nodes);
  if (!tree.ok) return tree;
  const disabled = new Set(options.disabledItems ?? []);
  for (const id of disabled) if (!tree.value.has(id)) return { ok: false, error: { class: 'construction', code: 'disabled-item-outside-domain', message: 'Every disabled tree-view item must exist in the tree.', details: { id } } };
  const suppliedEligibility = options.policies?.eligible;
  const policies: TreeViewPolicies<ID> = { ...options.policies, eligible: (id) => !disabled.has(id) && (suppliedEligibility?.(id) ?? true) };
  const controller = createTreeViewController({ ...options, policies, tree: tree.value });
  if (!controller.ok) return controller;
  return { ok: true, value: connectTreeView({ ...options, controller: controller.value }) };
}

export function connectTreeView<ID extends StableID>(
  options: TreeViewConnectionOptions<ID>,
): TreeViewConnection<ID> {
  return new DOMTreeViewConnection(options);
}

export function toTreeViewEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
): TreeViewEvent<ID> | null {
  if (input.altKey === true || input.ctrlKey === true || input.metaKey === true) return null;
  if (input.key === 'ArrowDown') return 'next';
  if (input.key === 'ArrowUp') return 'previous';
  if (input.key === 'ArrowRight') return 'right';
  if (input.key === 'ArrowLeft') return 'left';
  if (input.key === ' ') return 'toggle-select';
  return null;
}

export function toTreeViewEffect<ID extends StableID>(
  command: TreeViewCommand<ID>,
): TreeViewEffect<ID> {
  return Object.freeze({ type: 'focus-element', id: command.id });
}

class DOMTreeViewConnection<ID extends StableID> implements TreeViewConnection<ID> {
  public readonly tree: Tree<ID>;
  readonly #controller: TreeViewController<ID>;
  readonly #root: HTMLElement;
  readonly #onTransition: ((details: TreeViewTransitionDetails<ID>) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;
  readonly #disabled: ReadonlySet<ID>;
  readonly #handleKeydown: (event: KeyboardEvent) => void;
  readonly #handleClick: (event: MouseEvent) => void;
  #active = true;

  public constructor(options: TreeViewConnectionOptions<ID>) {
    this.#controller = options.controller;
    this.tree = options.controller.tree;
    this.#root = options.root;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    this.#disabled = new Set(options.disabledItems ?? []);
    setInteractionAttributes(this.#root, options, { readOnly: true });
    this.#handleKeydown = (event): void => {
      if (this.handleKeyboardEvent(event)) event.preventDefault();
    };
    this.#handleClick = (event): void => {
      const disclosureID = findDelegatedStableID(event.target, this.#root, 'treeViewDisclosureId');
      if (disclosureID !== null) {
        const id = disclosureID as ID;
        const expanded = this.#controller.getSnapshot().state.expansion.has(id);
        this.handleEvent({ type: 'set-expanded', id, open: !expanded });
        return;
      }
      const id = findDelegatedStableID(event.target, this.#root, 'treeViewId');
      if (id !== null) this.handleEvent({ type: 'toggle-select', id: id as ID });
    };
    this.#root.addEventListener('keydown', this.#handleKeydown);
    this.#root.addEventListener('click', this.#handleClick);
  }

  public getSnapshot(): RevisionSnapshot<TreeViewState<ID>> {
    return this.#controller.getSnapshot();
  }

  public syncControlledValues(
    values: TreeViewControlledValues<ID>,
  ): Result<RevisionSnapshot<TreeViewState<ID>>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) {
      this.#onUpdate?.();
      this.focusCurrent();
    }
    return result;
  }

  public setTreeAttributes(label?: string): void {
    this.#root.setAttribute('role', 'tree');
    if (this.#controller.selectionMode === 'multiple') this.#root.setAttribute('aria-multiselectable', 'true');
    else this.#root.removeAttribute('aria-multiselectable');
    if (label === undefined) this.#root.removeAttribute('aria-label');
    else this.#root.setAttribute('aria-label', label);
  }

  public setItemAttributes(
    element: HTMLElement,
    attributes: TreeViewItemAttributes<ID>,
  ): void {
    this.#controller.setItemDisabled(attributes.id, attributes.disabled === true);
    const state = this.#controller.getSnapshot().state;
    const leaf = this.tree.isLeaf(attributes.id);
    const level = (this.tree.depthOf(attributes.id) ?? 0) + 1;
    element.dataset['treeViewId'] = stableIDToken(attributes.id);
    element.tabIndex = state.cursor.current === attributes.id ? 0 : -1;
    element.setAttribute('role', 'treeitem');
    element.setAttribute('aria-level', String(level));
    element.setAttribute('aria-selected', String(state.selection.has(attributes.id)));
    if (leaf === false) {
      element.setAttribute('aria-expanded', String(state.expansion.has(attributes.id)));
    } else {
      element.removeAttribute('aria-expanded');
    }
    if (attributes.disabled === true || this.#disabled.has(attributes.id)) element.setAttribute('aria-disabled', 'true');
    else element.removeAttribute('aria-disabled');
  }

  public setDisclosureAttributes(element: HTMLElement, id: ID): void {
    element.dataset['treeViewDisclosureId'] = stableIDToken(id);
    element.setAttribute('aria-hidden', 'true');
  }

  public handleKeyboardEvent(event: KeyboardEvent): boolean {
    const input: KeyboardInput = {
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    };
    const semanticEvent = toTreeViewEvent<ID>(input);
    if (semanticEvent === null) return false;
    return this.handleEvent(semanticEvent);
  }

  public handleEvent(event: TreeViewEvent<ID>): boolean {
    const result = this.#controller.handleEvent(event);
    this.#onTransition?.(Object.freeze({ event, result }));
    if (result.ok) {
      this.#onUpdate?.();
      this.focusCurrent();
    }
    return result.ok || result.error.code !== 'interaction-disabled';
  }

  public focusCurrent(): void {
    queueMicrotask((): void => {
      if (!this.#active) return;
      const current = this.#controller.getSnapshot().state.cursor.current;
      if (current === null) {
        this.#root.focus();
        return;
      }
      for (const element of this.#root.querySelectorAll<HTMLElement>('[data-tree-view-id]')) {
        if (element.dataset['treeViewId'] !== stableIDToken(current)) continue;
        element.focus();
        return;
      }
    });
  }

  public disconnect(): void {
    this.#active = false;
    this.#root.removeEventListener('keydown', this.#handleKeydown);
    this.#root.removeEventListener('click', this.#handleClick);
  }
}

class DOMTreeViewController<ID extends StableID> implements TreeViewController<ID> {
  public readonly tree: Tree<ID>;
  public readonly selectionMode: TreeViewSelectionMode;
  readonly #tree: Tree<ID>;
  readonly #valueControlled: boolean;
  readonly #expandedControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #itemDisabled: Set<ID>;
  readonly #runtime: SemanticController<TreeViewState<ID>, TreeViewEvent<ID>, TreeViewEffect<ID>>;

  public constructor(
    options: TreeViewControllerOptions<ID>,
    runtime: SemanticController<TreeViewState<ID>, TreeViewEvent<ID>, TreeViewEffect<ID>>,
    itemDisabled: Set<ID>,
  ) {
    this.tree = options.tree;
    this.selectionMode = options.selectionMode ?? options.policies?.selectionMode ?? 'single';
    this.#tree = options.tree;
    this.#valueControlled = options.value !== undefined;
    this.#expandedControlled = options.expandedValues !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#itemDisabled = itemDisabled;
    this.#runtime = runtime;
  }

  public getSnapshot(): RevisionSnapshot<TreeViewState<ID>> {
    return this.#runtime.getSnapshot();
  }

  public setItemDisabled(id: ID, disabled: boolean): void {
    if (disabled) this.#itemDisabled.add(id);
    else this.#itemDisabled.delete(id);
  }

  public syncControlledValues(
    values: TreeViewControlledValues<ID>,
  ): Result<RevisionSnapshot<TreeViewState<ID>>> {
    const error = controlledInputError(
      this.#valueControlled,
      this.#expandedControlled,
      this.#highlightControlled,
      values,
    );
    if (error !== null) return { ok: false, error };
    const state = tryCreateTreeViewState(this.#tree, {
      selected: this.#valueControlled
        ? (values.value as readonly ID[])
        : this.#runtime.getSnapshot().state.selection.selected,
      anchor: this.#runtime.getSnapshot().state.selection.anchor,
      expanded: this.#expandedControlled
        ? (values.expandedValues as readonly ID[])
        : this.#runtime.getSnapshot().state.expansion.ids,
      current: this.#highlightControlled
        ? (values.highlightedValue as ID | null)
        : this.#runtime.getSnapshot().state.cursor.current,
    }, this.selectionMode);
    return this.#runtime.replace(state);
  }

  public handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision = this.#runtime.getSnapshot().revision,
  ): RevisionResult<TreeViewState<ID>, TreeViewEffect<ID>> {
    const event = toTreeViewEvent<ID>(input);
    if (event === null) {
      return this.#runtime.reject('unsupported-dom-key', 'DOM keyboard input does not map to a tree-view semantic event.', { key: input.key });
    }
    return this.handleEvent(event, expectedRevision);
  }

  public handleEvent(
    event: TreeViewEvent<ID>,
    expectedRevision = this.#runtime.getSnapshot().revision,
  ): RevisionResult<TreeViewState<ID>, TreeViewEffect<ID>> {
    return this.#runtime.handle(event, expectedRevision);
  }
}

function notifyTreeViewChange<ID extends StableID>(
  options: TreeViewControllerOptions<ID>,
  previous: TreeViewState<ID>,
  proposed: TreeViewState<ID>,
): void {
  if (!sameIDs(previous.selection.selected, proposed.selection.selected)) {
    options.onValueChange?.(Object.freeze({ value: proposed.selection.selected, previousValue: previous.selection.selected }));
  }
  if (!sameIDs(previous.expansion.ids, proposed.expansion.ids)) {
    options.onExpandedValuesChange?.(Object.freeze({ value: proposed.expansion.ids, previousValue: previous.expansion.ids }));
  }
  if (previous.cursor.current !== proposed.cursor.current) {
    options.onHighlightedValueChange?.(Object.freeze({ value: proposed.cursor.current, previousValue: previous.cursor.current }));
  }
}

function treeViewIntent<ID extends StableID>(event: TreeViewEvent<ID>): 'navigate' | 'mutate' {
  const type = typeof event === 'object' ? event.type : event;
  return type === 'toggle-select' ? 'mutate' : 'navigate';
}

function controlledState<ID extends StableID>(
  tree: Tree<ID>,
  previous: TreeViewState<ID>,
  proposed: TreeViewState<ID>,
  valueControlled: boolean,
  expandedControlled: boolean,
  highlightControlled: boolean,
  selectionMode: TreeViewSelectionMode,
): Result<TreeViewState<ID>> {
  return tryCreateTreeViewState(tree, {
    selected: valueControlled ? previous.selection.selected : proposed.selection.selected,
    anchor: valueControlled ? previous.selection.anchor : proposed.selection.anchor,
    expanded: expandedControlled ? previous.expansion.ids : proposed.expansion.ids,
    current: highlightControlled ? previous.cursor.current : proposed.cursor.current,
  }, selectionMode);
}

function controlledInputError<ID extends StableID>(
  valueControlled: boolean,
  expandedControlled: boolean,
  highlightControlled: boolean,
  values: TreeViewControlledValues<ID>,
): SectileError | null {
  return fieldError(valueControlled, values.value !== undefined, 'value', 'tree-view selection')
    ?? fieldError(
      expandedControlled,
      values.expandedValues !== undefined,
      'expanded-values',
      'tree-view expansion',
    )
    ?? fieldError(
      highlightControlled,
      values.highlightedValue !== undefined,
      'highlighted-value',
      'tree-view highlight',
    );
}

function sameIDs<ID extends StableID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, SectileError, StableID } from '@sectile/core';
import {
  tryCreateInteractionState,
  requireInteraction,
  type InteractionState,
} from '@sectile/core/interaction';
import {
  tryCreateRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';
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
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';
import { findDelegatedID } from './internal/delegated-event.js';
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
  const snapshot = tryCreateRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  const interaction = tryCreateInteractionState(options);
  if (!interaction.ok) return interaction;
  return { ok: true, value: new DOMTreeViewController({ ...options, selectionMode }, snapshot.value, interaction.value) };
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
      const disclosureID = findDelegatedID(event.target, this.#root, 'treeViewDisclosureId');
      if (disclosureID !== null) {
        const id = disclosureID as ID;
        const expanded = this.#controller.getSnapshot().state.expansion.has(id);
        this.handleEvent({ type: 'set-expanded', id, open: !expanded });
        return;
      }
      const id = findDelegatedID(event.target, this.#root, 'treeViewId');
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
    element.dataset['treeViewId'] = String(attributes.id);
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
    element.dataset['treeViewDisclosureId'] = String(id);
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
      const current = this.#controller.getSnapshot().state.cursor.current;
      if (current === null) {
        this.#root.focus();
        return;
      }
      for (const element of this.#root.querySelectorAll<HTMLElement>('[data-tree-view-id]')) {
        if (element.dataset['treeViewId'] !== String(current)) continue;
        element.focus();
        return;
      }
    });
  }

  public disconnect(): void {
    this.#root.removeEventListener('keydown', this.#handleKeydown);
    this.#root.removeEventListener('click', this.#handleClick);
  }
}

class DOMTreeViewController<ID extends StableID> implements TreeViewController<ID> {
  public readonly tree: Tree<ID>;
  public readonly selectionMode: TreeViewSelectionMode;
  readonly #tree: Tree<ID>;
  readonly #policies: TreeViewPolicies<ID>;
  readonly #valueControlled: boolean;
  readonly #expandedControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #onValueChange: ((change: TreeViewValueChangeDetails<ID>) => void) | undefined;
  readonly #onExpandedValuesChange:
    | ((change: TreeViewExpandedValuesChangeDetails<ID>) => void)
    | undefined;
  readonly #onHighlightedValueChange:
    | ((change: TreeViewHighlightChangeDetails<ID>) => void)
    | undefined;
  readonly #interaction: InteractionState;
  readonly #itemDisabled = new Set<ID>();
  #snapshot: RevisionSnapshot<TreeViewState<ID>>;

  public constructor(
    options: TreeViewControllerOptions<ID>,
    snapshot: RevisionSnapshot<TreeViewState<ID>>,
    interaction: InteractionState,
  ) {
    this.tree = options.tree;
    this.selectionMode = options.selectionMode ?? options.policies?.selectionMode ?? 'single';
    this.#tree = options.tree;
    const suppliedEligibility = options.policies?.eligible;
    this.#policies = {
      ...options.policies,
      selectionMode: this.selectionMode,
      eligible: (id) => !this.#itemDisabled.has(id) && (suppliedEligibility?.(id) ?? true),
    };
    this.#valueControlled = options.value !== undefined;
    this.#expandedControlled = options.expandedValues !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#onValueChange = options.onValueChange;
    this.#onExpandedValuesChange = options.onExpandedValuesChange;
    this.#onHighlightedValueChange = options.onHighlightedValueChange;
    this.#interaction = interaction;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): RevisionSnapshot<TreeViewState<ID>> {
    return this.#snapshot;
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
        : this.#snapshot.state.selection.selected,
      anchor: this.#snapshot.state.selection.anchor,
      expanded: this.#expandedControlled
        ? (values.expandedValues as readonly ID[])
        : this.#snapshot.state.expansion.ids,
      current: this.#highlightControlled
        ? (values.highlightedValue as ID | null)
        : this.#snapshot.state.cursor.current,
    }, this.selectionMode);
    const snapshot = synchronizeControllerState(this.#snapshot, state);
    if (!snapshot.ok) return snapshot;
    this.#snapshot = snapshot.value;
    return snapshot;
  }

  public handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<TreeViewState<ID>, TreeViewEffect<ID>> {
    const event = toTreeViewEvent<ID>(input);
    if (event === null) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-dom-key',
        message: 'DOM keyboard input does not map to a tree-view semantic event.',
        details: { key: input.key },
      });
    }
    return this.handleEvent(event, expectedRevision);
  }

  public handleEvent(
    event: TreeViewEvent<ID>,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<TreeViewState<ID>, TreeViewEffect<ID>> {
    const permitted = requireInteraction(this.#interaction, treeViewIntent(event));
    if (!permitted.ok) return rejectRevisionInput(this.#snapshot, permitted.error);
    const result = applyControllerEvent(
      this.#snapshot,
      expectedRevision,
      event,
      (state, semanticEvent) => applyTreeViewEvent(this.#tree, state, semanticEvent, this.#policies),
      (previous, proposed) => controlledState(
        this.#tree,
        previous,
        proposed,
        this.#valueControlled,
        this.#expandedControlled,
        this.#highlightControlled,
        this.selectionMode,
      ),
      (previous, proposed) => this.#notify(previous, proposed),
      toTreeViewEffect,
    );
    if (result.ok) this.#snapshot = result.snapshot;
    return result;
  }

  #notify(previous: TreeViewState<ID>, proposed: TreeViewState<ID>): void {
    if (!sameIDs(previous.selection.selected, proposed.selection.selected)) {
      this.#onValueChange?.(Object.freeze({
        value: proposed.selection.selected,
        previousValue: previous.selection.selected,
      }));
    }
    if (!sameIDs(previous.expansion.ids, proposed.expansion.ids)) {
      this.#onExpandedValuesChange?.(Object.freeze({
        value: proposed.expansion.ids,
        previousValue: previous.expansion.ids,
      }));
    }
    if (previous.cursor.current !== proposed.cursor.current) {
      this.#onHighlightedValueChange?.(Object.freeze({
        value: proposed.cursor.current,
        previousValue: previous.cursor.current,
      }));
    }
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

function fieldError(
  controlled: boolean,
  provided: boolean,
  codeName: string,
  label: string,
): SectileError | null {
  if (controlled === provided) return null;
  return {
    class: 'construction',
    code: controlled ? `controlled-${codeName}-required` : `uncontrolled-${codeName}-update`,
    message: controlled
      ? `Controlled ${label} sync requires its external value.`
      : `Uncontrolled ${label} cannot be synchronized externally.`,
  };
}

function sameIDs<ID extends StableID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

import type { Result, SectileError, StableID } from '@sectile/primitives';
import {
  createRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/primitives/revision';
import { createTree, type Tree, type TreeNodeInput } from '@sectile/primitives/tree';
import {
  applyTreeViewEvent,
  createTreeViewState,
  type TreeViewCommand,
  type TreeViewEvent,
  type TreeViewState,
} from '@sectile/primitives/tree-view';
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';
import { findDelegatedID } from './internal/delegated-event.js';

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

export interface TreeViewExpandedChangeDetails<ID extends StableID = StableID> {
  readonly value: readonly ID[];
  readonly previousValue: readonly ID[];
}

export interface TreeViewHighlightChangeDetails<ID extends StableID = StableID> {
  readonly value: ID | null;
  readonly previousValue: ID | null;
}

export interface TreeViewControllerOptions<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  readonly value?: readonly ID[];
  readonly defaultValue?: readonly ID[];
  readonly expandedValue?: readonly ID[];
  readonly defaultExpandedValue?: readonly ID[];
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly onValueChange?: (change: TreeViewValueChangeDetails<ID>) => void;
  readonly onExpandedValueChange?: (change: TreeViewExpandedChangeDetails<ID>) => void;
  readonly onHighlightedValueChange?: (change: TreeViewHighlightChangeDetails<ID>) => void;
}

export interface TreeViewControlledValues<ID extends StableID = StableID> {
  readonly value?: readonly ID[];
  readonly expandedValue?: readonly ID[];
  readonly highlightedValue?: ID | null;
}

export interface TreeViewController<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
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
}

export interface TreeViewTransitionDetails<ID extends StableID = StableID> {
  readonly event: TreeViewEvent<ID>;
  readonly result: RevisionResult<TreeViewState<ID>, TreeViewEffect<ID>>;
}

export interface TreeViewConnectionOptions<ID extends StableID = StableID> {
  readonly controller: TreeViewController<ID>;
  readonly root: HTMLElement;
  readonly onTransition?: (details: TreeViewTransitionDetails<ID>) => void;
  readonly onUpdate?: () => void;
}

export interface TreeViewItemAttributes<ID extends StableID = StableID> {
  readonly id: ID;
  readonly level?: number;
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
  const initial = createTreeViewState(options.tree, {
    selected: options.value ?? options.defaultValue ?? [],
    expanded: options.expandedValue ?? options.defaultExpandedValue ?? [],
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? null,
  });
  if (!initial.ok) return initial;
  const snapshot = createRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  return { ok: true, value: new DOMTreeViewController(options, snapshot.value) };
}

export function createTreeView<ID extends StableID>(
  options: TreeViewOptions<ID>,
): Result<TreeViewConnection<ID>> {
  const tree = createTree(options.nodes);
  if (!tree.ok) return tree;
  const controller = createTreeViewController({ ...options, tree: tree.value });
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
  readonly #handleKeydown: (event: KeyboardEvent) => void;
  readonly #handleClick: (event: MouseEvent) => void;

  public constructor(options: TreeViewConnectionOptions<ID>) {
    this.#controller = options.controller;
    this.tree = options.controller.tree;
    this.#root = options.root;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
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
    this.#root.setAttribute('aria-multiselectable', 'true');
    if (label === undefined) this.#root.removeAttribute('aria-label');
    else this.#root.setAttribute('aria-label', label);
  }

  public setItemAttributes(
    element: HTMLElement,
    attributes: TreeViewItemAttributes<ID>,
  ): void {
    const state = this.#controller.getSnapshot().state;
    const leaf = this.tree.isLeaf(attributes.id);
    const level = attributes.level ?? (this.tree.depthOf(attributes.id) ?? 0) + 1;
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
    if (attributes.disabled === true) element.setAttribute('aria-disabled', 'true');
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
    this.#onUpdate?.();
    this.focusCurrent();
    return true;
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
  readonly #tree: Tree<ID>;
  readonly #valueControlled: boolean;
  readonly #expandedControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #onValueChange: ((change: TreeViewValueChangeDetails<ID>) => void) | undefined;
  readonly #onExpandedValueChange:
    | ((change: TreeViewExpandedChangeDetails<ID>) => void)
    | undefined;
  readonly #onHighlightedValueChange:
    | ((change: TreeViewHighlightChangeDetails<ID>) => void)
    | undefined;
  #snapshot: RevisionSnapshot<TreeViewState<ID>>;

  public constructor(
    options: TreeViewControllerOptions<ID>,
    snapshot: RevisionSnapshot<TreeViewState<ID>>,
  ) {
    this.tree = options.tree;
    this.#tree = options.tree;
    this.#valueControlled = options.value !== undefined;
    this.#expandedControlled = options.expandedValue !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#onValueChange = options.onValueChange;
    this.#onExpandedValueChange = options.onExpandedValueChange;
    this.#onHighlightedValueChange = options.onHighlightedValueChange;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): RevisionSnapshot<TreeViewState<ID>> {
    return this.#snapshot;
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
    const state = createTreeViewState(this.#tree, {
      selected: this.#valueControlled
        ? (values.value as readonly ID[])
        : this.#snapshot.state.selection.selected,
      anchor: this.#snapshot.state.selection.anchor,
      expanded: this.#expandedControlled
        ? (values.expandedValue as readonly ID[])
        : this.#snapshot.state.expansion.ids,
      current: this.#highlightControlled
        ? (values.highlightedValue as ID | null)
        : this.#snapshot.state.cursor.current,
    });
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
    const result = applyControllerEvent(
      this.#snapshot,
      expectedRevision,
      event,
      (state, semanticEvent) => applyTreeViewEvent(this.#tree, state, semanticEvent),
      (previous, proposed) => controlledState(
        this.#tree,
        previous,
        proposed,
        this.#valueControlled,
        this.#expandedControlled,
        this.#highlightControlled,
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
      this.#onExpandedValueChange?.(Object.freeze({
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

function controlledState<ID extends StableID>(
  tree: Tree<ID>,
  previous: TreeViewState<ID>,
  proposed: TreeViewState<ID>,
  valueControlled: boolean,
  expandedControlled: boolean,
  highlightControlled: boolean,
): Result<TreeViewState<ID>> {
  return createTreeViewState(tree, {
    selected: valueControlled ? previous.selection.selected : proposed.selection.selected,
    anchor: valueControlled ? previous.selection.anchor : proposed.selection.anchor,
    expanded: expandedControlled ? previous.expansion.ids : proposed.expansion.ids,
    current: highlightControlled ? previous.cursor.current : proposed.cursor.current,
  });
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
      values.expandedValue !== undefined,
      'expanded-value',
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

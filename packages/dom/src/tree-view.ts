import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createTreeViewController, toTreeViewEvent } from './composite/tree-controller.js';
export { createTreeViewController, toTreeViewEvent, toTreeViewEffect } from './composite/tree-controller.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { RevisionResult, RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateTree, type Tree, type TreeNodeInput } from '@sectile/core/tree';
import {
  type TreeViewEvent,
  type TreeViewPolicies,
  type TreeViewSelectionMode,
  type TreeViewState,
} from '@sectile/core/tree-view';
import { findDelegatedStableID } from './identity/delegated-event.js';
import { stableIDToken } from './identity.js';
import { setInteractionAttributes, setDisclosureAccessibility } from './interaction/attributes.js';
import { DOMCompositeFocusEntry } from './composite/focus-entry.js';

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
  /** Release a mounted row without retiring the tree controller. */
  releaseItem?(element: HTMLElement, id: ID): void;
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

export function createTreeView<ID extends StableID>(
  options: TreeViewOptions<ID>,
): FacadeConnection<TreeViewConnection<ID>> {
  return unwrap(tryCreateTreeView(options));
}

export function tryCreateTreeView<ID extends StableID>(
  options: TreeViewOptions<ID>,
): Result<FacadeConnection<TreeViewConnection<ID>>> {
  return createFacadeConnection(options, tryCreateTreeViewConnection);
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

interface TreeViewPresentation<ID extends StableID> {
  readonly controller: TreeViewController<ID>;
  readonly root: HTMLElement;
  readonly onTransition: TreeViewConnectionOptions<ID>['onTransition'];
  readonly onUpdate: TreeViewConnectionOptions<ID>['onUpdate'];
  readonly disabled: ReadonlySet<ID>;
  readonly interactionDisabled: boolean;
  readonly focusEntry: DOMCompositeFocusEntry<ID>;
}

class DOMTreeViewConnection<ID extends StableID> implements TreeViewConnection<ID> {
  public readonly tree: Tree<ID>;
  #scope: TreeViewPresentation<ID> | undefined;
  #snapshot: RevisionSnapshot<TreeViewState<ID>> | undefined;
  readonly #handleKeydown: (event: KeyboardEvent) => void;
  readonly #handleClick: (event: MouseEvent) => void;

  public constructor(options: TreeViewConnectionOptions<ID>) {
    this.tree = options.controller.tree;
    const snapshot = options.controller.getSnapshot();
    this.#scope = {
      controller: options.controller, root: options.root, onTransition: options.onTransition, onUpdate: options.onUpdate,
      disabled: new Set(options.disabledItems ?? []), interactionDisabled: options.disabled === true,
      focusEntry: new DOMCompositeFocusEntry({ mode: 'root', root: options.root,
        current: snapshot.state.cursor.current, rootEnabled: options.disabled !== true }),
    };
    const scope = this.#scope;
    setInteractionAttributes(scope.root, options, false, true);
    this.#handleKeydown = (event): void => {
      if (this.handleKeyboardEvent(event)) event.preventDefault();
    };
    this.#handleClick = (event): void => {
      const scope = this.#scope; if (!scope) return;
      const disclosureID = findDelegatedStableID(event.target, scope.root, 'treeViewDisclosureId');
      if (disclosureID !== null) {
        const id = disclosureID as ID;
        const expanded = scope.controller.getSnapshot().state.expansion.has(id);
        this.handleEvent({ type: 'set-expanded', id, open: !expanded });
        return;
      }
      const id = findDelegatedStableID(event.target, scope.root, 'treeViewId');
      if (id !== null) this.handleEvent({ type: 'toggle-select', id: id as ID });
    };
    scope.root.addEventListener('keydown', this.#handleKeydown);
    scope.root.addEventListener('click', this.#handleClick);
  }

  public getSnapshot(): RevisionSnapshot<TreeViewState<ID>> {
    return this.#scope?.controller.getSnapshot() ?? this.#snapshot!;
  }

  public syncControlledValues(
    values: TreeViewControlledValues<ID>,
  ): Result<RevisionSnapshot<TreeViewState<ID>>> {
    const scope = this.#scope;
    if (!scope) return { ok: false, error: { class: 'resource-rejection', code: 'connection-destroyed', message: 'The tree-view presentation is disconnected.' } };
    const result = scope.controller.syncControlledValues(values);
    if (result.ok && this.#scope === scope) {
      scope.focusEntry.setCurrent(result.value.state.cursor.current);
      scope.onUpdate?.();
      if (this.#scope === scope) this.focusCurrent();
    }
    return result;
  }

  public setTreeAttributes(label?: string): void {
    const scope = this.#scope; if (!scope) return;
    scope.root.setAttribute('role', 'tree');
    if (scope.controller.selectionMode === 'multiple') scope.root.setAttribute('aria-multiselectable', 'true');
    else scope.root.removeAttribute('aria-multiselectable');
    if (label === undefined) scope.root.removeAttribute('aria-label');
    else scope.root.setAttribute('aria-label', label);
  }

  public setItemAttributes(
    element: HTMLElement,
    attributes: TreeViewItemAttributes<ID>,
  ): void {
    const scope = this.#scope; if (!scope) return;
    scope.controller.setItemDisabled(attributes.id, attributes.disabled === true);
    const state = scope.controller.getSnapshot().state;
    const leaf = this.tree.isLeaf(attributes.id);
    const level = (this.tree.depthOf(attributes.id) ?? 0) + 1;
    element.dataset['treeViewId'] = stableIDToken(attributes.id);
    element.setAttribute('role', 'treeitem');
    element.setAttribute('aria-level', String(level));
    element.setAttribute('aria-selected', String(state.selection.has(attributes.id)));
    if (leaf === false) {
      element.setAttribute('aria-expanded', String(state.expansion.has(attributes.id)));
    } else {
      element.removeAttribute('aria-expanded');
    }
    const unavailable = scope.interactionDisabled || attributes.disabled === true || scope.disabled.has(attributes.id);
    if (unavailable) element.setAttribute('aria-disabled', 'true');
    else element.removeAttribute('aria-disabled');
    scope.focusEntry.bind(element, attributes.id, { available: !unavailable });
  }

  public setDisclosureAttributes(element: HTMLElement, id: ID): void {
    const scope = this.#scope; if (!scope) return;
    element.dataset['treeViewDisclosureId'] = stableIDToken(id);
    setDisclosureAccessibility(element, scope.controller.getSnapshot().state.expansion.has(id), scope.interactionDisabled || scope.disabled.has(id));
  }

  public releaseItem(element: HTMLElement, id: ID): void {
    const scope = this.#scope; if (!scope) return;
    if (scope.focusEntry.elementFor(id) !== element) return;
    scope.focusEntry.release(id, element);
    scope.controller.setItemDisabled(id, false);
  }

  public handleKeyboardEvent(event: KeyboardEvent): boolean {
    if (!this.#scope) return false;
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
    const scope = this.#scope; if (!scope) return false;
    const result = scope.controller.handleEvent(event);
    if (this.#scope === scope) scope.onTransition?.(Object.freeze({ event, result }));
    if (result.ok && this.#scope === scope) {
      scope.focusEntry.setCurrent(result.snapshot.state.cursor.current);
      scope.onUpdate?.();
      if (this.#scope === scope) this.focusCurrent();
    }
    return result.ok || result.error.code !== 'interaction-disabled';
  }

  public focusCurrent(): void {
    queueMicrotask((): void => {
      const scope = this.#scope; if (!scope) return;
      const current = scope.controller.getSnapshot().state.cursor.current;
      if (current === null) {
        scope.root.focus();
        return;
      }
      scope.focusEntry.elementFor(current)?.focus();
    });
  }

  public disconnect(): void {
    const scope = this.#scope; if (!scope) return;
    this.#snapshot = scope.controller.getSnapshot();
    this.#scope = undefined;
    scope.root.removeEventListener('keydown', this.#handleKeydown);
    scope.root.removeEventListener('click', this.#handleClick);
    scope.focusEntry.disconnect();
  }
}

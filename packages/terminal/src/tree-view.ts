import { createFacadeConnection, createSemanticController, tryCreateDisabledIdentitySet, type FacadeConnection, type SemanticController } from '@sectile/core/adapter-runtime';
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
import type { TerminalKeyboardInput } from './keyboard.js';

export type KeyboardInput = TerminalKeyboardInput;
export type { TreeViewSelectionMode } from '@sectile/core/tree-view';

export interface TreeViewEffect<ID extends StableID = StableID> {
  readonly type: 'move-highlight';
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
}

export interface TreeViewTransitionDetails<ID extends StableID = StableID> {
  readonly event: TreeViewEvent<ID>;
  readonly result: RevisionResult<TreeViewState<ID>, TreeViewEffect<ID>>;
}

export interface TreeViewConnectionOptions<ID extends StableID = StableID> {
  readonly controller: TreeViewController<ID>;
  readonly disabled?: boolean;
  readonly onTransition?: (details: TreeViewTransitionDetails<ID>) => void;
  readonly onUpdate?: () => void;
}

export type TreeViewConnectionTransitionHandler<ID extends StableID = StableID> = NonNullable<TreeViewConnectionOptions<ID>['onTransition']>;
export type TreeViewConnectionUpdateHandler<ID extends StableID = StableID> = NonNullable<TreeViewConnectionOptions<ID>['onUpdate']>;

export interface TreeViewConnection<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  getSnapshot(): RevisionSnapshot<TreeViewState<ID>>;
  syncControlledValues(
    values: TreeViewControlledValues<ID>,
  ): Result<RevisionSnapshot<TreeViewState<ID>>>;
  handleKeyboardInput(input: KeyboardInput): boolean;
}

export type TreeViewOptions<ID extends StableID = StableID> =
  Omit<TreeViewControllerOptions<ID>, 'tree'>
  & Omit<TreeViewConnectionOptions<ID>, 'controller'>
  & { readonly nodes: readonly TreeNodeInput<ID>[]; readonly disabledItems?: readonly ID[] };

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
  const policies: TreeViewPolicies<ID> = { ...options.policies, selectionMode };
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
    interactionIntent: () => 'navigate',
  });
  return runtime.ok
    ? { ok: true, value: new TerminalTreeViewController({ ...options, selectionMode }, runtime.value) }
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
  const disabledResult = tryCreateDisabledIdentitySet(
    { contains: (id: ID) => tree.value.has(id) },
    options.disabledItems,
  );
  if (!disabledResult.ok) return disabledResult;
  const disabled = disabledResult.value;
  const suppliedEligibility = options.policies?.eligible;
  const policies: TreeViewPolicies<ID> = { ...options.policies, eligible: (id) => !disabled.has(id) && (suppliedEligibility?.(id) ?? true) };
  const controller = createTreeViewController({ ...options, policies, tree: tree.value });
  if (!controller.ok) return controller;
  return { ok: true, value: connectTreeView({ ...options, controller: controller.value }) };
}

export function connectTreeView<ID extends StableID>(
  options: TreeViewConnectionOptions<ID>,
): TreeViewConnection<ID> {
  return new TerminalTreeViewConnection(options);
}

export function toTreeViewEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
): TreeViewEvent<ID> | null {
  if (input.key === 'down') return 'next';
  if (input.key === 'up') return 'previous';
  if (input.key === 'right') return 'right';
  if (input.key === 'left') return 'left';
  if (input.key === 'space') return 'toggle-select';
  return null;
}

export function toTreeViewEffect<ID extends StableID>(
  command: TreeViewCommand<ID>,
): TreeViewEffect<ID> {
  return Object.freeze({ type: 'move-highlight', id: command.id });
}

class TerminalTreeViewConnection<ID extends StableID> implements TreeViewConnection<ID> {
  public readonly tree: Tree<ID>;
  readonly #controller: TreeViewController<ID>;
  readonly #onTransition: ((details: TreeViewTransitionDetails<ID>) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;

  public constructor(options: TreeViewConnectionOptions<ID>) {
    this.#controller = options.controller;
    this.tree = options.controller.tree;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
  }

  public getSnapshot(): RevisionSnapshot<TreeViewState<ID>> {
    return this.#controller.getSnapshot();
  }

  public syncControlledValues(
    values: TreeViewControlledValues<ID>,
  ): Result<RevisionSnapshot<TreeViewState<ID>>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) this.#onUpdate?.();
    return result;
  }

  public handleKeyboardInput(input: KeyboardInput): boolean {
    const event = toTreeViewEvent<ID>(input);
    if (event === null) return false;
    const result = this.#controller.handleKeyboardInput(input);
    this.#onTransition?.(Object.freeze({ event, result }));
    if (result.ok) this.#onUpdate?.();
    return result.ok;
  }
}

class TerminalTreeViewController<ID extends StableID> implements TreeViewController<ID> {
  public readonly tree: Tree<ID>;
  public readonly selectionMode: TreeViewSelectionMode;
  readonly #tree: Tree<ID>;
  readonly #valueControlled: boolean;
  readonly #expandedControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #runtime: SemanticController<TreeViewState<ID>, TreeViewEvent<ID>, TreeViewEffect<ID>>;

  public constructor(
    options: TreeViewControllerOptions<ID>,
    runtime: SemanticController<TreeViewState<ID>, TreeViewEvent<ID>, TreeViewEffect<ID>>,
  ) {
    this.tree = options.tree;
    this.selectionMode = options.selectionMode ?? options.policies?.selectionMode ?? 'single';
    this.#tree = options.tree;
    this.#valueControlled = options.value !== undefined;
    this.#expandedControlled = options.expandedValues !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#runtime = runtime;
  }

  public getSnapshot(): RevisionSnapshot<TreeViewState<ID>> {
    return this.#runtime.getSnapshot();
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
      return this.#runtime.reject('unsupported-terminal-key', 'Terminal keyboard input does not map to a tree-view semantic event.', { key: input.key });
    }
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

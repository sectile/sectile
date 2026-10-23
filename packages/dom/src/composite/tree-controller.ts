import { createSemanticController, synchronizeControllerState, controlledFieldError as fieldError, type SemanticController } from '@sectile/core/adapter-runtime';
import type { CoreErrorCode, Result, SectileError, StableID } from '@sectile/core';
import type { RevisionResult, RevisionSnapshot } from '@sectile/core/revision';
import type { Tree } from '@sectile/core/tree';
import { applyTreeViewEvent, tryCreateTreeViewState, reconcileTreeViewState, type TreeViewStateInput, type TreeViewCommand, type TreeViewEvent, type TreeViewPolicies, type TreeViewSelectionMode, type TreeViewState } from '@sectile/core/tree-view';
import type { KeyboardInput, TreeViewEffect, TreeViewControllerOptions, TreeViewController, TreeViewControlledValues } from '../tree-view.js';

export function createTreeViewController<ID extends StableID>(
  options: TreeViewControllerOptions<ID>,
): Result<TreeViewController<ID>> {
  return createTreeController(options, { apply: applyTreeViewEvent });
}

/** Private host composition port; portable transitions stay with Core. */
export interface TreeControllerBehavior<ID extends StableID> {
  readonly create?: (input: TreeViewStateInput<ID>) => Result<TreeViewState<ID>>;
  readonly apply: (tree: Tree<ID>, state: TreeViewState<ID>, event: TreeViewEvent<ID>, policies: TreeViewPolicies<ID>) => Result<{ readonly state: TreeViewState<ID>; readonly commands: readonly TreeViewCommand<ID>[] }>;
  readonly accept?: (state: TreeViewState<ID>) => Result<void>;
}

export function createTreeController<ID extends StableID>(
  options: TreeViewControllerOptions<ID>, behavior: TreeControllerBehavior<ID>,
): Result<TreeViewController<ID>> {
  const selectionMode = options.selectionMode ?? options.policies?.selectionMode ?? 'single';
  const create = behavior.create ?? ((input: TreeViewStateInput<ID>): Result<TreeViewState<ID>> => tryCreateTreeViewState(options.tree, input, selectionMode));
  const initial = create({
    selected: options.value ?? options.defaultValue ?? [],
    expanded: options.expandedValues ?? options.defaultExpandedValues ?? [],
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? null,
  });
  if (!initial.ok) return initial;
  const valueControlled = options.value !== undefined;
  const expandedControlled = options.expandedValues !== undefined;
  const highlightControlled = options.highlightedValue !== undefined;
  const controlledParts = { selection: valueControlled, expansion: expandedControlled, cursor: highlightControlled };
  const itemDisabled = new Set<ID>();
  const suppliedEligibility = options.policies?.eligible;
  const policies: TreeViewPolicies<ID> = {
    ...options.policies,
    selectionMode,
    eligible: (id) => !itemDisabled.has(id) && (suppliedEligibility?.(id) ?? true),
  };
  const runtime = createSemanticController<TreeViewState<ID>, TreeViewEvent<ID>, TreeViewCommand<ID>, TreeViewEffect<ID>>({
    initial,
    reducer: (state, event) => behavior.apply(options.tree, state, event, policies),
    reconcile: (previous, proposed) => {
      const next = reconcileTreeViewState(options.tree, previous, proposed, controlledParts, selectionMode);
      if (!next.ok || valueControlled || previous.selection === proposed.selection) return next;
      const accepted = behavior.accept?.(next.value);
      return accepted && !accepted.ok ? accepted : next;
    },
    notify: treeViewNotifiers(options),
    toEffect: toTreeViewEffect,
    interaction: options,
    interactionIntent: treeViewIntent,
  });
  return runtime.ok
    ? { ok: true, value: new DOMTreeViewController({ ...options, selectionMode }, runtime.value, itemDisabled, behavior.accept, create) }
    : runtime;
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

class DOMTreeViewController<ID extends StableID> implements TreeViewController<ID> {
  public readonly tree: Tree<ID>;
  public readonly selectionMode: TreeViewSelectionMode;
  readonly #valueControlled: boolean;
  readonly #expandedControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #itemDisabled: Set<ID>;
  readonly #runtime: SemanticController<TreeViewState<ID>, TreeViewEvent<ID>, TreeViewEffect<ID>>;
  readonly #accept: TreeControllerBehavior<ID>['accept'];
  readonly #create: NonNullable<TreeControllerBehavior<ID>['create']>;

  public constructor(
    options: TreeViewControllerOptions<ID>,
    runtime: SemanticController<TreeViewState<ID>, TreeViewEvent<ID>, TreeViewEffect<ID>>,
    itemDisabled: Set<ID>,
    accept: TreeControllerBehavior<ID>['accept'],
    create: NonNullable<TreeControllerBehavior<ID>['create']>,
  ) {
    this.tree = options.tree;
    this.selectionMode = options.selectionMode ?? options.policies?.selectionMode ?? 'single';
    this.#valueControlled = options.value !== undefined;
    this.#expandedControlled = options.expandedValues !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#itemDisabled = itemDisabled;
    this.#runtime = runtime;
    this.#accept = accept;
    this.#create = create;
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
    const state = this.#create({
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
    });
    if (!state.ok || this.#accept === undefined) return this.#runtime.replace(state);
    const prepared = synchronizeControllerState<TreeViewState<ID>, CoreErrorCode>(this.#runtime.getSnapshot(), state);
    if (!prepared.ok) return prepared;
    const accepted = this.#accept(state.value);
    return accepted.ok ? this.#runtime.replace(state) : accepted;
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

function treeViewNotifiers<ID extends StableID>(
  options: TreeViewControllerOptions<ID>,
): readonly ((previous: TreeViewState<ID>, proposed: TreeViewState<ID>) => void)[] {
  return Object.freeze([
    (previous, proposed) => {
      if (!sameIDs(previous.selection.selected, proposed.selection.selected)) {
        options.onValueChange?.(Object.freeze({ value: proposed.selection.selected, previousValue: previous.selection.selected }));
      }
    },
    (previous, proposed) => {
      if (!sameIDs(previous.expansion.ids, proposed.expansion.ids)) {
        options.onExpandedValuesChange?.(Object.freeze({ value: proposed.expansion.ids, previousValue: previous.expansion.ids }));
      }
    },
    (previous, proposed) => {
      if (previous.cursor.current !== proposed.cursor.current) {
        options.onHighlightedValueChange?.(Object.freeze({ value: proposed.cursor.current, previousValue: previous.cursor.current }));
      }
    },
  ]);
}

function treeViewIntent<ID extends StableID>(event: TreeViewEvent<ID>): 'navigate' | 'mutate' {
  const type = typeof event === 'object' ? event.type : event;
  return type === 'toggle-select' ? 'mutate' : 'navigate';
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

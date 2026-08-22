import type { Result, SectileError, StableID } from '@sectile/primitives';
import {
  createInteractionState,
  requireInteraction,
  type InteractionState,
} from '@sectile/primitives/interaction';
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
  type TreeViewPolicies,
  type TreeViewState,
} from '@sectile/primitives/tree-view';
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export type KeyboardInput = TerminalKeyboardInput;

export interface TreeViewEffect<ID extends StableID = StableID> {
  readonly type: 'move-highlight';
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
  readonly disabled?: boolean;
  readonly value?: readonly ID[];
  readonly defaultValue?: readonly ID[];
  readonly expandedValue?: readonly ID[];
  readonly defaultExpandedValue?: readonly ID[];
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly policies?: TreeViewPolicies<ID>;
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
  const interaction = createInteractionState(options);
  if (!interaction.ok) return interaction;
  return { ok: true, value: new TerminalTreeViewController(options, snapshot.value, interaction.value) };
}

export function createTreeView<ID extends StableID>(
  options: TreeViewOptions<ID>,
): Result<TreeViewConnection<ID>> {
  const tree = createTree(options.nodes);
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
  readonly #tree: Tree<ID>;
  readonly #policies: TreeViewPolicies<ID>;
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
  readonly #interaction: InteractionState;
  #snapshot: RevisionSnapshot<TreeViewState<ID>>;

  public constructor(
    options: TreeViewControllerOptions<ID>,
    snapshot: RevisionSnapshot<TreeViewState<ID>>,
    interaction: InteractionState,
  ) {
    this.tree = options.tree;
    this.#tree = options.tree;
    this.#policies = options.policies ?? {};
    this.#valueControlled = options.value !== undefined;
    this.#expandedControlled = options.expandedValue !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#onValueChange = options.onValueChange;
    this.#onExpandedValueChange = options.onExpandedValueChange;
    this.#onHighlightedValueChange = options.onHighlightedValueChange;
    this.#interaction = interaction;
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
    const permitted = requireInteraction(this.#interaction, 'navigate');
    if (!permitted.ok) return rejectRevisionInput(this.#snapshot, permitted.error);
    const event = toTreeViewEvent<ID>(input);
    if (event === null) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-terminal-key',
        message: 'Terminal keyboard input does not map to a tree-view semantic event.',
        details: { key: input.key },
      });
    }
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

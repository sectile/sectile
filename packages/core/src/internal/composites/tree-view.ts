import { unwrap } from '../../result.js';
import type { Result, SectileError, StableID } from '../../shared.js';
import type { Tree } from '../../structures/tree.js';
import { bindCanonicalState, fail, hasCanonicalState, isStableID, memoizeWeakPair, ok } from '../kernel/foundation.js';
import { createMachineUpdate } from '../kernel/machine.js';
import { createCursorState, type CursorState } from '../state/cursor.js';
import {
  createExpansionState,
  setExpansionOpen,
  type ExpansionState,
} from '../state/expansion.js';
import {
  createSelectionState,
  selectOne,
  toggleMultipleSelection,
  type SelectionSnapshotInput,
  type SelectionState,
} from '../state/selection.js';
import { ownsTreeSelection, normalizeTreeSelectionState, proposeTreeSelectionToggle, type TreeSelection } from './tree-selection.js';

export type TreeViewEvent<ID extends StableID = StableID> =
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'right'
  | 'left'
  | 'toggle-select'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'toggle-select'; readonly id: ID }
  | { readonly type: 'set-expanded'; readonly id: ID; readonly open: boolean };

export interface TreeViewCommand<ID extends StableID = StableID> {
  readonly type: 'focus';
  readonly id: ID;
}

export interface TreeViewState<ID extends StableID = StableID> {
  readonly expansion: ExpansionState<ID>;
  readonly cursor: CursorState<ID>;
  readonly selection: SelectionState<ID>;
}

export interface TreeViewStateInput<ID extends StableID = StableID>
  extends SelectionSnapshotInput<ID> {
  readonly expanded?: Iterable<ID>;
  readonly current?: ID | null;
}

export interface TreeViewCheckStateInput<ID extends StableID = StableID> extends Omit<TreeViewStateInput<ID>, 'anchor'> {
  readonly anchor?: null;
}
/** True keeps that accepted part; otherwise the proposed part is used. */
export interface TreeViewControlledParts {
  readonly selection?: boolean;
  readonly expansion?: boolean;
  readonly cursor?: boolean;
}

export type TreeViewSelectionMode = 'single' | 'multiple';

export interface TreeViewPolicies<ID extends StableID = StableID> {
  readonly eligible?: (id: ID) => boolean;
  readonly selectionMode?: TreeViewSelectionMode;
}

export interface TreeViewUpdate<ID extends StableID = StableID> {
  readonly state: TreeViewState<ID>;
  readonly commands: readonly TreeViewCommand<ID>[];
}

const treeVisibleViews = new WeakMap<object, WeakMap<object, ReturnType<Tree<StableID>['visible']>>>();

export function createTreeViewState<ID extends StableID>(
  tree: Tree<ID>,
  input: TreeViewStateInput<ID> = {},
  selectionMode: TreeViewSelectionMode = 'multiple',
): TreeViewState<ID> {
  return unwrap(tryCreateTreeViewState(tree, input, selectionMode));
}

export function tryCreateTreeViewState<ID extends StableID>(
  tree: Tree<ID>,
  input: TreeViewStateInput<ID> = {},
  selectionMode: TreeViewSelectionMode = 'multiple',
): Result<TreeViewState<ID>> {
  const expansion = createExpansionState(tree, input.expanded ?? []);
  const visible = treeVisible(tree, expansion);
  const current = input.current ?? null;
  if (current !== null && !visible.contains(current)) {
    return fail(
      'construction',
      'tree-view-cursor-hidden',
      'Tree-view cursor must be visible under the requested expansion.',
      { current },
    );
  }
  const selection = createSelectionState(tree.preorder(), selectionMode, input);
  if (!selection.ok) return selection;
  return ok(treeViewState(tree, expansion, createCursorState(current), selection.value));
}

export function createTreeViewCheckState<ID extends StableID>(
  tree: Tree<ID>, checking: TreeSelection<NoInfer<ID>>, input: TreeViewCheckStateInput<NoInfer<ID>> = {},
): TreeViewState<ID> {
  return unwrap(tryCreateTreeViewCheckState(tree, checking, input));
}

/** Pure admission; defaults to the projection's current accepted leaf values. */
export function tryCreateTreeViewCheckState<ID extends StableID>(
  tree: Tree<ID>, checking: TreeSelection<NoInfer<ID>>, input: TreeViewCheckStateInput<NoInfer<ID>> = {},
): Result<TreeViewState<ID>> {
  const selection = normalizeTreeSelectionState(tree, checking, input);
  if (!selection.ok) return selection;
  if (input.anchor !== undefined && input.anchor !== null) return fail('construction', 'selection-anchor-outside-domain', 'Checked tree selection does not use a range anchor.');
  const expansion = createExpansionState(tree, input.expanded ?? []), current = input.current ?? null;
  if (current !== null && !treeVisible(tree, expansion).contains(current)) {
    return fail('construction', 'tree-view-cursor-hidden', 'Tree-view cursor must be visible under the requested expansion.', { current });
  }
  return ok(treeViewState(tree, expansion, createCursorState(current), selection.value));
}

/** Compose accepted/proposed canonical parts without materializing their values. */
export function reconcileTreeViewState<ID extends StableID>(
  tree: Tree<ID>, previous: TreeViewState<NoInfer<ID>>, proposed: TreeViewState<NoInfer<ID>>,
  controlled: TreeViewControlledParts = {}, selectionMode: TreeViewSelectionMode = 'multiple',
): Result<TreeViewState<ID>> {
  const { selection: keepSelection = false, expansion: keepExpansion = false, cursor: keepCursor = false } = controlled;
  if (typeof keepSelection !== 'boolean' || typeof keepExpansion !== 'boolean' || typeof keepCursor !== 'boolean') {
    return fail('construction', 'invalid-boundary', 'Controlled tree parts must be boolean.');
  }
  const selection = keepSelection ? previous.selection : proposed.selection;
  const expansion = keepExpansion ? previous.expansion : proposed.expansion;
  const cursor = keepCursor ? previous.cursor : proposed.cursor;
  if (!hasCanonicalState(tree, previous) || !hasCanonicalState(tree, proposed)) {
    return tryCreateTreeViewState(tree, { selected: selection.selected, anchor: selection.anchor, expanded: expansion.ids, current: cursor.current }, selectionMode);
  }
  const visibleInPrevious = expansion === previous.expansion && cursor.current === previous.cursor.current;
  const visibleInProposed = expansion === proposed.expansion && cursor.current === proposed.cursor.current;
  if (cursor.current !== null && !visibleInPrevious && !visibleInProposed && !treeVisible(tree, expansion).contains(cursor.current)) {
    return fail('construction', 'tree-view-cursor-hidden', 'Tree-view cursor must be visible under the requested expansion.', { current: cursor.current });
  }
  if (selectionMode !== 'single' && selectionMode !== 'multiple') return fail('construction', 'invalid-selection-mode', 'Selection mode must be single or multiple.', { mode: selectionMode });
  if (selectionMode === 'single' && selection.size > 1) return fail('construction', 'invalid-selection-cardinality', 'Single selection must contain at most one identity.', { selectedCount: selection.size });
  if (selection === previous.selection && expansion === previous.expansion && cursor === previous.cursor) return ok(previous);
  if (selection === proposed.selection && expansion === proposed.expansion && cursor === proposed.cursor) return ok(proposed);
  return ok(treeViewState(tree, expansion, cursor, selection));
}

export function applyTreeViewEvent<ID extends StableID>(
  tree: Tree<ID>,
  state: TreeViewState<ID>,
  event: TreeViewEvent<ID>,
  policies: TreeViewPolicies<ID> = {},
): Result<TreeViewUpdate<ID>> {
  if (!isTreeViewEvent(event)) {
    return fail(
      'transition-rejection',
      'invalid-tree-view-event',
      'Tree-view event must be next, previous, right, left, or toggle-select.',
      { event },
    );
  }
  const canonical = hasCanonicalState(tree, state);
  const expansion = canonical ? state.expansion : createExpansionState(tree, state.expansion.ids);
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return fail('transition-rejection', 'invalid-eligibility-policy', 'Tree-view eligibility policy must be a function.');
  }
  const eligible = policies.eligible ?? (() => true);
  const selectionMode = policies.selectionMode ?? 'multiple';
  if (selectionMode !== 'single' && selectionMode !== 'multiple') {
    return fail('transition-rejection', 'invalid-selection-mode', 'Tree-view selection mode must be single or multiple.', { selectionMode });
  }
  const visible = treeVisible(tree, expansion);
  const stateError = canonical ? null : validateTreeViewState(tree, visible, state, selectionMode);
  if (stateError !== null) return { ok: false, error: stateError };
  const normalized = sameExpansion(expansion, state.expansion)
    ? state
    : treeViewState(tree, expansion, state.cursor, state.selection);
  const current = state.cursor.current;

  if (typeof event === 'object') {
    if (!tree.has(event.id)) {
      return fail(
        'transition-rejection',
        'tree-view-target-outside-tree',
        'Direct tree-view events require an identity in the tree.',
        { id: event.id },
      );
    }
    if (event.type === 'set-expanded') {
      if (!visible.contains(event.id)) return fail('transition-rejection', 'tree-view-target-hidden', 'Expansion changes require a visible tree-view item.', { id: event.id });
      if (!eligible(event.id)) return fail('transition-rejection', 'tree-view-target-ineligible', 'Disabled tree-view items cannot change expansion.', { id: event.id });
      const nextExpansion = setExpansionOpen(expansion, event.id, event.open, tree);
      const nextVisible = treeVisible(tree, nextExpansion);
      const target = current !== null && nextVisible.contains(current) ? current : event.id;
      return createMachineUpdate(
        treeViewState(tree, nextExpansion, createCursorState(target), state.selection),
        target === current ? [] : [{ type: 'focus', id: target }],
      );
    }
    if (!visible.contains(event.id)) {
      return fail(
        'transition-rejection',
        'tree-view-target-hidden',
        'Direct tree-view focus and selection require a visible identity.',
        { id: event.id },
      );
    }
    if (!eligible(event.id)) return fail('transition-rejection', 'tree-view-target-ineligible', 'Direct tree-view focus and selection require an eligible identity.', { id: event.id });
    if (event.type === 'focus') {
      return createMachineUpdate(
        treeViewState(tree, expansion, createCursorState(event.id), state.selection),
        [{ type: 'focus', id: event.id }],
      );
    }
    return createMachineUpdate(treeViewState(tree,
      expansion,
      createCursorState(event.id),
      selectForMode(state.selection, event.id, tree.preorder(), selectionMode),
    ), [{ type: 'focus', id: event.id }]);
  }

  if (event === 'next' || event === 'previous' || event === 'first' || event === 'last') {
    const target = current === null || event === 'first' || event === 'last'
      ? eligibleFromEdge(visible, event === 'next' || event === 'first' ? 1 : -1, eligible)
      : movementTarget(visible, current, event === 'next' ? 1 : -1, eligible);
    if (target === null) return createMachineUpdate(normalized);
    return createMachineUpdate(
      treeViewState(tree, expansion, createCursorState(target), state.selection),
      [{ type: 'focus', id: target }],
    );
  }

  if (event === 'right') {
    if (current === null) return createMachineUpdate(normalized);
    const children = tree.childrenOf(current);
    if (children === null || children.size === 0) return createMachineUpdate(normalized);
    if (!expansion.has(current)) {
      return createMachineUpdate(treeViewState(tree,
        setExpansionOpen(expansion, current, true, tree),
        state.cursor,
        state.selection,
      ));
    }
    const target = eligibleFromEdge(children, 1, eligible);
    if (target === null) return createMachineUpdate(normalized);
    return createMachineUpdate(
      treeViewState(tree, expansion, createCursorState(target), state.selection),
      [{ type: 'focus', id: target }],
    );
  }

  if (event === 'left') {
    if (current === null) return createMachineUpdate(normalized);
    if (expansion.has(current)) {
      return createMachineUpdate(treeViewState(tree,
        setExpansionOpen(expansion, current, false, tree),
        state.cursor,
        state.selection,
      ));
    }
    const parent = eligibleAncestor(tree, current, eligible);
    if (parent === null) return createMachineUpdate(normalized);
    return createMachineUpdate(
      treeViewState(tree, expansion, createCursorState(parent), state.selection),
      [{ type: 'focus', id: parent }],
    );
  }

  if (current === null) {
    return fail('transition-rejection', 'no-cursor', 'Tree-view selection requires a cursor.');
  }
  if (!eligible(current)) return fail('transition-rejection', 'tree-view-target-ineligible', 'Tree-view selection requires an eligible cursor.', { id: current });
  return createMachineUpdate(treeViewState(tree,
    expansion,
    state.cursor,
    selectForMode(state.selection, current, tree.preorder(), selectionMode),
  ));
}

function movementTarget<ID extends StableID>(
  visible: ReturnType<Tree<ID>['visible']>,
  current: ID,
  direction: -1 | 1,
  eligible: (id: ID) => boolean,
): ID | null {
  const index = visible.indexOf(current);
  if (index === null) return null;
  for (let candidate = index + direction; candidate >= 0 && candidate < visible.size; candidate += direction) {
    const id = visible.at(candidate);
    if (id !== null && eligible(id)) return id;
  }
  return null;
}

/**
 * Pure checked-tree proposal. The projection shares this Tree and its accepted
 * leaf values; the caller accepts the returned state and updates it separately.
 * Cursor/focus stays independent of the checked selection's null range anchor.
 */
export function applyTreeViewCheckEvent<ID extends StableID>(
  tree: Tree<ID>, state: TreeViewState<NoInfer<ID>>, event: TreeViewEvent<NoInfer<ID>>, checking: TreeSelection<NoInfer<ID>>, policies: TreeViewPolicies<NoInfer<ID>> = {},
): Result<TreeViewUpdate<ID>> {
  if (!ownsTreeSelection(tree, checking)) return fail('transition-rejection', 'tree-selection-owner-mismatch', 'Checked selection must belong to the same tree.');
  const { selectionMode, eligible } = policies;
  if (selectionMode !== undefined && selectionMode !== 'multiple') return fail('transition-rejection', 'invalid-selection-mode', 'Checked trees require multiple-value selection.');
  const checkedPolicies: TreeViewPolicies<ID> = { selectionMode: 'multiple', ...(eligible === undefined ? {} : { eligible }) };
  if (event !== 'toggle-select' && (typeof event !== 'object' || event === null || event.type !== 'toggle-select')) {
    return applyTreeViewEvent(tree, state, event, checkedPolicies);
  }
  const id = typeof event === 'object' ? event.id : state.cursor.current;
  if (id === null) return applyTreeViewEvent(tree, state, event, checkedPolicies);
  const focused = applyTreeViewEvent(tree, state, { type: 'focus', id }, checkedPolicies);
  if (!focused.ok) return focused;
  const selection = proposeTreeSelectionToggle(tree, checking, focused.value.state.selection.selected, id);
  if (!selection.ok) return selection;
  return createMachineUpdate(treeViewState(tree, focused.value.state.expansion, focused.value.state.cursor, selection.value),
    typeof event === 'object' ? focused.value.commands : []);
}

function eligibleFromEdge<ID extends StableID>(domain: { readonly size: number; at(index: number): ID | null }, direction: -1 | 1, eligible: (id: ID) => boolean): ID | null {
  for (let index = direction === 1 ? 0 : domain.size - 1; index >= 0 && index < domain.size; index += direction) {
    const id = domain.at(index); if (id !== null && eligible(id)) return id;
  }
  return null;
}

function eligibleAncestor<ID extends StableID>(tree: Tree<ID>, id: ID, eligible: (id: ID) => boolean): ID | null {
  let parent = tree.parentOf(id);
  while (parent !== null && !eligible(parent)) parent = tree.parentOf(parent);
  return parent;
}

function validateTreeViewState<ID extends StableID>(
  tree: Tree<ID>,
  visible: ReturnType<Tree<ID>['visible']>,
  state: TreeViewState<ID>,
  selectionMode: TreeViewSelectionMode,
): SectileError | null {
  if (state.cursor.current !== null && !visible.contains(state.cursor.current)) {
    return {
      class: 'transition-rejection',
      code: 'tree-view-cursor-hidden',
      message: 'Tree-view cursor must remain visible.',
      details: { current: state.cursor.current },
    };
  }
  const preorder = tree.preorder();
  const unique = new Set(state.selection.selected);
  if (selectionMode === 'single' && unique.size > 1) {
    return {
      class: 'transition-rejection',
      code: 'invalid-selection-cardinality',
      message: 'Single-selection tree-view state must contain at most one identity.',
      details: { selectedCount: unique.size },
    };
  }
  if (unique.size !== state.selection.selected.length || unique.size !== state.selection.size) {
    return {
      class: 'transition-rejection',
      code: 'invalid-tree-view-selection',
      message: 'Tree-view selection must contain unique identities with matching observations.',
    };
  }
  for (const id of unique) {
    if (!preorder.contains(id) || !state.selection.has(id)) {
      return {
        class: 'transition-rejection',
        code: 'tree-view-selection-outside-tree',
        message: 'Tree-view selection must belong to the tree.',
        details: { id },
      };
    }
  }
  if (state.selection.anchor !== null && !preorder.contains(state.selection.anchor)) {
    return {
      class: 'transition-rejection',
      code: 'tree-view-anchor-outside-tree',
      message: 'Tree-view anchor must belong to the tree.',
      details: { anchor: state.selection.anchor },
    };
  }
  return null;
}

function selectForMode<ID extends StableID>(
  state: SelectionState<ID>,
  id: ID,
  domain: ReturnType<Tree<ID>['preorder']>,
  selectionMode: TreeViewSelectionMode,
): SelectionState<ID> {
  return selectionMode === 'single'
    ? selectOne(state, id, domain)
    : toggleMultipleSelection(state, id, domain);
}

function sameExpansion<ID extends StableID>(
  left: ExpansionState<ID>,
  right: ExpansionState<ID>,
): boolean {
  return left.ids.length === right.ids.length && left.ids.every((id, index) => id === right.ids[index]);
}

function treeViewState<ID extends StableID>(
  tree: Tree<ID>,
  expansion: ExpansionState<ID>,
  cursor: CursorState<ID>,
  selection: SelectionState<ID>,
): TreeViewState<ID> {
  return bindCanonicalState(tree, Object.freeze({ expansion, cursor, selection }));
}

function treeVisible<ID extends StableID>(tree: Tree<ID>, expansion: ExpansionState<ID>): ReturnType<Tree<ID>['visible']> {
  return memoizeWeakPair(treeVisibleViews, tree, expansion, createTreeVisible) as ReturnType<Tree<ID>['visible']>;
}

function createTreeVisible(owner: object, expansion: object): ReturnType<Tree<StableID>['visible']> { return (owner as Tree<StableID>).visible(expansion as ExpansionState<StableID>); }

function isTreeViewEvent<ID extends StableID>(value: unknown): value is TreeViewEvent<ID> {
  if (typeof value === 'string') {
    return value === 'next'
      || value === 'previous'
      || value === 'first'
      || value === 'last'
      || value === 'right'
      || value === 'left'
      || value === 'toggle-select';
  }
  return typeof value === 'object' && value !== null && 'type' in value && 'id' in value
    && isStableID(value.id)
    && (value.type === 'focus' || value.type === 'toggle-select'
      || (value.type === 'set-expanded' && 'open' in value && typeof value.open === 'boolean'));
}

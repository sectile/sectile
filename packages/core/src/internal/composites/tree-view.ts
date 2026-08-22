import type { Result, SectileError, StableID } from '../../shared.js';
import type { Tree } from '../../structures/tree.js';
import { fail, ok } from '../kernel/foundation.js';
import { createMachineUpdate } from '../kernel/machine.js';
import { createCursorState, type CursorState } from '../state/cursor.js';
import {
  createExpansionState,
  setExpansionOpen,
  type ExpansionState,
} from '../state/expansion.js';
import {
  createSelectionState,
  toggleMultipleSelection,
  type SelectionSnapshotInput,
  type SelectionState,
} from '../state/selection.js';

export type TreeViewEvent<ID extends StableID = StableID> =
  | 'next'
  | 'previous'
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

export interface TreeViewPolicies<ID extends StableID = StableID> {
  readonly eligible?: (id: ID) => boolean;
}

export interface TreeViewUpdate<ID extends StableID = StableID> {
  readonly state: TreeViewState<ID>;
  readonly commands: readonly TreeViewCommand<ID>[];
}

export function createTreeViewState<ID extends StableID>(
  tree: Tree<ID>,
  input: TreeViewStateInput<ID> = {},
): Result<TreeViewState<ID>> {
  const expansion = createExpansionState(tree, input.expanded ?? []);
  const visible = tree.visible(expansion);
  const current = input.current ?? null;
  if (current !== null && !visible.contains(current)) {
    return fail(
      'construction',
      'tree-view-cursor-hidden',
      'Tree-view cursor must be visible under the requested expansion.',
      { current },
    );
  }
  const selection = createSelectionState(tree.preorder(), 'multiple', input);
  if (!selection.ok) return selection;
  return ok(treeViewState(expansion, createCursorState(current), selection.value));
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
  const expansion = createExpansionState(tree, state.expansion.ids);
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return fail('transition-rejection', 'invalid-eligibility-policy', 'Tree-view eligibility policy must be a function.');
  }
  const eligible = policies.eligible ?? (() => true);
  const visible = tree.visible(expansion);
  const stateError = validateTreeViewState(tree, visible, state);
  if (stateError !== null) return { ok: false, error: stateError };
  const normalized = sameExpansion(expansion, state.expansion)
    ? state
    : treeViewState(expansion, state.cursor, state.selection);
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
      if (!eligible(event.id)) return fail('transition-rejection', 'tree-view-target-ineligible', 'Disabled tree-view items cannot change expansion.', { id: event.id });
      const nextExpansion = setExpansionOpen(expansion, event.id, event.open, tree);
      const nextVisible = tree.visible(nextExpansion);
      const target = current !== null && nextVisible.contains(current) ? current : event.id;
      return createMachineUpdate(
        treeViewState(nextExpansion, createCursorState(target), state.selection),
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
        treeViewState(expansion, createCursorState(event.id), state.selection),
        [{ type: 'focus', id: event.id }],
      );
    }
    return createMachineUpdate(treeViewState(
      expansion,
      createCursorState(event.id),
      toggleMultipleSelection(state.selection, event.id, tree.preorder()),
    ), [{ type: 'focus', id: event.id }]);
  }

  if (event === 'next' || event === 'previous') {
    const target = current === null
      ? eligibleFromEdge(visible, event === 'next' ? 1 : -1, eligible)
      : movementTarget(visible, current, event === 'next' ? 1 : -1, eligible);
    if (target === null) return createMachineUpdate(normalized);
    return createMachineUpdate(
      treeViewState(expansion, createCursorState(target), state.selection),
      [{ type: 'focus', id: target }],
    );
  }

  if (event === 'right') {
    if (current === null) return createMachineUpdate(normalized);
    const children = tree.childrenOf(current);
    if (children === null || children.size === 0) return createMachineUpdate(normalized);
    if (!expansion.has(current)) {
      return createMachineUpdate(treeViewState(
        setExpansionOpen(expansion, current, true, tree),
        state.cursor,
        state.selection,
      ));
    }
    const target = eligibleFromEdge(children, 1, eligible);
    if (target === null) return createMachineUpdate(normalized);
    return createMachineUpdate(
      treeViewState(expansion, createCursorState(target), state.selection),
      [{ type: 'focus', id: target }],
    );
  }

  if (event === 'left') {
    if (current === null) return createMachineUpdate(normalized);
    if (expansion.has(current)) {
      return createMachineUpdate(treeViewState(
        setExpansionOpen(expansion, current, false, tree),
        state.cursor,
        state.selection,
      ));
    }
    const parent = eligibleAncestor(tree, current, eligible);
    if (parent === null) return createMachineUpdate(normalized);
    return createMachineUpdate(
      treeViewState(expansion, createCursorState(parent), state.selection),
      [{ type: 'focus', id: parent }],
    );
  }

  if (current === null) {
    return fail('transition-rejection', 'no-cursor', 'Tree-view selection requires a cursor.');
  }
  if (!eligible(current)) return fail('transition-rejection', 'tree-view-target-ineligible', 'Tree-view selection requires an eligible cursor.', { id: current });
  return createMachineUpdate(treeViewState(
    expansion,
    state.cursor,
    toggleMultipleSelection(state.selection, current, tree.preorder()),
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

function sameExpansion<ID extends StableID>(
  left: ExpansionState<ID>,
  right: ExpansionState<ID>,
): boolean {
  return left.ids.length === right.ids.length && left.ids.every((id, index) => id === right.ids[index]);
}

function treeViewState<ID extends StableID>(
  expansion: ExpansionState<ID>,
  cursor: CursorState<ID>,
  selection: SelectionState<ID>,
): TreeViewState<ID> {
  return Object.freeze({ expansion, cursor, selection });
}

function isTreeViewEvent<ID extends StableID>(value: unknown): value is TreeViewEvent<ID> {
  if (typeof value === 'string') {
    return ['next', 'previous', 'right', 'left', 'toggle-select'].includes(value);
  }
  return typeof value === 'object' && value !== null && 'type' in value && 'id' in value
    && typeof value.id === 'string'
    && (value.type === 'focus' || value.type === 'toggle-select'
      || (value.type === 'set-expanded' && 'open' in value && typeof value.open === 'boolean'));
}

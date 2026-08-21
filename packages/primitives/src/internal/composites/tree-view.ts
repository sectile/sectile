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
      ? visible.at(event === 'next' ? 0 : visible.size - 1)
      : movementTarget(visible, current, event === 'next' ? 1 : -1);
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
    const target = children.at(0);
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
    const parent = tree.parentOf(current);
    if (parent === null) return createMachineUpdate(normalized);
    return createMachineUpdate(
      treeViewState(expansion, createCursorState(parent), state.selection),
      [{ type: 'focus', id: parent }],
    );
  }

  if (current === null) {
    return fail('transition-rejection', 'no-cursor', 'Tree-view selection requires a cursor.');
  }
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
): ID | null {
  const movement = visible.move(current, direction, 'stop');
  return movement.kind === 'found' ? movement.id : null;
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

import type { StableID } from '../../../shared.js';
import type { Expansion, Tree } from '../../../structures/tree.js';
import type {
  TreeViewCommand,
  TreeViewEvent,
  TreeViewState,
  TreeViewStateInput,
  TreeViewUpdate,
} from '../../composites/tree-view.js';
import { ReferenceSelectionState, referenceToggleMultipleSelection } from '../state/selection.js';

interface ReferenceTreeViewRejection {
  readonly ok: false;
  readonly errorClass: 'transition-rejection';
  readonly errorCode: string;
}

export type ReferenceTreeViewResult<ID extends StableID> =
  | { readonly ok: true; readonly value: TreeViewUpdate<ID> }
  | ReferenceTreeViewRejection;

export function createReferenceTreeViewState<ID extends StableID>(
  tree: Tree<ID>,
  input: TreeViewStateInput<ID> = {},
): TreeViewState<ID> {
  const expansion = referenceExpansion(tree, input.expanded ?? []);
  const visible = referenceVisible(tree, expansion);
  const current = input.current ?? null;
  if (current !== null && !visible.includes(current)) throw new TypeError('reference cursor hidden');
  const preorder = tree.preorder().ids;
  const selected = [...new Set(input.selected ?? [])];
  if (selected.some((id) => !preorder.includes(id))) throw new TypeError('reference selection outside tree');
  const anchor = input.anchor ?? null;
  if (anchor !== null && !preorder.includes(anchor)) throw new TypeError('reference anchor outside tree');
  return referenceState(expansion, current, new ReferenceSelectionState(selected, anchor));
}

export function applyReferenceTreeViewEvent<ID extends StableID>(
  tree: Tree<ID>,
  state: TreeViewState<ID>,
  event: TreeViewEvent<ID>,
): ReferenceTreeViewResult<ID> {
  if (!referenceEvent(event)) return rejected('invalid-tree-view-event');
  const expansion = referenceExpansion(tree, state.expansion.ids);
  const visible = referenceVisible(tree, expansion);
  const current = state.cursor.current;
  if (current !== null && !visible.includes(current)) return rejected('tree-view-cursor-hidden');
  const normalized = sameExpansion(expansion, state.expansion)
    ? state
    : referenceState(expansion, current, state.selection);

  if (typeof event === 'object') {
    if (!tree.has(event.id)) return rejected('tree-view-target-outside-tree');
    if (event.type === 'set-expanded') {
      if (!visible.includes(event.id)) return rejected('tree-view-target-hidden');
      const requested = event.open
        ? [...expansion.ids, event.id]
        : expansion.ids.filter((id) => id !== event.id);
      const nextExpansion = referenceExpansion(tree, requested);
      const target = current !== null && referenceVisible(tree, nextExpansion).includes(current)
        ? current
        : event.id;
      return accepted(
        referenceState(nextExpansion, target, state.selection),
        target === current ? [] : [{ type: 'focus', id: target }],
      );
    }
    if (!visible.includes(event.id)) return rejected('tree-view-target-hidden');
    if (event.type === 'focus') {
      return accepted(referenceState(expansion, event.id, state.selection), [
        { type: 'focus', id: event.id },
      ]);
    }
    const selection = referenceToggleMultipleSelection(
      state.selection,
      event.id,
      referenceDomain(tree.preorder().ids),
    );
    return accepted(referenceState(expansion, event.id, selection), [
      { type: 'focus', id: event.id },
    ]);
  }

  if (event === 'next' || event === 'previous') {
    const currentIndex = current === null ? null : visible.indexOf(current);
    const targetIndex = currentIndex === null
      ? (event === 'next' ? 0 : visible.length - 1)
      : currentIndex + (event === 'next' ? 1 : -1);
    const target = visible[targetIndex] ?? null;
    return target === null
      ? accepted(normalized)
      : accepted(referenceState(expansion, target, state.selection), [{ type: 'focus', id: target }]);
  }

  if (event === 'right') {
    if (current === null) return accepted(normalized);
    const children = tree.childrenOf(current)?.ids ?? [];
    if (children.length === 0) return accepted(normalized);
    if (!expansion.has(current)) {
      return accepted(referenceState(
        referenceExpansion(tree, [...expansion.ids, current]),
        current,
        state.selection,
      ));
    }
    const target = children[0];
    if (target === undefined) return accepted(normalized);
    return accepted(referenceState(expansion, target, state.selection), [{ type: 'focus', id: target }]);
  }

  if (event === 'left') {
    if (current === null) return accepted(normalized);
    if (expansion.has(current)) {
      return accepted(referenceState(
        referenceExpansion(tree, expansion.ids.filter((id) => id !== current)),
        current,
        state.selection,
      ));
    }
    const parent = tree.parentOf(current);
    return parent === null
      ? accepted(normalized)
      : accepted(referenceState(expansion, parent, state.selection), [{ type: 'focus', id: parent }]);
  }

  if (current === null) return rejected('no-cursor');
  const selection = referenceToggleMultipleSelection(
    state.selection,
    current,
    referenceDomain(tree.preorder().ids),
  );
  return accepted(referenceState(expansion, current, selection));
}

function referenceExpansion<ID extends StableID>(
  tree: Tree<ID>,
  requested: Iterable<ID>,
): Expansion<ID> {
  const requestedSet = new Set(requested);
  const ids = tree.preorder().ids.filter((id) => {
    const children = tree.childrenOf(id);
    return requestedSet.has(id) && children !== null && children.size > 0;
  });
  return Object.freeze({
    ids: Object.freeze(ids),
    size: ids.length,
    has: (id: ID) => ids.includes(id),
  });
}

function referenceVisible<ID extends StableID>(tree: Tree<ID>, expansion: Expansion<ID>): readonly ID[] {
  return tree.preorder().ids.filter((id) => {
    const ancestors = tree.ancestorsOf(id);
    return ancestors !== null && ancestors.every((ancestor) => expansion.has(ancestor));
  });
}

function referenceDomain<ID extends StableID>(ids: readonly ID[]) {
  return {
    size: ids.length,
    at: (index: number) => ids[index] ?? null,
    contains: (id: ID) => ids.includes(id),
    indexOf: (id: ID) => {
      const index = ids.indexOf(id);
      return index < 0 ? null : index;
    },
  };
}

function referenceState<ID extends StableID>(
  expansion: Expansion<ID>,
  current: ID | null,
  selection: TreeViewState<ID>['selection'],
): TreeViewState<ID> {
  return Object.freeze({ expansion, cursor: Object.freeze({ current }), selection });
}

function sameExpansion<ID extends StableID>(left: Expansion<ID>, right: Expansion<ID>): boolean {
  return left.ids.length === right.ids.length && left.ids.every((id, index) => id === right.ids[index]);
}

function accepted<ID extends StableID>(
  state: TreeViewState<ID>,
  commands: readonly TreeViewCommand<ID>[] = [],
): ReferenceTreeViewResult<ID> {
  return { ok: true, value: Object.freeze({ state, commands: Object.freeze(commands.map((command) => Object.freeze({ ...command }))) }) };
}

function rejected(errorCode: string): ReferenceTreeViewRejection {
  return { ok: false, errorClass: 'transition-rejection', errorCode };
}

function referenceEvent<ID extends StableID>(value: unknown): value is TreeViewEvent<ID> {
  if (typeof value === 'string') {
    return ['next', 'previous', 'right', 'left', 'toggle-select'].includes(value);
  }
  return typeof value === 'object' && value !== null && 'type' in value && 'id' in value
    && typeof value.id === 'string'
    && (value.type === 'focus' || value.type === 'toggle-select'
      || (value.type === 'set-expanded' && 'open' in value && typeof value.open === 'boolean'));
}

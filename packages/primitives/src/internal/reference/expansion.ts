import type { StableId } from '../../shared.js';
import type { Tree } from '../../tree.js';
import type { ExpansionState } from '../expansion.js';

export function createReferenceExpansionState<Id extends StableId>(
  tree: Tree<Id>,
  expanded: Iterable<Id> = [],
): ExpansionState<Id> {
  return tree.normalizeExpansion(expanded);
}

export function reconcileReferenceExpansion<Id extends StableId>(
  state: ExpansionState<Id>,
  tree: Tree<Id>,
): ExpansionState<Id> {
  const result = tree.normalizeExpansion(state.ids);
  return sameReferenceExpansion(state, result) ? state : result;
}

export function referenceSetExpansionOpen<Id extends StableId>(
  state: ExpansionState<Id>,
  id: Id,
  open: boolean,
  tree: Tree<Id>,
): ExpansionState<Id> {
  const children = tree.childrenOf(id);
  if (children === null || children.size === 0 || state.has(id) === open) return state;
  const expanded = open ? [...state.ids, id] : state.ids.filter((current) => current !== id);
  return tree.normalizeExpansion(expanded);
}

export function referenceToggleExpansion<Id extends StableId>(
  state: ExpansionState<Id>,
  id: Id,
  tree: Tree<Id>,
): ExpansionState<Id> {
  return referenceSetExpansionOpen(state, id, !state.has(id), tree);
}

function sameReferenceExpansion<Id extends StableId>(
  left: ExpansionState<Id>,
  right: ExpansionState<Id>,
): boolean {
  return (
    left.ids.length === right.ids.length &&
    left.ids.every((id, index) => id === right.ids[index])
  );
}

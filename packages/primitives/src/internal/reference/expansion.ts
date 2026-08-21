import type { StableID } from '../../shared.js';
import type { Tree } from '../../tree.js';
import type { ExpansionState } from '../expansion.js';

export function createReferenceExpansionState<ID extends StableID>(
  tree: Tree<ID>,
  expanded: Iterable<ID> = [],
): ExpansionState<ID> {
  return tree.normalizeExpansion(expanded);
}

export function reconcileReferenceExpansion<ID extends StableID>(
  state: ExpansionState<ID>,
  tree: Tree<ID>,
): ExpansionState<ID> {
  const result = tree.normalizeExpansion(state.ids);
  return sameReferenceExpansion(state, result) ? state : result;
}

export function referenceSetExpansionOpen<ID extends StableID>(
  state: ExpansionState<ID>,
  id: ID,
  open: boolean,
  tree: Tree<ID>,
): ExpansionState<ID> {
  const children = tree.childrenOf(id);
  if (children === null || children.size === 0 || state.has(id) === open) return state;
  const expanded = open ? [...state.ids, id] : state.ids.filter((current) => current !== id);
  return tree.normalizeExpansion(expanded);
}

export function referenceToggleExpansion<ID extends StableID>(
  state: ExpansionState<ID>,
  id: ID,
  tree: Tree<ID>,
): ExpansionState<ID> {
  return referenceSetExpansionOpen(state, id, !state.has(id), tree);
}

function sameReferenceExpansion<ID extends StableID>(
  left: ExpansionState<ID>,
  right: ExpansionState<ID>,
): boolean {
  return (
    left.ids.length === right.ids.length &&
    left.ids.every((id, index) => id === right.ids[index])
  );
}

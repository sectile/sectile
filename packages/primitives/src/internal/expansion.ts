import type { StableID } from '../shared.js';
import type { Expansion, Tree } from '../tree.js';

export type ExpansionState<ID extends StableID = StableID> = Expansion<ID>;

export function createExpansionState<ID extends StableID>(
  tree: Tree<ID>,
  expanded: Iterable<ID> = [],
): ExpansionState<ID> {
  return tree.normalizeExpansion(expanded);
}

export function reconcileExpansion<ID extends StableID>(
  state: ExpansionState<ID>,
  tree: Tree<ID>,
): ExpansionState<ID> {
  const result = tree.normalizeExpansion(state.ids);
  return sameExpansion(state, result) ? state : result;
}

export function setExpansionOpen<ID extends StableID>(
  state: ExpansionState<ID>,
  id: ID,
  open: boolean,
  tree: Tree<ID>,
): ExpansionState<ID> {
  if (tree.isLeaf(id) !== false || state.has(id) === open) return state;
  const expanded = open ? [...state.ids, id] : state.ids.filter((current) => current !== id);
  const result = tree.normalizeExpansion(expanded);
  return sameExpansion(state, result) ? state : result;
}

export function toggleExpansion<ID extends StableID>(
  state: ExpansionState<ID>,
  id: ID,
  tree: Tree<ID>,
): ExpansionState<ID> {
  return setExpansionOpen(state, id, !state.has(id), tree);
}

function sameExpansion<ID extends StableID>(
  left: ExpansionState<ID>,
  right: ExpansionState<ID>,
): boolean {
  if (left.ids.length !== right.ids.length) return false;
  return left.ids.every((id, index) => id === right.ids[index]);
}

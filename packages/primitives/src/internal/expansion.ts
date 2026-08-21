import type { StableId } from '../shared.js';
import type { Expansion, Tree } from '../tree.js';

export type ExpansionState<Id extends StableId = StableId> = Expansion<Id>;

export function createExpansionState<Id extends StableId>(
  tree: Tree<Id>,
  expanded: Iterable<Id> = [],
): ExpansionState<Id> {
  return tree.normalizeExpansion(expanded);
}

export function reconcileExpansion<Id extends StableId>(
  state: ExpansionState<Id>,
  tree: Tree<Id>,
): ExpansionState<Id> {
  const result = tree.normalizeExpansion(state.ids);
  return sameExpansion(state, result) ? state : result;
}

export function setExpansionOpen<Id extends StableId>(
  state: ExpansionState<Id>,
  id: Id,
  open: boolean,
  tree: Tree<Id>,
): ExpansionState<Id> {
  if (tree.isLeaf(id) !== false || state.has(id) === open) return state;
  const expanded = open ? [...state.ids, id] : state.ids.filter((current) => current !== id);
  const result = tree.normalizeExpansion(expanded);
  return sameExpansion(state, result) ? state : result;
}

export function toggleExpansion<Id extends StableId>(
  state: ExpansionState<Id>,
  id: Id,
  tree: Tree<Id>,
): ExpansionState<Id> {
  return setExpansionOpen(state, id, !state.has(id), tree);
}

function sameExpansion<Id extends StableId>(
  left: ExpansionState<Id>,
  right: ExpansionState<Id>,
): boolean {
  if (left.ids.length !== right.ids.length) return false;
  return left.ids.every((id, index) => id === right.ids[index]);
}

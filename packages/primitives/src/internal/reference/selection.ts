import type { StableId } from '../../shared.js';
import {
  type SelectionDomain,
  type SelectionMode,
  type SelectionState,
} from '../selection.js';

export class ReferenceSelectionState<Id extends StableId> implements SelectionState<Id> {
  public readonly selected: readonly Id[];
  public readonly anchor: Id | null;

  public constructor(selected: readonly Id[] = [], anchor: Id | null = null) {
    this.selected = Object.freeze([...new Set(selected)]);
    this.anchor = anchor;
    Object.freeze(this);
  }

  public get size(): number {
    return this.selected.length;
  }

  public has(id: Id): boolean {
    return this.selected.includes(id);
  }
}

export function reconcileReferenceSelection<Id extends StableId>(
  state: SelectionState<Id>,
  domain: SelectionDomain<Id>,
  mode: SelectionMode,
): SelectionState<Id> {
  if (mode === 'single' && new Set(state.selected).size > 1) {
    throw new TypeError('invalid single selection reference state');
  }
  const selected = state.selected.filter((id) => referenceContains(domain, id));
  const anchor = state.anchor !== null && referenceContains(domain, state.anchor)
    ? state.anchor
    : null;
  const result = referenceStateInDomain(domain, selected, anchor);
  return sameReferenceSelection(state, result) ? state : result;
}

export function referenceSelectOne<Id extends StableId>(
  state: SelectionState<Id>,
  id: Id,
  domain: SelectionDomain<Id>,
): SelectionState<Id> {
  return referenceContains(domain, id) ? new ReferenceSelectionState([id], id) : state;
}

export function referenceToggleMultipleSelection<Id extends StableId>(
  state: SelectionState<Id>,
  id: Id,
  domain: SelectionDomain<Id>,
): SelectionState<Id> {
  if (!referenceContains(domain, id)) return state;
  const selected = new Set(state.selected);
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  return referenceStateInDomain(domain, selected, id);
}

export function referenceClearSelection<Id extends StableId>(
  state: SelectionState<Id>,
): SelectionState<Id> {
  return state.size === 0 && state.anchor === null
    ? state
    : new ReferenceSelectionState([], null);
}

export function referenceSelectInterval<Id extends StableId>(
  state: SelectionState<Id>,
  anchor: Id,
  extent: Id,
  domain: SelectionDomain<Id>,
  additive: boolean,
): SelectionState<Id> {
  const anchorIndex = referenceIndexOf(domain, anchor);
  const extentIndex = referenceIndexOf(domain, extent);
  if (anchorIndex === null || extentIndex === null) return state;
  const selected = additive ? new Set(state.selected) : new Set<Id>();
  const start = Math.min(anchorIndex, extentIndex);
  const end = Math.max(anchorIndex, extentIndex);
  for (let index = start; index <= end; index += 1) {
    const id = domain.at(index);
    if (id !== null) selected.add(id);
  }
  return referenceStateInDomain(domain, selected, anchor);
}

function referenceContains<Id extends StableId>(domain: SelectionDomain<Id>, id: Id): boolean {
  return referenceIndexOf(domain, id) !== null;
}

function referenceIndexOf<Id extends StableId>(
  domain: SelectionDomain<Id>,
  id: Id,
): number | null {
  for (let index = 0; index < domain.size; index += 1) {
    if (domain.at(index) === id) return index;
  }
  return null;
}

function referenceStateInDomain<Id extends StableId>(
  domain: SelectionDomain<Id>,
  selected: Iterable<Id>,
  anchor: Id | null,
): SelectionState<Id> {
  const requested = new Set(selected);
  const ordered: Id[] = [];
  for (let index = 0; index < domain.size; index += 1) {
    const id = domain.at(index);
    if (id !== null && requested.has(id)) ordered.push(id);
  }
  return new ReferenceSelectionState(ordered, anchor);
}

function sameReferenceSelection<Id extends StableId>(
  left: SelectionState<Id>,
  right: SelectionState<Id>,
): boolean {
  return (
    left.anchor === right.anchor &&
    left.selected.length === right.selected.length &&
    left.selected.every((id, index) => id === right.selected[index])
  );
}

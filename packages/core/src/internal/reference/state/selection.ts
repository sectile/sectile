import type { StableID } from '../../../shared.js';
import {
  type SelectionDomain,
  type SelectionMode,
  type SelectionState,
} from '../../state/selection.js';

export class ReferenceSelectionState<ID extends StableID> implements SelectionState<ID> {
  public readonly selected: readonly ID[];
  public readonly anchor: ID | null;

  public constructor(selected: readonly ID[] = [], anchor: ID | null = null) {
    this.selected = Object.freeze([...new Set(selected)]);
    this.anchor = anchor;
    Object.freeze(this);
  }

  public get size(): number {
    return this.selected.length;
  }

  public has(id: ID): boolean {
    return this.selected.includes(id);
  }
}

export function reconcileReferenceSelection<ID extends StableID>(
  state: SelectionState<ID>,
  domain: SelectionDomain<ID>,
  mode: SelectionMode,
): SelectionState<ID> {
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

export function referenceSelectOne<ID extends StableID>(
  state: SelectionState<ID>,
  id: ID,
  domain: SelectionDomain<ID>,
): SelectionState<ID> {
  return referenceContains(domain, id) ? new ReferenceSelectionState([id], id) : state;
}

export function referenceToggleMultipleSelection<ID extends StableID>(
  state: SelectionState<ID>,
  id: ID,
  domain: SelectionDomain<ID>,
): SelectionState<ID> {
  if (!referenceContains(domain, id)) return state;
  const selected = new Set(state.selected);
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  return referenceStateInDomain(domain, selected, id);
}

export function referenceClearSelection<ID extends StableID>(
  state: SelectionState<ID>,
): SelectionState<ID> {
  return state.size === 0 && state.anchor === null
    ? state
    : new ReferenceSelectionState([], null);
}

export function referenceSelectInterval<ID extends StableID>(
  state: SelectionState<ID>,
  anchor: ID,
  extent: ID,
  domain: SelectionDomain<ID>,
  additive: boolean,
): SelectionState<ID> {
  const anchorIndex = referenceIndexOf(domain, anchor);
  const extentIndex = referenceIndexOf(domain, extent);
  if (anchorIndex === null || extentIndex === null) return state;
  const selected = additive ? new Set(state.selected) : new Set<ID>();
  const start = Math.min(anchorIndex, extentIndex);
  const end = Math.max(anchorIndex, extentIndex);
  for (let index = start; index <= end; index += 1) {
    const id = domain.at(index);
    if (id !== null) selected.add(id);
  }
  return referenceStateInDomain(domain, selected, anchor);
}

function referenceContains<ID extends StableID>(domain: SelectionDomain<ID>, id: ID): boolean {
  return referenceIndexOf(domain, id) !== null;
}

function referenceIndexOf<ID extends StableID>(
  domain: SelectionDomain<ID>,
  id: ID,
): number | null {
  for (let index = 0; index < domain.size; index += 1) {
    if (domain.at(index) === id) return index;
  }
  return null;
}

function referenceStateInDomain<ID extends StableID>(
  domain: SelectionDomain<ID>,
  selected: Iterable<ID>,
  anchor: ID | null,
): SelectionState<ID> {
  const requested = new Set(selected);
  const ordered: ID[] = [];
  for (let index = 0; index < domain.size; index += 1) {
    const id = domain.at(index);
    if (id !== null && requested.has(id)) ordered.push(id);
  }
  return new ReferenceSelectionState(ordered, anchor);
}

function sameReferenceSelection<ID extends StableID>(
  left: SelectionState<ID>,
  right: SelectionState<ID>,
): boolean {
  return (
    left.anchor === right.anchor &&
    left.selected.length === right.selected.length &&
    left.selected.every((id, index) => id === right.selected[index])
  );
}

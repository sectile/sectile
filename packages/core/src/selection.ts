import type { Result, StableID } from './shared.js';
import {
  clearSelection as clearSelectionInternal,
  createSelectionState as createSelectionStateInternal,
  reconcileSelection as reconcileSelectionInternal,
  selectInterval as selectIntervalInternal,
  selectOne as selectOneInternal,
  toggleMultipleSelection as toggleMultipleSelectionInternal,
} from './internal/state/selection.js';

export type SelectionMode = 'single' | 'multiple';

export interface SelectionDomain<ID extends StableID = StableID> {
  readonly size: number;
  contains(id: ID): boolean;
  at(index: number): ID | null;
  indexOf(id: ID): number | null;
}

export interface SelectionState<ID extends StableID = StableID> {
  readonly selected: readonly ID[];
  readonly anchor: ID | null;
  readonly size: number;
  has(id: ID): boolean;
}

export interface SelectionSnapshotInput<ID extends StableID = StableID> {
  readonly selected?: readonly ID[];
  readonly anchor?: ID | null;
}

export function createSelectionState<ID extends StableID>(
  domain: SelectionDomain<ID>,
  mode: SelectionMode,
  input: SelectionSnapshotInput<ID> = {},
): Result<SelectionState<ID>> {
  return createSelectionStateInternal(domain, mode, input);
}

export function reconcileSelection<ID extends StableID>(
  state: SelectionState<ID>,
  domain: SelectionDomain<ID>,
  mode: SelectionMode,
): Result<SelectionState<ID>> {
  return reconcileSelectionInternal(state, domain, mode);
}

export function selectOne<ID extends StableID>(
  state: SelectionState<ID>,
  id: ID,
  domain: SelectionDomain<ID>,
): SelectionState<ID> {
  return selectOneInternal(state, id, domain);
}

export function toggleMultipleSelection<ID extends StableID>(
  state: SelectionState<ID>,
  id: ID,
  domain: SelectionDomain<ID>,
): SelectionState<ID> {
  return toggleMultipleSelectionInternal(state, id, domain);
}

export function clearSelection<ID extends StableID>(
  state: SelectionState<ID>,
): SelectionState<ID> {
  return clearSelectionInternal(state);
}

export function selectInterval<ID extends StableID>(
  state: SelectionState<ID>,
  anchor: ID,
  extent: ID,
  domain: SelectionDomain<ID>,
  additive: boolean,
): SelectionState<ID> {
  return selectIntervalInternal(state, anchor, extent, domain, additive);
}

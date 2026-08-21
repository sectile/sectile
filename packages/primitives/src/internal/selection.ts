import type { Result, StableID } from '../shared.js';
import type { CursorDomain } from './cursor.js';
import { fail, freezeArray, ok } from './foundation.js';

export type SelectionMode = 'single' | 'multiple';

export interface SelectionDomain<ID extends StableID = StableID> extends CursorDomain<ID> {
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

class ImmutableSelectionState<ID extends StableID> implements SelectionState<ID> {
  public readonly selected: readonly ID[];
  public readonly anchor: ID | null;
  readonly #selected: ReadonlySet<ID>;

  public constructor(selected: readonly ID[], anchor: ID | null) {
    this.selected = freezeArray(selected);
    this.anchor = anchor;
    this.#selected = new Set(this.selected);
    Object.freeze(this);
  }

  public get size(): number {
    return this.selected.length;
  }

  public has(id: ID): boolean {
    return this.#selected.has(id);
  }
}

export function createSelectionState<ID extends StableID>(
  domain: SelectionDomain<ID>,
  mode: SelectionMode,
  input: SelectionSnapshotInput<ID> = {},
): Result<SelectionState<ID>> {
  if (!isSelectionMode(mode)) {
    return fail('construction', 'invalid-selection-mode', 'Selection mode must be single or multiple.', {
      mode,
    });
  }

  const requested = new Set(input.selected ?? []);
  if (mode === 'single' && requested.size > 1) {
    return fail(
      'construction',
      'invalid-selection-cardinality',
      'Single selection must contain at most one identity.',
      { selectedCount: requested.size },
    );
  }
  for (const id of requested) {
    if (!domain.contains(id)) {
      return fail(
        'construction',
        'selected-id-outside-domain',
        'Every selected identity must exist in the selection domain.',
        { id },
      );
    }
  }

  const anchor = input.anchor ?? null;
  if (anchor !== null && !domain.contains(anchor)) {
    return fail(
      'construction',
      'selection-anchor-outside-domain',
      'Selection anchor must exist in the selection domain.',
      { anchor },
    );
  }
  return ok(selectionFromSet(domain, requested, anchor));
}

export function reconcileSelection<ID extends StableID>(
  state: SelectionState<ID>,
  domain: SelectionDomain<ID>,
  mode: SelectionMode,
): Result<SelectionState<ID>> {
  if (!isSelectionMode(mode)) {
    return fail(
      'transition-rejection',
      'invalid-selection-mode',
      'Selection mode must be single or multiple.',
      { mode },
    );
  }

  const selected = new Set(state.selected);
  if (mode === 'single' && selected.size > 1) {
    return fail(
      'transition-rejection',
      'invalid-selection-cardinality',
      'A multiple selection snapshot cannot be reconciled in single mode.',
      { selectedCount: selected.size },
    );
  }

  for (const id of selected) {
    if (!domain.contains(id)) selected.delete(id);
  }
  const anchor = state.anchor !== null && domain.contains(state.anchor) ? state.anchor : null;
  const result = selectionFromSet(domain, selected, anchor);
  return ok(sameSelection(state, result) ? state : result);
}

export function selectOne<ID extends StableID>(
  state: SelectionState<ID>,
  id: ID,
  domain: SelectionDomain<ID>,
): SelectionState<ID> {
  if (!domain.contains(id)) return state;
  if (state.size === 1 && state.has(id) && state.anchor === id) return state;
  return new ImmutableSelectionState([id], id);
}

export function toggleMultipleSelection<ID extends StableID>(
  state: SelectionState<ID>,
  id: ID,
  domain: SelectionDomain<ID>,
): SelectionState<ID> {
  if (!domain.contains(id)) return state;
  const selected = new Set(state.selected);
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  return selectionFromSet(domain, selected, id);
}

export function clearSelection<ID extends StableID>(
  state: SelectionState<ID>,
): SelectionState<ID> {
  return state.size === 0 && state.anchor === null
    ? state
    : new ImmutableSelectionState([], null);
}

export function selectInterval<ID extends StableID>(
  state: SelectionState<ID>,
  anchor: ID,
  extent: ID,
  domain: SelectionDomain<ID>,
  additive: boolean,
): SelectionState<ID> {
  const anchorIndex = domain.indexOf(anchor);
  const extentIndex = domain.indexOf(extent);
  if (anchorIndex === null || extentIndex === null) return state;

  const selected = additive ? new Set(state.selected) : new Set<ID>();
  const start = Math.min(anchorIndex, extentIndex);
  const end = Math.max(anchorIndex, extentIndex);
  for (let index = start; index <= end; index += 1) {
    const id = domain.at(index);
    if (id !== null) selected.add(id);
  }
  return selectionFromSet(domain, selected, anchor);
}

function selectionFromSet<ID extends StableID>(
  domain: SelectionDomain<ID>,
  selected: ReadonlySet<ID>,
  anchor: ID | null,
): SelectionState<ID> {
  const ordered: ID[] = [];
  for (let index = 0; index < domain.size; index += 1) {
    const id = domain.at(index);
    if (id !== null && selected.has(id)) ordered.push(id);
  }
  return new ImmutableSelectionState(ordered, anchor);
}

function sameSelection<ID extends StableID>(
  left: SelectionState<ID>,
  right: SelectionState<ID>,
): boolean {
  if (left.anchor !== right.anchor || left.selected.length !== right.selected.length) return false;
  return left.selected.every((id, index) => id === right.selected[index]);
}

function isSelectionMode(value: string): value is SelectionMode {
  return value === 'single' || value === 'multiple';
}

import type { Result, StableId } from '../shared.js';
import type { CursorDomain } from './cursor.js';
import { fail, freezeArray, ok } from './foundation.js';

export type SelectionMode = 'single' | 'multiple';

export interface SelectionDomain<Id extends StableId = StableId> extends CursorDomain<Id> {
  indexOf(id: Id): number | null;
}

export interface SelectionState<Id extends StableId = StableId> {
  readonly selected: readonly Id[];
  readonly anchor: Id | null;
  readonly size: number;
  has(id: Id): boolean;
}

export interface SelectionSnapshotInput<Id extends StableId = StableId> {
  readonly selected?: readonly Id[];
  readonly anchor?: Id | null;
}

class ImmutableSelectionState<Id extends StableId> implements SelectionState<Id> {
  public readonly selected: readonly Id[];
  public readonly anchor: Id | null;
  readonly #selected: ReadonlySet<Id>;

  public constructor(selected: readonly Id[], anchor: Id | null) {
    this.selected = freezeArray(selected);
    this.anchor = anchor;
    this.#selected = new Set(this.selected);
    Object.freeze(this);
  }

  public get size(): number {
    return this.selected.length;
  }

  public has(id: Id): boolean {
    return this.#selected.has(id);
  }
}

export function createSelectionState<Id extends StableId>(
  domain: SelectionDomain<Id>,
  mode: SelectionMode,
  input: SelectionSnapshotInput<Id> = {},
): Result<SelectionState<Id>> {
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

export function reconcileSelection<Id extends StableId>(
  state: SelectionState<Id>,
  domain: SelectionDomain<Id>,
  mode: SelectionMode,
): Result<SelectionState<Id>> {
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

export function selectOne<Id extends StableId>(
  state: SelectionState<Id>,
  id: Id,
  domain: SelectionDomain<Id>,
): SelectionState<Id> {
  if (!domain.contains(id)) return state;
  if (state.size === 1 && state.has(id) && state.anchor === id) return state;
  return new ImmutableSelectionState([id], id);
}

export function toggleMultipleSelection<Id extends StableId>(
  state: SelectionState<Id>,
  id: Id,
  domain: SelectionDomain<Id>,
): SelectionState<Id> {
  if (!domain.contains(id)) return state;
  const selected = new Set(state.selected);
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  return selectionFromSet(domain, selected, id);
}

export function clearSelection<Id extends StableId>(
  state: SelectionState<Id>,
): SelectionState<Id> {
  return state.size === 0 && state.anchor === null
    ? state
    : new ImmutableSelectionState([], null);
}

export function selectInterval<Id extends StableId>(
  state: SelectionState<Id>,
  anchor: Id,
  extent: Id,
  domain: SelectionDomain<Id>,
  additive: boolean,
): SelectionState<Id> {
  const anchorIndex = domain.indexOf(anchor);
  const extentIndex = domain.indexOf(extent);
  if (anchorIndex === null || extentIndex === null) return state;

  const selected = additive ? new Set(state.selected) : new Set<Id>();
  const start = Math.min(anchorIndex, extentIndex);
  const end = Math.max(anchorIndex, extentIndex);
  for (let index = start; index <= end; index += 1) {
    const id = domain.at(index);
    if (id !== null) selected.add(id);
  }
  return selectionFromSet(domain, selected, anchor);
}

function selectionFromSet<Id extends StableId>(
  domain: SelectionDomain<Id>,
  selected: ReadonlySet<Id>,
  anchor: Id | null,
): SelectionState<Id> {
  const ordered: Id[] = [];
  for (let index = 0; index < domain.size; index += 1) {
    const id = domain.at(index);
    if (id !== null && selected.has(id)) ordered.push(id);
  }
  return new ImmutableSelectionState(ordered, anchor);
}

function sameSelection<Id extends StableId>(
  left: SelectionState<Id>,
  right: SelectionState<Id>,
): boolean {
  if (left.anchor !== right.anchor || left.selected.length !== right.selected.length) return false;
  return left.selected.every((id, index) => id === right.selected[index]);
}

function isSelectionMode(value: string): value is SelectionMode {
  return value === 'single' || value === 'multiple';
}

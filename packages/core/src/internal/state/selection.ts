import type { Result, StableID } from '../../shared.js';
import type { CursorDomain } from './cursor.js';
import { fail, freezeArray, ok } from '../kernel/foundation.js';

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
  readonly #domain: SelectionDomain<ID> | null;
  readonly #indexes: readonly number[];

  public constructor(
    selected: readonly ID[],
    indexes: readonly number[],
    anchor: ID | null,
    domain: SelectionDomain<ID> | null,
  ) {
    this.selected = Object.isFrozen(selected) ? selected : freezeArray(selected);
    this.anchor = anchor;
    this.#selected = new Set(this.selected);
    this.#domain = domain;
    this.#indexes = Object.isFrozen(indexes) ? indexes : freezeArray(indexes);
    Object.freeze(this);
  }

  public get size(): number {
    return this.selected.length;
  }

  public has(id: ID): boolean {
    return this.#selected.has(id);
  }

  public indexesFor(domain: SelectionDomain<ID>): readonly number[] | null {
    return this.#domain === domain ? this.#indexes : null;
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
  const indexed: Array<readonly [number, ID]> = [];
  for (const id of requested) {
    const index = domain.indexOf(id);
    if (index === null) {
      return fail(
        'construction',
        'selected-id-outside-domain',
        'Every selected identity must exist in the selection domain.',
        { id },
      );
    }
    indexed.push([index, id]);
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
  return ok(selectionFromIndexed(domain, indexed, anchor));
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

  const indexed: Array<readonly [number, ID]> = [];
  for (const id of selected) {
    const index = domain.indexOf(id);
    if (index !== null) indexed.push([index, id]);
  }
  const anchor = state.anchor !== null && domain.contains(state.anchor) ? state.anchor : null;
  const result = selectionFromIndexed(domain, indexed, anchor);
  return ok(sameSelection(state, result) ? state : result);
}

export function selectOne<ID extends StableID>(
  state: SelectionState<ID>,
  id: ID,
  domain: SelectionDomain<ID>,
): SelectionState<ID> {
  const index = domain.indexOf(id);
  if (index === null) return state;
  if (state.size === 1 && state.has(id) && state.anchor === id) return state;
  return new ImmutableSelectionState([id], [index], id, domain);
}

export function toggleMultipleSelection<ID extends StableID>(
  state: SelectionState<ID>,
  id: ID,
  domain: SelectionDomain<ID>,
): SelectionState<ID> {
  const domainIndex = domain.indexOf(id);
  if (domainIndex === null) return state;
  const canonical = canonicalSelection(state, domain);
  const position = lowerBound(canonical.indexes, domainIndex);
  const selected = [...canonical.selected];
  const indexes = [...canonical.indexes];
  if (indexes[position] === domainIndex) {
    selected.splice(position, 1);
    indexes.splice(position, 1);
  } else {
    selected.splice(position, 0, id);
    indexes.splice(position, 0, domainIndex);
  }
  return new ImmutableSelectionState(
    Object.freeze(selected),
    Object.freeze(indexes),
    id,
    domain,
  );
}

export function clearSelection<ID extends StableID>(
  state: SelectionState<ID>,
): SelectionState<ID> {
  return state.size === 0 && state.anchor === null
    ? state
    : new ImmutableSelectionState(Object.freeze([]), Object.freeze([]), null, null);
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

  const start = Math.min(anchorIndex, extentIndex);
  const end = Math.max(anchorIndex, extentIndex);
  const range: Array<readonly [number, ID]> = [];
  for (let index = start; index <= end; index += 1) {
    const id = domain.at(index);
    if (id !== null) range.push([index, id]);
  }
  if (!additive) return selectionFromIndexed(domain, range, anchor);

  const canonical = canonicalSelection(state, domain);
  const selected: ID[] = [];
  const indexes: number[] = [];
  let existingPosition = 0;
  let rangePosition = 0;
  while (existingPosition < canonical.indexes.length || rangePosition < range.length) {
    const existingIndex = canonical.indexes[existingPosition] ?? Number.POSITIVE_INFINITY;
    const rangeEntry = range[rangePosition];
    const rangeIndex = rangeEntry?.[0] ?? Number.POSITIVE_INFINITY;
    if (existingIndex < rangeIndex) {
      indexes.push(existingIndex);
      selected.push(canonical.selected[existingPosition]!);
      existingPosition += 1;
    } else {
      indexes.push(rangeIndex);
      selected.push(rangeEntry![1]);
      rangePosition += 1;
      if (existingIndex === rangeIndex) existingPosition += 1;
    }
  }
  return new ImmutableSelectionState(
    Object.freeze(selected),
    Object.freeze(indexes),
    anchor,
    domain,
  );
}

function selectionFromIndexed<ID extends StableID>(
  domain: SelectionDomain<ID>,
  indexed: readonly (readonly [number, ID])[],
  anchor: ID | null,
): SelectionState<ID> {
  const sorted = [...indexed].sort((left, right) => left[0] - right[0]);
  const indexes = Object.freeze(sorted.map((entry) => entry[0]));
  const selected = Object.freeze(sorted.map((entry) => entry[1]));
  return new ImmutableSelectionState(selected, indexes, anchor, domain);
}

function canonicalSelection<ID extends StableID>(
  state: SelectionState<ID>,
  domain: SelectionDomain<ID>,
): { readonly selected: readonly ID[]; readonly indexes: readonly number[] } {
  if (state instanceof ImmutableSelectionState) {
    const indexes = state.indexesFor(domain);
    if (indexes !== null) return { selected: state.selected, indexes };
  }
  const indexed: Array<readonly [number, ID]> = [];
  for (const id of new Set(state.selected)) {
    const index = domain.indexOf(id);
    if (index !== null) indexed.push([index, id]);
  }
  indexed.sort((left, right) => left[0] - right[0]);
  return {
    selected: indexed.map((entry) => entry[1]),
    indexes: indexed.map((entry) => entry[0]),
  };
}

function lowerBound(values: readonly number[], target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if ((values[middle] ?? Number.POSITIVE_INFINITY) < target) low = middle + 1;
    else high = middle;
  }
  return low;
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


import { createSequence, type BoundaryPolicy, type Direction, type MoveResult, type ScanOptions, type Sequence } from '@sectile/core/sequence';
import type { Extent } from '@sectile/virtual/extent-index';
import type { LinearLayoutState, LinearPatch } from '@sectile/virtual/linear-layout';

export type VirtualListKeyResolver<Value> = {
  bivarianceHack(value: Value, index: number): string;
}['bivarianceHack'];
export type VirtualListEstimate<Value> = number | {
  bivarianceHack(value: Value, index: number): number;
}['bivarianceHack'];
export type VirtualListItemAttributes<Value> = {
  bivarianceHack(
    value: Value,
    index: number,
  ): Readonly<Record<string, unknown>>;
}['bivarianceHack'];

export interface PreparedVirtualList {
  readonly items: readonly unknown[];
  readonly ids: readonly string[];
  readonly getKey: VirtualListKeyResolver<unknown>;
  readonly change: PreparedVirtualListChange | null;
  readonly initialIndex: ReadonlyMap<string, number> | null;
}

export interface PreparedVirtualListChange {
  readonly index: number;
  readonly deleteCount: number;
  readonly inserted: readonly string[];
}

export function prepareVirtualList(
  items: readonly unknown[],
  getKey: VirtualListKeyResolver<unknown>,
): PreparedVirtualList {
  const ids: string[] = [];
  const indexByID = new Map<string, number>();
  for (let index = 0; index < items.length; index += 1) {
    const value = items[index];
    const id = getKey(value, index);
    if (typeof id !== 'string' || id.length === 0) {
      throw new TypeError('VirtualList getKey must return a non-empty string.');
    }
    if (id.length > 1_024) {
      throw new TypeError('VirtualList keys must contain at most 1,024 UTF-16 code units.');
    }
    if (!isWellFormedVirtualListKey(id)) {
      throw new TypeError('VirtualList keys must be well-formed UTF-16 strings.');
    }
    if (indexByID.has(id)) {
      throw new TypeError(`VirtualList getKey returned the duplicate key ${JSON.stringify(id)}.`);
    }
    ids.push(id);
    indexByID.set(id, index);
  }
  return Object.freeze({
    items,
    ids: Object.freeze(ids),
    getKey,
    change: null,
    initialIndex: indexByID,
  });
}

export function updatePreparedVirtualList(
  previous: PreparedVirtualList,
  items: readonly unknown[],
  getKey: VirtualListKeyResolver<unknown>,
): PreparedVirtualList {
  if (previous.items === items && previous.getKey === getKey) return previous;
  if (previous.getKey !== getKey) {
    const prepared = prepareVirtualList(items, getKey);
    let prefix = 0;
    while (
      prefix < previous.ids.length
      && prefix < prepared.ids.length
      && previous.ids[prefix] === prepared.ids[prefix]
    ) prefix += 1;
    let suffix = 0;
    while (
      suffix < previous.ids.length - prefix
      && suffix < prepared.ids.length - prefix
      && previous.ids[previous.ids.length - suffix - 1]
        === prepared.ids[prepared.ids.length - suffix - 1]
    ) suffix += 1;
    if (prefix === previous.ids.length && prefix === prepared.ids.length) {
      return Object.freeze({
        items,
        ids: previous.ids,
        getKey,
        change: null,
        initialIndex: previous.initialIndex,
      });
    }
    const inserted = Object.freeze(prepared.ids.slice(prefix, prepared.ids.length - suffix));
    return Object.freeze({
      ...prepared,
      change: Object.freeze({
        index: prefix,
        deleteCount: previous.ids.length - prefix - suffix,
        inserted,
      }),
    });
  }
  let prefix = 0;
  while (
    prefix < previous.items.length
    && prefix < items.length
    && Object.is(previous.items[prefix], items[prefix])
  ) prefix += 1;
  let suffix = 0;
  while (
    suffix < previous.items.length - prefix
    && suffix < items.length - prefix
    && Object.is(
      previous.items[previous.items.length - suffix - 1],
      items[items.length - suffix - 1],
    )
  ) suffix += 1;
  if (prefix === previous.items.length && prefix === items.length) {
    return Object.freeze({
      items,
      ids: previous.ids,
      getKey,
      change: null,
      initialIndex: previous.initialIndex,
    });
  }
  const changedEnd = items.length - suffix;
  if (previous.items.length === items.length) {
    let sameDomain = true;
    for (let index = prefix; index < changedEnd; index += 1) {
      if (validateVirtualListKey(getKey(items[index], index)) !== previous.ids[index]) {
        sameDomain = false;
        break;
      }
    }
    if (sameDomain) {
      return Object.freeze({
        items,
        ids: previous.ids,
        getKey,
        change: null,
        initialIndex: previous.initialIndex,
      });
    }
  }
  const inserted: string[] = [];
  const insertedIDs = new Set<string>();
  for (let index = prefix; index < changedEnd; index += 1) {
    const id = validateVirtualListKey(getKey(items[index], index));
    if (insertedIDs.has(id)) {
      throw new TypeError(`VirtualList getKey returned the duplicate key ${JSON.stringify(id)}.`);
    }
    inserted.push(id);
    insertedIDs.add(id);
  }
  const frozenInserted = Object.freeze(inserted);
  return Object.freeze({
    items,
    ids: Object.freeze([
      ...previous.ids.slice(0, prefix),
      ...frozenInserted,
      ...previous.ids.slice(previous.ids.length - suffix),
    ]),
    getKey,
    initialIndex: null,
    change: Object.freeze({
      index: prefix,
      deleteCount: previous.ids.length - prefix - suffix,
      inserted: frozenInserted,
    }),
  });
}

export function validateVirtualListKey(id: string): string {
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('VirtualList getKey must return a non-empty string.');
  }
  if (id.length > 1_024) {
    throw new TypeError('VirtualList keys must contain at most 1,024 UTF-16 code units.');
  }
  if (!isWellFormedVirtualListKey(id)) {
    throw new TypeError('VirtualList keys must be well-formed UTF-16 strings.');
  }
  return id;
}

export function createPreparedVirtualListSequence(
  prepared: PreparedVirtualList,
  maxItems: number,
): Sequence<string> {
  if (!Number.isSafeInteger(maxItems) || maxItems < 0) {
    throw new TypeError('VirtualList maxItems must be a non-negative safe integer.');
  }
  if (prepared.ids.length > maxItems) {
    throw new RangeError(`VirtualList received ${prepared.ids.length} items, exceeding maxItems ${maxItems}.`);
  }
  const index = prepared.initialIndex;
  if (index === null) return createSequence(prepared.ids, { maxItems, maxIDCodeUnits: 1_024 });
  let materialized: Sequence<string> | undefined;
  const complete = (): Sequence<string> => {
    materialized ??= createSequence(prepared.ids, { maxItems, maxIDCodeUnits: 1_024 });
    return materialized;
  };
  return Object.freeze({
    size: prepared.ids.length,
    ids: prepared.ids,
    maxItems,
    maxIDCodeUnits: 1_024,
    at: (position: number): string | null => (
      Number.isSafeInteger(position) && position >= 0 && position < prepared.ids.length
        ? prepared.ids[position] ?? null
        : null
    ),
    indexOf: (id: string): number | null => index.get(id) ?? null,
    contains: (id: string): boolean => index.has(id),
    compare: (left: string, right: string): -1 | 0 | 1 | null => {
      const leftIndex = index.get(left);
      const rightIndex = index.get(right);
      if (leftIndex === undefined || rightIndex === undefined) return null;
      return leftIndex === rightIndex ? 0 : leftIndex < rightIndex ? -1 : 1;
    },
    project: (predicate: (id: string, position: number) => boolean): Sequence<string> =>
      complete().project(predicate),
    move: (
      current: string,
      direction: Direction,
      boundary?: BoundaryPolicy,
      options?: ScanOptions<string>,
    ): MoveResult<string> => complete().move(current, direction, boundary, options),
  });
}

export function isWellFormedVirtualListKey(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

export function reconcileVirtualList(
  state: Pick<LinearLayoutState<string>, 'domain' | 'extents'>,
  next: PreparedVirtualList,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualListEstimate<unknown> | undefined;
  }>,
  automaticEstimate?: number,
): LinearPatch<string> | null {
  const change = next.change;
  if (change === null) return null;
  const inserted = change.inserted;
  return Object.freeze({
    patch: Object.freeze({
      type: 'splice',
      index: change.index,
      deleteCount: change.deleteCount,
      inserted,
    }),
    insertedExtents: Object.freeze(inserted.map((id, localIndex) => {
      const nextIndex = change.index + localIndex;
      const previousIndex = state.domain.indexOf(id);
      return (previousIndex === null ? null : state.extents.extentAt(previousIndex))
        ?? initialExtent(props, items[nextIndex], nextIndex, automaticEstimate);
    })),
  });
}

export function assertVirtualListSizeMode(
  itemSize: number | undefined,
  estimateSize: VirtualListEstimate<unknown> | undefined,
): void {
  if (itemSize !== undefined && estimateSize !== undefined) {
    throw new TypeError('VirtualList itemSize and estimateSize are mutually exclusive.');
  }
}

export function initialExtent(
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualListEstimate<unknown> | undefined;
  }>,
  value: unknown,
  index: number,
  automaticEstimate?: number,
): Extent {
  return props.itemSize === undefined
    ? estimatedExtent(requireAutomaticEstimate(props.estimateSize ?? automaticEstimate), value, index)
    : exactExtent(props.itemSize);
}

export function requireAutomaticEstimate(
  estimate: VirtualListEstimate<unknown> | undefined,
): VirtualListEstimate<unknown> {
  if (estimate === undefined) {
    throw new TypeError('Automatic virtual size must be measured before layout initialization.');
  }
  return estimate;
}

export function requiresDOMBootstrap(
  itemSize: number | undefined,
  estimateSize: VirtualListEstimate<unknown> | undefined,
): boolean {
  return itemSize === undefined && estimateSize === undefined;
}

export function exactExtent(value: number): Extent {
  return Object.freeze({ kind: 'exact', value });
}

export function estimatedExtent(
  estimate: VirtualListEstimate<unknown>,
  value: unknown,
  index: number,
): Extent {
  return Object.freeze({
    kind: 'unknown',
    fallback: typeof estimate === 'number' ? estimate : estimate(value, index),
  });
}

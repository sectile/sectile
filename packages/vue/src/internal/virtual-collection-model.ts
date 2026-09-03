import type { Sequence } from '@sectile/core/sequence';
import {
  constrainVirtualCollectionDomain,
  createEstimatedVirtualExtent,
  createExactVirtualExtent,
  createVirtualCollection,
  reconcileVirtualCollectionExtents,
  replaceVirtualCollection,
  virtualSizePolicyRequiresMeasurement,
  type VirtualCollectionChange,
  type VirtualCollectionIDResolver,
  type VirtualCollectionProjection,
  type VirtualCollectionValueChange,
  type VirtualExtentEstimate,
  type VirtualSizePolicy,
} from '@sectile/virtual/collection';
import type { Extent } from '@sectile/virtual/extent-index';
import type { LinearLayoutState, LinearPatch } from '@sectile/virtual/linear-layout';

export type VirtualListKeyResolver<Value> =
  VirtualCollectionIDResolver<Value, string>;
export type VirtualListEstimate<Value> = VirtualExtentEstimate<Value>;
export type VirtualListItemAttributes<Value> = {
  bivarianceHack(
    value: Value,
    index: number,
  ): Readonly<Record<string, unknown>>;
}['bivarianceHack'];

export type PreparedVirtualList = VirtualCollectionProjection<unknown, string>;
export type PreparedVirtualListChange = VirtualCollectionChange<string>;
export type PreparedVirtualListValueChange = VirtualCollectionValueChange;

export function prepareVirtualList(
  items: readonly unknown[],
  getKey: VirtualListKeyResolver<unknown>,
  maxItems = 1_000_000,
): PreparedVirtualList {
  return createVirtualCollection(items, getKey, {
    maxItems,
    maxIDCodeUnits: 1_024,
  });
}

export function updatePreparedVirtualList(
  previous: PreparedVirtualList,
  items: readonly unknown[],
  getKey: VirtualListKeyResolver<unknown>,
): PreparedVirtualList {
  return replaceVirtualCollection(previous, items, getKey);
}

export function createPreparedVirtualListSequence(
  prepared: PreparedVirtualList,
  maxItems: number,
): Sequence<string> {
  return constrainVirtualCollectionDomain(prepared, maxItems);
}

export function reconcileVirtualList(
  state: Pick<LinearLayoutState<string>, 'domain' | 'extents'>,
  next: PreparedVirtualList,
  _items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualListEstimate<unknown> | undefined;
  }>,
  automaticEstimate?: number,
): LinearPatch<string> | null {
  return reconcileVirtualCollectionExtents(
    state,
    next,
    legacySizePolicy(props.itemSize, props.estimateSize),
    automaticEstimate,
  );
}

export function assertVirtualListSizeMode(
  itemSize: number | undefined,
  estimateSize: VirtualListEstimate<unknown> | undefined,
): void {
  if (itemSize !== undefined && estimateSize !== undefined) {
    throw new TypeError('VirtualList itemSize and estimateSize are mutually exclusive.');
  }
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
  return virtualSizePolicyRequiresMeasurement(
    legacySizePolicy(itemSize, estimateSize),
  );
}

export function exactExtent(value: number): Extent {
  return createExactVirtualExtent(value);
}

export function estimatedExtent(
  estimate: VirtualListEstimate<unknown>,
  value: unknown,
  index: number,
): Extent {
  return createEstimatedVirtualExtent(estimate, value, index);
}

function legacySizePolicy(
  itemSize: number | undefined,
  estimateSize: VirtualListEstimate<unknown> | undefined,
): VirtualSizePolicy<unknown> {
  if (itemSize !== undefined) {
    return Object.freeze({ kind: 'fixed', extent: itemSize });
  }
  if (estimateSize !== undefined) {
    return Object.freeze({ kind: 'estimated', estimate: estimateSize });
  }
  return Object.freeze({ kind: 'measured' });
}

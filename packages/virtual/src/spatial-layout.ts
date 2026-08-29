import type { StableID } from '@sectile/core';
import type { VirtualResult } from './error.js';
import {
  tryApplySequencePatch,
  tryCreateSequence,
  type Sequence,
  type SequencePatch,
} from '@sectile/core/sequence';
import { unwrap } from '@sectile/core/result';
import { boundsOfRects, createRect, isFiniteRect } from '@sectile/core/geometry';
import { blockedRepairBound, createBlockedVector, type BlockedVector, useBlockedRepair } from './internal/blocked-vector.js';
import { fail, ok } from './internal/foundation.js';
import { recordRepairDiagnostics } from './internal/repair-diagnostics.js';
import {
  alignedScrollOffset, anchorForPlan, normalizeQuery, pointDelta, rectanglesIntersect, ZERO_POINT,
  type VirtualAnchor, type VirtualLayoutMutation, type VirtualLayoutPlan, type VirtualLayoutStrategy,
  type VirtualMeasurementBatch, type VirtualPlacement, type VirtualPoint, type VirtualQueryInput,
  type VirtualIndexedView, type VirtualRect, type VirtualScrollAlignment,
} from './layout.js';

export interface SpatialItem<ID extends StableID = StableID> {
  readonly id: ID;
  readonly rect: VirtualRect;
  readonly zIndex?: number;
}

const spatialLayoutStateBrand: unique symbol = Symbol('SectileSpatialLayoutState');

export interface SpatialLayoutState<ID extends StableID = StableID> {
  readonly [spatialLayoutStateBrand]: true;
  readonly domain: Sequence<ID>;
  readonly items: VirtualIndexedView<SpatialItem<ID>>;
  readonly maxItems: number;
  readonly generation: number;
}

export interface SpatialLayoutSnapshot<ID extends StableID = StableID> {
  readonly schemaVersion: 1;
  readonly kind: 'spatial';
  readonly items: readonly SpatialItem<ID>[];
  readonly maxItems: number;
  readonly generation: number;
}

export interface SpatialLayoutInput { readonly maxItems?: number; }
export interface SpatialMeasurement<ID extends StableID = StableID> { readonly id: ID; readonly rect: VirtualRect; }

export type SpatialMutation<ID extends StableID = StableID> =
  | { readonly type: 'replace'; readonly items: readonly SpatialItem<ID>[] }
  | { readonly type: 'update'; readonly upsert?: readonly SpatialItem<ID>[]; readonly remove?: readonly ID[] }
  | {
      readonly type: 'patch';
      readonly patch: SequencePatch<ID>;
      readonly inserted: readonly SpatialItem<ID>[];
    };

export interface SpatialPlacement<ID extends StableID = StableID> extends VirtualPlacement<ID> { readonly zIndex: number; }
export interface SpatialLayoutPlan<ID extends StableID = StableID> extends VirtualLayoutPlan<ID> { readonly placements: readonly SpatialPlacement<ID>[]; }

interface IndexedSpatialItem<ID extends StableID> {
  readonly value: SpatialItem<ID>;
  readonly index: number;
  readonly zIndex: number;
}

interface SpatialNode<ID extends StableID> {
  readonly bounds: VirtualRect;
  readonly items: readonly IndexedSpatialItem<ID>[] | null;
  readonly children: readonly SpatialNode<ID>[] | null;
  readonly leafCount: number;
}

interface SpatialInternals<ID extends StableID> {
  readonly root: SpatialNode<ID> | null;
  readonly byID: ReadonlyMap<ID, number>;
  readonly items: BlockedVector<SpatialItem<ID>>;
  readonly leafIndexByItemIndex: readonly number[];
  readonly contentSize: { readonly width: number; readonly height: number };
}

const LEAF_SIZE = 64;
const internals = new WeakMap<SpatialLayoutState, SpatialInternals<StableID>>();

export const spatialLayoutStrategy: VirtualLayoutStrategy<SpatialLayoutState, StableID, SpatialMeasurement, SpatialMutation> = Object.freeze({
  kind: 'spatial',
  tryQuery: (state: SpatialLayoutState, input: VirtualQueryInput) => tryQuerySpatialLayout(state, input),
  tryMeasure: (state: SpatialLayoutState, batch: VirtualMeasurementBatch<SpatialMeasurement>) => tryApplySpatialMeasurements(state, batch),
  tryMutate: (state: SpatialLayoutState, input: { readonly mutation: SpatialMutation; readonly anchor?: VirtualAnchor | null }) => tryApplySpatialMutation(state, input.mutation, input.anchor),
  tryScrollTarget: (state: SpatialLayoutState, id: StableID, viewport: VirtualRect, alignment?: VirtualScrollAlignment) => trySpatialScrollTarget(state, id, viewport, alignment),
});

export function createSpatialLayout<ID extends StableID>(items: readonly SpatialItem<ID>[], input: SpatialLayoutInput = {}): SpatialLayoutState<ID> {
  return unwrap(tryCreateSpatialLayout(items, input));
}

export function tryCreateSpatialLayout<ID extends StableID>(items: readonly SpatialItem<ID>[], input: SpatialLayoutInput = {}): VirtualResult<SpatialLayoutState<ID>> {
  const maxItems = input.maxItems ?? 1_000_000;
  if (!Number.isSafeInteger(maxItems) || maxItems < 0) return fail('construction', 'invalid-max-items', 'maxItems must be a non-negative safe integer.', { maxItems });
  const validated = validateItems(items, maxItems);
  if (!validated.ok) return validated;
  return ok(createState(validated.value.domain, validated.value.items, maxItems, 0));
}

export function snapshotSpatialLayout<ID extends StableID>(
  state: SpatialLayoutState<ID>,
): SpatialLayoutSnapshot<ID> {
  const items: SpatialItem<ID>[] = [];
  state.items.forEach((item) => items.push(Object.freeze({
    id: item.id,
    rect: Object.freeze({ ...item.rect }),
    ...(item.zIndex === undefined ? {} : { zIndex: item.zIndex }),
  })));
  return Object.freeze({
    schemaVersion: 1,
    kind: 'spatial',
    items: Object.freeze(items),
    maxItems: state.maxItems,
    generation: state.generation,
  });
}

export function restoreSpatialLayout<ID extends StableID>(
  snapshot: SpatialLayoutSnapshot<ID>,
): SpatialLayoutState<ID> {
  return unwrap(tryRestoreSpatialLayout(snapshot));
}

export function tryRestoreSpatialLayout<ID extends StableID>(
  snapshot: SpatialLayoutSnapshot<ID>,
): VirtualResult<SpatialLayoutState<ID>> {
  if (!validSnapshotHeader(snapshot)) return snapshotFailure();
  const restored = tryCreateSpatialLayout(snapshot.items, {
    maxItems: snapshot.maxItems,
  });
  if (!restored.ok) return restored;
  return ok(createState(
    restored.value.domain,
    restored.value.items.toArray(),
    restored.value.maxItems,
    snapshot.generation,
  ));
}

export function querySpatialLayout<ID extends StableID>(state: SpatialLayoutState<ID>, input: VirtualQueryInput): SpatialLayoutPlan<ID> {
  return unwrap(tryQuerySpatialLayout(state, input));
}

export function tryQuerySpatialLayout<ID extends StableID>(state: SpatialLayoutState<ID>, input: VirtualQueryInput): VirtualResult<SpatialLayoutPlan<ID>> {
  const normalized = normalizeQuery(input);
  if (!normalized.ok) return normalized;
  const data = getInternals(state);
  if (!data.ok) return data;
  const candidates: IndexedSpatialItem<ID>[] = [];
  queryNode(data.value.root, normalized.value.renderBounds, candidates);
  candidates.sort((left, right) => left.zIndex - right.zIndex || left.index - right.index);
  const placements = Object.freeze(candidates.map((candidate): SpatialPlacement<ID> => Object.freeze({
    id: candidate.value.id,
    index: candidate.index,
    zIndex: candidate.zIndex,
    rect: candidate.value.rect,
    visible: rectanglesIntersect(candidate.value.rect, normalized.value.viewport),
  })));
  return ok(Object.freeze({
    generation: state.generation,
    contentSize: data.value.contentSize,
    viewport: normalized.value.viewport,
    renderBounds: normalized.value.renderBounds,
    placements,
    anchor: anchorForPlan(normalized.value.viewport, placements),
  }));
}

export function applySpatialMeasurements<ID extends StableID>(state: SpatialLayoutState<ID>, batch: VirtualMeasurementBatch<SpatialMeasurement<ID>, ID>): VirtualLayoutMutation<SpatialLayoutState<ID>> {
  return unwrap(tryApplySpatialMeasurements(state, batch));
}

export function tryApplySpatialMeasurements<ID extends StableID>(state: SpatialLayoutState<ID>, batch: VirtualMeasurementBatch<SpatialMeasurement<ID>, ID>): VirtualResult<VirtualLayoutMutation<SpatialLayoutState<ID>>> {
  if (batch.generation !== state.generation) return fail('transition-rejection', 'virtual-layout-measurement-stale', 'Measurement generation is stale.', { generation: batch.generation, activeGeneration: state.generation });
  if (batch.measurements.length === 0) return ok(Object.freeze({ state, scrollDelta: ZERO_POINT }));
  const data = getInternals(state);
  if (!data.ok) return data;
  const replacements = new Map<number, SpatialItem<ID>>();
  for (const measurement of batch.measurements) {
    const index = data.value.byID.get(measurement.id);
    if (index === undefined || replacements.has(index) || !validRect(measurement.rect)) return fail('transition-rejection', 'virtual-layout-measurement-invalid', 'Spatial measurements require unique existing IDs and valid rectangles.', { measurement });
    const current = data.value.items.at(index)!;
    const rect = createRect(measurement.rect);
    if (!sameRect(current.rect, rect)) replacements.set(index, Object.freeze({ ...current, rect }));
  }
  if (replacements.size === 0) return ok(Object.freeze({ state, scrollDelta: ZERO_POINT }));
  const before = anchorRect(state, batch.anchor);
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const changes = [...replacements].sort(([left], [right]) => left - right);
  const touchedLeaves = [...new Set(changes.map(([index]) => data.value.leafIndexByItemIndex[index]!))].sort((left, right) => left - right);
  const touchedVectorBlocks = new Set(changes.map(([index]) => Math.floor(index / LEAF_SIZE))).size;
  const touchedPartitions = touchedVectorBlocks + touchedLeaves.length;
  const repairBound = blockedRepairBound(changes.length, state.items.size, touchedPartitions);
  let next: SpatialLayoutState<ID>;
  if (useBlockedRepair(changes.length, state.items.size, touchedPartitions)) {
    const vector = data.value.items.updateDetailed(changes);
    const work = { copiedNodes: vector.copiedNodes };
    next = createMeasuredState(state, data.value, vector.vector, touchedLeaves, generation.value, work);
    recordRepairDiagnostics(next, {
      mode: 'incremental',
      changed: changes.length,
      touchedBlocks: touchedPartitions,
      copiedNodes: work.copiedNodes,
      copiedEntries: vector.copiedEntries,
      rebuiltItems: 0,
      repairBound,
    });
  } else {
    const items = new Array<SpatialItem<ID>>(data.value.items.size);
    data.value.items.forEach((item, index) => { items[index] = replacements.get(index) ?? item; });
    next = createState(state.domain, items, state.maxItems, generation.value);
    recordRepairDiagnostics(next, {
      mode: 'rebuild',
      changed: changes.length,
      touchedBlocks: touchedPartitions,
      copiedNodes: 0,
      copiedEntries: 0,
      rebuiltItems: state.items.size,
      repairBound,
    });
  }
  return ok(Object.freeze({ state: next, scrollDelta: anchorDelta(before, anchorRect(next, batch.anchor)) }));
}

export function applySpatialMutation<ID extends StableID>(state: SpatialLayoutState<ID>, mutation: SpatialMutation<ID>, anchor: VirtualAnchor<ID> | null = null): VirtualLayoutMutation<SpatialLayoutState<ID>> {
  return unwrap(tryApplySpatialMutation(state, mutation, anchor));
}

export function tryApplySpatialMutation<ID extends StableID>(state: SpatialLayoutState<ID>, mutation: SpatialMutation<ID>, anchor: VirtualAnchor<ID> | null = null): VirtualResult<VirtualLayoutMutation<SpatialLayoutState<ID>>> {
  if (mutation.type !== 'replace' && mutation.type !== 'update' && mutation.type !== 'patch') return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Spatial mutation type is unsupported.', { mutation });
  if (mutation.type === 'patch') return tryApplySpatialPatch(state, mutation, anchor);
  let items: readonly SpatialItem<ID>[];
  if (mutation.type === 'replace') items = mutation.items;
  else {
    const upsert = mutation.upsert ?? [];
    const remove = mutation.remove ?? [];
    const removed = new Set(remove);
    const updated = new Map<ID, SpatialItem<ID>>();
    if (removed.size !== remove.length) return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Spatial removal IDs must be unique.');
    for (const id of removed) if (!state.domain.contains(id)) return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Spatial removals must reference existing IDs.', { id });
    for (const item of upsert) {
      if (updated.has(item.id) || removed.has(item.id)) return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Spatial upserts must be unique and disjoint from removals.', { id: item.id });
      updated.set(item.id, item);
    }
    const next: SpatialItem<ID>[] = [];
    for (const item of state.items.iterate()) {
      if (removed.has(item.id)) continue;
      next.push(updated.get(item.id) ?? item);
      updated.delete(item.id);
    }
    for (const item of upsert) if (updated.has(item.id)) next.push(item);
    items = next;
  }
  const validated = validateItems(items, state.maxItems);
  if (!validated.ok) return validated.error.class === 'construction'
    ? { ok: false, error: { ...validated.error, class: 'transition-rejection' } }
    : validated;
  const before = anchorRect(state, anchor);
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const next = createState(validated.value.domain, validated.value.items, state.maxItems, generation.value);
  return ok(Object.freeze({ state: next, scrollDelta: anchorDelta(before, anchorRect(next, anchor)) }));
}

function tryApplySpatialPatch<ID extends StableID>(
  state: SpatialLayoutState<ID>,
  mutation: Extract<SpatialMutation<ID>, { readonly type: 'patch' }>,
  anchor: VirtualAnchor<ID> | null,
): VirtualResult<VirtualLayoutMutation<SpatialLayoutState<ID>>> {
  if (mutation.patch.type !== 'splice') {
    return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Spatial item patches must use splice semantics.');
  }
  const patch = mutation.patch;
  if (
    patch.inserted.length !== mutation.inserted.length
    || mutation.inserted.some((item, index) => item.id !== patch.inserted[index])
  ) {
    return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Spatial inserted items must match the patched identities.');
  }
  const frozenInserted: SpatialItem<ID>[] = [];
  for (const item of mutation.inserted) {
    if (!validRect(item.rect) || (item.zIndex !== undefined && !Number.isSafeInteger(item.zIndex))) {
      return fail('transition-rejection', 'virtual-layout-geometry-invalid', 'Spatial items require finite non-negative rectangles and safe-integer z-indices.', { item });
    }
    frozenInserted.push(Object.freeze({
      id: item.id,
      rect: createRect(item.rect),
      ...(item.zIndex === undefined || item.zIndex === 0 ? {} : { zIndex: item.zIndex }),
    }));
  }
  const domain = tryApplySequencePatch(state.domain, patch, {
    maxItems: state.maxItems,
  });
  if (!domain.ok) return domain;
  const data = getInternals(state);
  if (!data.ok) return data;
  const items = Array.from(data.value.items.iterate());
  items.splice(
    patch.index,
    patch.deleteCount,
    ...frozenInserted,
  );
  const before = anchorRect(state, anchor);
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const next = createState(domain.value, items, state.maxItems, generation.value);
  return ok(Object.freeze({
    state: next,
    scrollDelta: anchorDelta(before, anchorRect(next, anchor)),
  }));
}

export function spatialScrollTarget<ID extends StableID>(state: SpatialLayoutState<ID>, id: ID, viewport: VirtualRect, alignment: VirtualScrollAlignment = 'nearest'): VirtualPoint {
  return unwrap(trySpatialScrollTarget(state, id, viewport, alignment));
}

export function trySpatialScrollTarget<ID extends StableID>(state: SpatialLayoutState<ID>, id: ID, viewport: VirtualRect, alignment: VirtualScrollAlignment = 'nearest'): VirtualResult<VirtualPoint> {
  const data = getInternals(state);
  if (!data.ok) return data;
  const index = data.value.byID.get(id);
  const item = index === undefined ? undefined : data.value.items.at(index);
  if (item === undefined) return fail('transition-rejection', 'virtual-layout-scroll-target-invalid', 'Scroll target must exist in the spatial domain.', { id });
  return ok(Object.freeze({
    x: alignedScrollOffset(item.rect.x, item.rect.width, viewport.x, viewport.width, data.value.contentSize.width, alignment),
    y: alignedScrollOffset(item.rect.y, item.rect.height, viewport.y, viewport.height, data.value.contentSize.height, alignment),
  }));
}

export function spatialRectAt<ID extends StableID>(state: SpatialLayoutState<ID>, id: ID): VirtualRect | null {
  const data = internals.get(state as SpatialLayoutState);
  const index = data?.byID.get(id);
  return index === undefined ? null : data?.items.at(index)?.rect ?? null;
}

function createState<ID extends StableID>(domain: Sequence<ID>, items: readonly SpatialItem<ID>[], maxItems: number, generation: number): SpatialLayoutState<ID> {
  const vector = createBlockedVector(items);
  const mutable = { domain, items: vector.view, maxItems, generation };
  Object.defineProperty(mutable, spatialLayoutStateBrand, { value: true });
  const state = Object.freeze(mutable) as SpatialLayoutState<ID>;
  const indexed = items.map((value, index) => Object.freeze({ value, index, zIndex: value.zIndex ?? 0 }));
  const packed = buildPackedTree(indexed);
  internals.set(state, {
    root: packed.root,
    byID: new Map(indexed.map((item) => [item.value.id, item.index])),
    items: vector,
    leafIndexByItemIndex: packed.leafIndexByItemIndex,
    contentSize: contentSize(packed.root),
  } as SpatialInternals<StableID>);
  return state;
}

function createMeasuredState<ID extends StableID>(
  previous: SpatialLayoutState<ID>,
  data: SpatialInternals<ID>,
  items: BlockedVector<SpatialItem<ID>>,
  touchedLeaves: readonly number[],
  generation: number,
  work: { copiedNodes: number },
): SpatialLayoutState<ID> {
  const root = data.root === null ? null : repairSpatialTree(data.root, 0, touchedLeaves, 0, touchedLeaves.length, items, work);
  const mutable = { domain: previous.domain, items: items.view, maxItems: previous.maxItems, generation };
  Object.defineProperty(mutable, spatialLayoutStateBrand, { value: true });
  const state = Object.freeze(mutable) as SpatialLayoutState<ID>;
  internals.set(state, {
    root,
    byID: data.byID,
    items,
    leafIndexByItemIndex: data.leafIndexByItemIndex,
    contentSize: contentSize(root),
  } as SpatialInternals<StableID>);
  return state;
}

function validateItems<ID extends StableID>(items: readonly SpatialItem<ID>[], maxItems: number): VirtualResult<{ readonly domain: Sequence<ID>; readonly items: readonly SpatialItem<ID>[] }> {
  if (items.length > maxItems) return fail('resource-rejection', 'item-ceiling-exceeded', 'Spatial items exceed maxItems.', { size: items.length, maxItems });
  const domain = tryCreateSequence(items.map(({ id }) => id), { maxItems: Math.max(1, maxItems) });
  if (!domain.ok) return domain;
  const frozen: SpatialItem<ID>[] = [];
  for (const item of items) {
    if (!validRect(item.rect) || (item.zIndex !== undefined && (!Number.isSafeInteger(item.zIndex)))) return fail('construction', 'virtual-layout-geometry-invalid', 'Spatial items require finite non-negative rectangles and safe-integer z-indices.', { item });
    frozen.push(Object.freeze({ id: item.id, rect: createRect(item.rect), ...(item.zIndex === undefined || item.zIndex === 0 ? {} : { zIndex: item.zIndex }) }));
  }
  return ok(Object.freeze({ domain: domain.value, items: Object.freeze(frozen) }));
}

function buildPackedTree<ID extends StableID>(items: readonly IndexedSpatialItem<ID>[]): {
  readonly root: SpatialNode<ID> | null;
  readonly leafIndexByItemIndex: readonly number[];
} {
  if (items.length === 0) return Object.freeze({ root: null, leafIndexByItemIndex: Object.freeze([]) });
  const leafIndexByItemIndex: number[] = [];
  let level = packedGroups(items, (item) => item.value.rect).map((group, leafIndex): SpatialNode<ID> => {
    for (const item of group) leafIndexByItemIndex[item.index] = leafIndex;
    return Object.freeze({
    bounds: boundsOfRects(group.map((item) => item.value.rect))!,
    items: Object.freeze(group),
    children: null,
    leafCount: 1,
    });
  });
  while (level.length > 1) {
    const next: SpatialNode<ID>[] = [];
    for (let start = 0; start < level.length; start += 2) {
      const children = level.slice(start, start + 2);
      next.push(Object.freeze({
      bounds: boundsOfRects(children.map((node) => node.bounds))!,
      items: null,
      children: Object.freeze(children),
      leafCount: children.reduce((total, child) => total + child.leafCount, 0),
      }));
    }
    level = next;
  }
  return Object.freeze({ root: level[0]!, leafIndexByItemIndex: Object.freeze(leafIndexByItemIndex) });
}

function repairSpatialTree<ID extends StableID>(
  node: SpatialNode<ID>,
  leafStart: number,
  touched: readonly number[],
  from: number,
  to: number,
  items: BlockedVector<SpatialItem<ID>>,
  work: { copiedNodes: number },
): SpatialNode<ID> {
  if (from === to) return node;
  if (node.items !== null) {
    work.copiedNodes += 1;
    const repaired = node.items.map((item) => Object.freeze({ ...item, value: items.at(item.index)! }));
    return Object.freeze({
      bounds: boundsOfRects(repaired.map((item) => item.value.rect))!,
      items: Object.freeze(repaired),
      children: null,
      leafCount: 1,
    });
  }
  const children = node.children!;
  const leftLeaves = children[0]!.leafCount;
  const boundary = leafStart + leftLeaves;
  let middle = from;
  while (middle < to && touched[middle]! < boundary) middle += 1;
  const left = repairSpatialTree(children[0]!, leafStart, touched, from, middle, items, work);
  const right = children.length === 1 ? null : repairSpatialTree(children[1]!, boundary, touched, middle, to, items, work);
  const repairedChildren = right === null ? Object.freeze([left]) : Object.freeze([left, right]);
  work.copiedNodes += 1;
  return Object.freeze({
    bounds: boundsOfRects(repairedChildren.map((child) => child.bounds))!,
    items: null,
    children: repairedChildren,
    leafCount: node.leafCount,
  });
}

function contentSize<ID extends StableID>(root: SpatialNode<ID> | null): { readonly width: number; readonly height: number } {
  return root === null
    ? Object.freeze({ width: 0, height: 0 })
    : Object.freeze({ width: root.bounds.x + root.bounds.width, height: root.bounds.y + root.bounds.height });
}

function queryNode<ID extends StableID>(node: SpatialNode<ID> | null, bounds: VirtualRect, output: IndexedSpatialItem<ID>[]): void {
  if (node === null || !rectanglesIntersect(node.bounds, bounds)) return;
  if (node.items !== null) {
    for (const item of node.items) if (rectanglesIntersect(item.value.rect, bounds)) output.push(item);
    return;
  }
  for (const child of node.children ?? []) queryNode(child, bounds, output);
}

function packedGroups<T>(values: readonly T[], rectOf: (value: T) => VirtualRect): T[][] {
  if (values.length <= LEAF_SIZE) return [[...values]];
  const groupCount = Math.ceil(values.length / LEAF_SIZE);
  const slabCount = Math.ceil(Math.sqrt(groupCount));
  const slabSize = Math.ceil(values.length / slabCount);
  const sorted = [...values].sort((left, right) => center(rectOf(left), 'x') - center(rectOf(right), 'x'));
  const groups: T[][] = [];
  for (let slabStart = 0; slabStart < sorted.length; slabStart += slabSize) {
    const slab = sorted.slice(slabStart, slabStart + slabSize).sort((left, right) => center(rectOf(left), 'y') - center(rectOf(right), 'y'));
    for (let start = 0; start < slab.length; start += LEAF_SIZE) groups.push(slab.slice(start, start + LEAF_SIZE));
  }
  return groups;
}

function center(rect: VirtualRect, axis: 'x' | 'y'): number { return axis === 'x' ? rect.x + rect.width / 2 : rect.y + rect.height / 2; }
function sameRect(left: VirtualRect, right: VirtualRect): boolean { return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height; }
function validRect(rect: VirtualRect): boolean { return isFiniteRect(rect) && rect.x >= 0 && rect.y >= 0; }
function anchorRect<ID extends StableID>(state: SpatialLayoutState<ID>, anchor: VirtualAnchor<ID> | null | undefined): VirtualRect | null { return anchor === null || anchor === undefined ? null : spatialRectAt(state, anchor.id); }
function getInternals<ID extends StableID>(state: SpatialLayoutState<ID>): VirtualResult<SpatialInternals<ID>> { const value = internals.get(state as SpatialLayoutState); return value === undefined ? fail('construction', 'virtual-layout-domain-mismatch', 'Spatial state must be created by createSpatialLayout().') : ok(value as SpatialInternals<ID>); }
function validSnapshotHeader<ID extends StableID>(snapshot: SpatialLayoutSnapshot<ID>): boolean {
  return snapshot !== null
    && typeof snapshot === 'object'
    && snapshot.schemaVersion === 1
    && snapshot.kind === 'spatial'
    && Array.isArray(snapshot.items)
    && Number.isSafeInteger(snapshot.maxItems)
    && snapshot.maxItems >= snapshot.items.length
    && Number.isSafeInteger(snapshot.generation)
    && snapshot.generation >= 0;
}
function snapshotFailure<T>(): VirtualResult<T> { return fail('construction', 'virtual-layout-snapshot-invalid', 'Spatial layout snapshot is invalid.'); }
function anchorDelta(before: VirtualRect | null, after: VirtualRect | null): VirtualPoint { return before === null || after === null ? ZERO_POINT : pointDelta(before, after); }
function nextGeneration(generation: number): VirtualResult<number> { return generation === Number.MAX_SAFE_INTEGER ? fail('resource-rejection', 'virtual-layout-generation-exhausted', 'Layout generation reached the safe-integer ceiling.') : ok(generation + 1); }

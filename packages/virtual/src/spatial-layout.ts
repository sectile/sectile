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
import { blockedRepairBound, createBlockedVector, createOwnedBlockedVector, type BlockedVector, useBlockedRepair } from './internal/blocked-vector.js';
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

export interface SpatialLayoutInput<ID extends StableID = StableID> {
  readonly maxItems?: number;
  readonly domain?: Sequence<ID>;
}
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

interface SpatialTreeItem<ID extends StableID> {
  readonly value: SpatialItem<ID>;
  readonly baseIndex: number;
  readonly zIndex: number;
}

interface SpatialNode<ID extends StableID> {
  readonly bounds: VirtualRect;
  readonly items: readonly SpatialTreeItem<ID>[] | null;
  readonly children: readonly SpatialNode<ID>[] | null;
  readonly leafCount: number;
}

interface SpatialInternals<ID extends StableID> {
  readonly root: SpatialNode<ID> | null;
  readonly baseDomain: Sequence<ID>;
  readonly baseItems: BlockedVector<SpatialItem<ID>>;
  readonly overlay: ReadonlyMap<ID, SpatialItem<ID> | null>;
  readonly leafIndexByBaseIndex: readonly number[];
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

export function createSpatialLayout<ID extends StableID>(items: readonly SpatialItem<ID>[], input: SpatialLayoutInput<ID> = {}): SpatialLayoutState<ID> {
  return unwrap(tryCreateSpatialLayout(items, input));
}

export function tryCreateSpatialLayout<ID extends StableID>(items: readonly SpatialItem<ID>[], input: SpatialLayoutInput<ID> = {}): VirtualResult<SpatialLayoutState<ID>> {
  const maxItems = input.maxItems ?? 1_000_000;
  if (!Number.isSafeInteger(maxItems) || maxItems < 0) return fail('construction', 'invalid-max-items', 'maxItems must be a non-negative safe integer.', { maxItems });
  const validated = validateItems(items, maxItems, input.domain);
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
  const treeCandidates: SpatialTreeItem<ID>[] = [];
  queryNode(data.value.root, normalized.value.renderBounds, treeCandidates);
  let placements: readonly SpatialPlacement<ID>[];
  if (state.domain === data.value.baseDomain && data.value.overlay.size === 0) {
    treeCandidates.sort((left, right) => left.zIndex - right.zIndex || left.baseIndex - right.baseIndex);
    placements = Object.freeze(treeCandidates.map((candidate): SpatialPlacement<ID> => Object.freeze({
      id: candidate.value.id,
      index: candidate.baseIndex,
      zIndex: candidate.zIndex,
      rect: candidate.value.rect,
      visible: rectanglesIntersect(candidate.value.rect, normalized.value.viewport),
    })));
  } else {
    const candidates: IndexedSpatialItem<ID>[] = [];
    for (const candidate of treeCandidates) {
      if (data.value.overlay.has(candidate.value.id)) continue;
      const index = state.domain.indexOf(candidate.value.id);
      if (index === null) continue;
      candidates.push({ value: candidate.value, index, zIndex: candidate.zIndex });
    }
    for (const item of data.value.overlay.values()) {
      if (item === null || !rectanglesIntersect(item.rect, normalized.value.renderBounds)) continue;
      const index = state.domain.indexOf(item.id);
      if (index === null) continue;
      candidates.push({ value: item, index, zIndex: item.zIndex ?? 0 });
    }
    candidates.sort((left, right) => left.zIndex - right.zIndex || left.index - right.index);
    placements = Object.freeze(candidates.map((candidate): SpatialPlacement<ID> => Object.freeze({
      id: candidate.value.id,
      index: candidate.index,
      zIndex: candidate.zIndex,
      rect: candidate.value.rect,
      visible: rectanglesIntersect(candidate.value.rect, normalized.value.viewport),
    })));
  }
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
  const replacements = new Map<ID, SpatialItem<ID>>();
  for (const measurement of batch.measurements) {
    const current = state.domain.contains(measurement.id)
      ? spatialItemByID(data.value, measurement.id)
      : undefined;
    if (current === undefined || replacements.has(measurement.id) || !validRect(measurement.rect)) return fail('transition-rejection', 'virtual-layout-measurement-invalid', 'Spatial measurements require unique existing IDs and valid rectangles.', { measurement });
    const rect = createRect(measurement.rect);
    if (!sameRect(current.rect, rect)) replacements.set(measurement.id, Object.freeze({ ...current, rect }));
  }
  if (replacements.size === 0) return ok(Object.freeze({ state, scrollDelta: ZERO_POINT }));
  const before = anchorRect(state, batch.anchor);
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const baseChanges: (readonly [number, SpatialItem<ID>])[] = [];
  if (data.value.overlay.size === 0) {
    for (const [id, item] of replacements) {
      const baseIndex = data.value.baseDomain.indexOf(id);
      if (baseIndex === null) break;
      baseChanges.push(Object.freeze([baseIndex, item] as const));
    }
  }
  const next = baseChanges.length === replacements.size
    ? applySpatialBaseChanges(
        state,
        data.value,
        baseChanges.sort(([left], [right]) => left - right),
        generation.value,
      )
    : applySpatialOverlayChanges(state, data.value, state.domain, replacements, generation.value);
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
  const patch = mutation.patch;
  if (patch.type === 'move') {
    if (mutation.inserted.length !== 0) {
      return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Spatial move patches do not accept inserted items.');
    }
    const domain = tryApplySequencePatch(state.domain, patch, { maxItems: state.maxItems });
    if (!domain.ok) return domain;
    if (domain.value === state.domain) return ok(Object.freeze({ state, scrollDelta: ZERO_POINT }));
    const data = getInternals(state);
    if (!data.ok) return data;
    const before = anchorRect(state, anchor);
    const generation = nextGeneration(state.generation);
    if (!generation.ok) return generation;
    const next = createDerivedState(domain.value, state.maxItems, generation.value, data.value);
    recordRepairDiagnostics(next, {
      mode: 'incremental', changed: patch.count, touchedBlocks: 0,
      copiedNodes: 0, copiedEntries: 0, rebuiltItems: 0, repairBound: spatialOverlayLimit(state.items.size),
    });
    return ok(Object.freeze({
      state: next,
      scrollDelta: anchorDelta(before, anchorRect(next, anchor)),
    }));
  }
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
  const valueOnly = patch.deleteCount === frozenInserted.length
    && frozenInserted.every((item, index) => state.domain.at(patch.index + index) === item.id);
  if (valueOnly) {
    const changes: (readonly [number, SpatialItem<ID>])[] = [];
    for (let index = 0; index < frozenInserted.length; index += 1) {
      const itemIndex = patch.index + index;
      const current = state.items.at(itemIndex)!;
      const inserted = frozenInserted[index]!;
      if (!sameSpatialItem(current, inserted)) changes.push(Object.freeze([itemIndex, inserted] as const));
    }
    if (changes.length === 0) return ok(Object.freeze({ state, scrollDelta: ZERO_POINT }));
    const before = anchorRect(state, anchor);
    const generation = nextGeneration(state.generation);
    if (!generation.ok) return generation;
    const baseChanges = data.value.overlay.size === 0
      ? changes.map(([, item]) => Object.freeze([
          data.value.baseDomain.indexOf(item.id)!,
          item,
        ] as const)).sort(([left], [right]) => left - right)
      : [];
    const next = baseChanges.length === changes.length
      ? applySpatialBaseChanges(state, data.value, baseChanges, generation.value)
      : applySpatialOverlayChanges(
          state,
          data.value,
          state.domain,
          new Map(changes.map(([index, item]) => [state.domain.at(index)!, item])),
          generation.value,
        );
    return ok(Object.freeze({
      state: next,
      scrollDelta: anchorDelta(before, anchorRect(next, anchor)),
    }));
  }
  const repairBound = spatialOverlayLimit(domain.value.size);
  const geometryChanges = analyzeSpatialPatchGeometryChanges(
    state,
    data.value,
    domain.value,
    patch.index,
    patch.deleteCount,
    frozenInserted,
    repairBound,
  );
  const before = anchorRect(state, anchor);
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const next = geometryChanges.changed === 0
    ? createDerivedState(domain.value, state.maxItems, generation.value, data.value)
    : geometryChanges.changes === null
      ? rebuildSpatialPatch(
          state,
          data.value,
          domain.value,
          patch.index,
          patch.deleteCount,
          frozenInserted,
          generation.value,
          geometryChanges.changed,
          repairBound,
        )
      : applySpatialOverlayChanges(state, data.value, domain.value, geometryChanges.changes, generation.value);
  if (geometryChanges.changed === 0) {
    recordRepairDiagnostics(next, {
      mode: 'incremental', changed: patch.deleteCount + frozenInserted.length, touchedBlocks: 0,
      copiedNodes: 0, copiedEntries: 0, rebuiltItems: 0, repairBound,
    });
  }
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
  const item = state.domain.contains(id) ? spatialItemByID(data.value, id) : undefined;
  if (item === undefined) return fail('transition-rejection', 'virtual-layout-scroll-target-invalid', 'Scroll target must exist in the spatial domain.', { id });
  return ok(Object.freeze({
    x: alignedScrollOffset(item.rect.x, item.rect.width, viewport.x, viewport.width, data.value.contentSize.width, alignment),
    y: alignedScrollOffset(item.rect.y, item.rect.height, viewport.y, viewport.height, data.value.contentSize.height, alignment),
  }));
}

export function spatialRectAt<ID extends StableID>(state: SpatialLayoutState<ID>, id: ID): VirtualRect | null {
  const data = internals.get(state as SpatialLayoutState);
  return data === undefined || !state.domain.contains(id)
    ? null
    : spatialItemByID(data as SpatialInternals<ID>, id)?.rect ?? null;
}

function createState<ID extends StableID>(domain: Sequence<ID>, items: readonly SpatialItem<ID>[], maxItems: number, generation: number): SpatialLayoutState<ID> {
  const vector = createBlockedVector(items);
  return createStateFromVector(domain, vector, maxItems, generation);
}

function createOwnedState<ID extends StableID>(domain: Sequence<ID>, items: SpatialItem<ID>[], maxItems: number, generation: number): SpatialLayoutState<ID> {
  return createStateFromVector(domain, createOwnedBlockedVector(items), maxItems, generation);
}

function createStateFromVector<ID extends StableID>(
  domain: Sequence<ID>,
  vector: BlockedVector<SpatialItem<ID>>,
  maxItems: number,
  generation: number,
  baseDomain: Sequence<ID> = domain,
): SpatialLayoutState<ID> {
  const indexed: SpatialTreeItem<ID>[] = [];
  vector.forEach((value, baseIndex) => { indexed.push(Object.freeze({ value, baseIndex, zIndex: value.zIndex ?? 0 })); });
  const packed = buildPackedTree(indexed);
  const data: SpatialInternals<ID> = {
    root: packed.root,
    baseDomain,
    baseItems: vector,
    overlay: new Map(),
    leafIndexByBaseIndex: packed.leafIndexByBaseIndex,
    contentSize: contentSize(packed.root),
  };
  return createDerivedState(domain, maxItems, generation, data);
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
  return createDerivedState(previous.domain, previous.maxItems, generation, {
    root,
    baseDomain: data.baseDomain,
    baseItems: items,
    overlay: data.overlay,
    leafIndexByBaseIndex: data.leafIndexByBaseIndex,
    contentSize: contentSize(root),
  });
}

function applySpatialBaseChanges<ID extends StableID>(
  state: SpatialLayoutState<ID>,
  data: SpatialInternals<ID>,
  changes: readonly (readonly [number, SpatialItem<ID>])[],
  generation: number,
): SpatialLayoutState<ID> {
  const touchedLeaves = [...new Set(changes.map(([index]) => data.leafIndexByBaseIndex[index]!))]
    .sort((left, right) => left - right);
  const touchedPartitions = new Set(changes.map(([index]) => Math.floor(index / LEAF_SIZE))).size
    + touchedLeaves.length;
  const repairBound = blockedRepairBound(changes.length, data.baseItems.size, touchedPartitions);
  if (useBlockedRepair(changes.length, data.baseItems.size, touchedPartitions)) {
    const vector = data.baseItems.updateDetailed(changes);
    const work = { copiedNodes: vector.copiedNodes };
    const next = createMeasuredState(state, data, vector.vector, touchedLeaves, generation, work);
    recordRepairDiagnostics(next, {
      mode: 'incremental', changed: changes.length, touchedBlocks: touchedPartitions,
      copiedNodes: work.copiedNodes, copiedEntries: vector.copiedEntries,
      rebuiltItems: 0, repairBound,
    });
    return next;
  }
  const replacements = new Map(changes);
  const items = new Array<SpatialItem<ID>>(data.baseItems.size);
  data.baseItems.forEach((item, index) => { items[index] = replacements.get(index) ?? item; });
  const next = createStateFromVector(
    state.domain,
    createOwnedBlockedVector(items),
    state.maxItems,
    generation,
    data.baseDomain,
  );
  recordRepairDiagnostics(next, {
    mode: 'rebuild', changed: changes.length, touchedBlocks: touchedPartitions,
    copiedNodes: 0, copiedEntries: 0, rebuiltItems: data.baseItems.size, repairBound,
  });
  return next;
}

function applySpatialOverlayChanges<ID extends StableID>(
  state: SpatialLayoutState<ID>,
  data: SpatialInternals<ID>,
  domain: Sequence<ID>,
  changes: ReadonlyMap<ID, SpatialItem<ID> | null>,
  generation: number,
): SpatialLayoutState<ID> {
  const overlay = new Map(data.overlay);
  let width = data.contentSize.width;
  let height = data.contentSize.height;
  let requiresRebuild = false;
  for (const [id, next] of changes) {
    const current = spatialItemByID(data, id);
    if (current !== undefined) {
      const currentRight = current.rect.x + current.rect.width;
      const currentBottom = current.rect.y + current.rect.height;
      const nextRight = next === null ? 0 : next.rect.x + next.rect.width;
      const nextBottom = next === null ? 0 : next.rect.y + next.rect.height;
      if (currentRight === width && nextRight < currentRight) requiresRebuild = true;
      if (currentBottom === height && nextBottom < currentBottom) requiresRebuild = true;
    }
    writeSpatialOverlay(data, overlay, id, next);
    if (next !== null) {
      width = Math.max(width, next.rect.x + next.rect.width);
      height = Math.max(height, next.rect.y + next.rect.height);
    }
  }
  const repairBound = spatialOverlayLimit(domain.size);
  if (requiresRebuild || overlay.size > repairBound) {
    const items = materializeSpatialItems(domain, data, overlay);
    const next = createOwnedState(domain, items, state.maxItems, generation);
    recordRepairDiagnostics(next, {
      mode: 'rebuild', changed: changes.size, touchedBlocks: overlay.size,
      copiedNodes: 0, copiedEntries: overlay.size,
      rebuiltItems: domain.size, repairBound,
    });
    return next;
  }
  const next = createDerivedState(domain, state.maxItems, generation, {
    root: data.root,
    baseDomain: data.baseDomain,
    baseItems: data.baseItems,
    overlay,
    leafIndexByBaseIndex: data.leafIndexByBaseIndex,
    contentSize: Object.freeze({ width, height }),
  });
  recordRepairDiagnostics(next, {
    mode: 'incremental', changed: changes.size, touchedBlocks: overlay.size,
    copiedNodes: 0, copiedEntries: overlay.size,
    rebuiltItems: 0, repairBound,
  });
  return next;
}

function createDerivedState<ID extends StableID>(
  domain: Sequence<ID>,
  maxItems: number,
  generation: number,
  data: SpatialInternals<ID>,
): SpatialLayoutState<ID> {
  const mutable = {
    domain,
    items: createOrderedSpatialView(domain, (id) => spatialItemByID(data, id)),
    maxItems,
    generation,
  };
  Object.defineProperty(mutable, spatialLayoutStateBrand, { value: true });
  const state = Object.freeze(mutable) as SpatialLayoutState<ID>;
  internals.set(state, data as SpatialInternals<StableID>);
  return state;
}

function createOrderedSpatialView<ID extends StableID>(
  domain: Sequence<ID>,
  getItem: (id: ID) => SpatialItem<ID> | undefined,
): VirtualIndexedView<SpatialItem<ID>> {
  const at = (index: number): SpatialItem<ID> | undefined => {
    const id = domain.at(index);
    return id === null ? undefined : getItem(id);
  };
  function* iterate(): IterableIterator<SpatialItem<ID>> {
    for (let index = 0; index < domain.size; index += 1) {
      const item = at(index);
      if (item !== undefined) yield item;
    }
  }
  const forEach = (callback: (value: SpatialItem<ID>, index: number) => void): void => {
    for (let index = 0; index < domain.size; index += 1) {
      const item = at(index);
      if (item !== undefined) callback(item, index);
    }
  };
  return Object.freeze({
    size: domain.size,
    at,
    iterate,
    forEach,
    toArray: (): readonly SpatialItem<ID>[] => {
      const items: SpatialItem<ID>[] = [];
      forEach((item) => items.push(item));
      return Object.freeze(items);
    },
  });
}

function spatialItemByID<ID extends StableID>(
  data: SpatialInternals<ID>,
  id: ID,
): SpatialItem<ID> | undefined {
  if (data.overlay.has(id)) return data.overlay.get(id) ?? undefined;
  const baseIndex = data.baseDomain.indexOf(id);
  return baseIndex === null ? undefined : data.baseItems.at(baseIndex);
}

function writeSpatialOverlay<ID extends StableID>(
  data: SpatialInternals<ID>,
  overlay: Map<ID, SpatialItem<ID> | null>,
  id: ID,
  item: SpatialItem<ID> | null,
): void {
  const baseIndex = data.baseDomain.indexOf(id);
  if (item === null) {
    if (baseIndex === null) overlay.delete(id);
    else overlay.set(id, null);
    return;
  }
  const base = baseIndex === null ? undefined : data.baseItems.at(baseIndex);
  if (base !== undefined && sameSpatialItem(base, item)) overlay.delete(id);
  else overlay.set(id, item);
}

function materializeSpatialItems<ID extends StableID>(
  domain: Sequence<ID>,
  data: SpatialInternals<ID>,
  overlay: ReadonlyMap<ID, SpatialItem<ID> | null>,
): SpatialItem<ID>[] {
  const nextData = { ...data, overlay };
  const items = new Array<SpatialItem<ID>>(domain.size);
  for (let index = 0; index < domain.size; index += 1) {
    const id = domain.at(index)!;
    const item = spatialItemByID(nextData, id);
    if (item === undefined) throw new TypeError('Spatial domain and geometry storage diverged.');
    items[index] = item;
  }
  return items;
}

function analyzeSpatialPatchGeometryChanges<ID extends StableID>(
  state: SpatialLayoutState<ID>,
  data: SpatialInternals<ID>,
  domain: Sequence<ID>,
  index: number,
  deleteCount: number,
  inserted: readonly SpatialItem<ID>[],
  repairBound: number,
): {
  readonly changed: number;
  readonly changes: ReadonlyMap<ID, SpatialItem<ID> | null> | null;
} {
  let changed = 0;
  let changes: Map<ID, SpatialItem<ID> | null> | null = new Map();
  const record = (id: ID, item: SpatialItem<ID> | null): void => {
    changed += 1;
    if (changes === null) return;
    if (changed > repairBound) {
      changes = null;
      return;
    }
    changes.set(id, item);
  };
  for (let offset = 0; offset < deleteCount; offset += 1) {
    const id = state.domain.at(index + offset)!;
    if (!domain.contains(id)) record(id, null);
  }
  for (const item of inserted) {
    const current = spatialItemByID(data, item.id);
    if (current === undefined || !sameSpatialItem(current, item)) record(item.id, item);
  }
  return Object.freeze({ changed, changes });
}

function rebuildSpatialPatch<ID extends StableID>(
  state: SpatialLayoutState<ID>,
  data: SpatialInternals<ID>,
  domain: Sequence<ID>,
  index: number,
  deleteCount: number,
  inserted: readonly SpatialItem<ID>[],
  generation: number,
  changed: number,
  repairBound: number,
): SpatialLayoutState<ID> {
  const items = new Array<SpatialItem<ID>>(domain.size);
  const suffixStart = index + deleteCount;
  let copiedItems = 0;
  if (data.overlay.size === 0 && state.domain === data.baseDomain) {
    data.baseItems.forEach((item, sourceIndex) => {
      if (sourceIndex < index) {
        items[sourceIndex] = item;
        copiedItems += 1;
      } else if (sourceIndex >= suffixStart) {
        items[sourceIndex - deleteCount + inserted.length] = item;
        copiedItems += 1;
      }
    });
  } else {
    for (let sourceIndex = 0; sourceIndex < index; sourceIndex += 1) {
      const item = state.items.at(sourceIndex);
      if (item === undefined) throw new TypeError('Spatial domain and geometry storage diverged.');
      items[sourceIndex] = item;
      copiedItems += 1;
    }
    for (let sourceIndex = suffixStart; sourceIndex < state.items.size; sourceIndex += 1) {
      const item = state.items.at(sourceIndex);
      if (item === undefined) throw new TypeError('Spatial domain and geometry storage diverged.');
      items[sourceIndex - deleteCount + inserted.length] = item;
      copiedItems += 1;
    }
  }
  let outputIndex = index;
  for (const item of inserted) {
    items[outputIndex] = item;
    outputIndex += 1;
  }
  if (copiedItems + inserted.length !== domain.size) throw new TypeError('Spatial patch and domain size diverged.');
  const next = createOwnedState(domain, items, state.maxItems, generation);
  recordRepairDiagnostics(next, {
    mode: 'rebuild', changed, touchedBlocks: changed,
    copiedNodes: 0, copiedEntries: 0,
    rebuiltItems: domain.size, repairBound,
  });
  return next;
}

function spatialOverlayLimit(size: number): number {
  return size < 1_024 ? 0 : Math.min(256, Math.ceil(size / LEAF_SIZE));
}

function validateItems<ID extends StableID>(
  items: readonly SpatialItem<ID>[],
  maxItems: number,
  existingDomain?: Sequence<ID>,
): VirtualResult<{ readonly domain: Sequence<ID>; readonly items: readonly SpatialItem<ID>[] }> {
  if (items.length > maxItems) return fail('resource-rejection', 'item-ceiling-exceeded', 'Spatial items exceed maxItems.', { size: items.length, maxItems });
  if (existingDomain !== undefined && existingDomain.size !== items.length) {
    return fail('construction', 'virtual-layout-domain-mismatch', 'Spatial domain and items must have the same size.', { domainSize: existingDomain.size, itemSize: items.length });
  }
  const ids: ID[] = [];
  const frozen: SpatialItem<ID>[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!;
    if (existingDomain !== undefined && existingDomain.at(index) !== item.id) {
      return fail('construction', 'virtual-layout-domain-mismatch', 'Spatial domain identities must align with item declaration order.', { index, id: item.id });
    }
    if (!validRect(item.rect) || (item.zIndex !== undefined && (!Number.isSafeInteger(item.zIndex)))) return fail('construction', 'virtual-layout-geometry-invalid', 'Spatial items require finite non-negative rectangles and safe-integer z-indices.', { item });
    if (existingDomain === undefined) ids.push(item.id);
    frozen.push(Object.freeze({ id: item.id, rect: createRect(item.rect), ...(item.zIndex === undefined || item.zIndex === 0 ? {} : { zIndex: item.zIndex }) }));
  }
  const domain = existingDomain === undefined
    ? tryCreateSequence(ids, { maxItems: Math.max(1, maxItems) })
    : ok(existingDomain);
  if (!domain.ok) return domain;
  return ok(Object.freeze({ domain: domain.value, items: Object.freeze(frozen) }));
}

function buildPackedTree<ID extends StableID>(items: readonly SpatialTreeItem<ID>[]): {
  readonly root: SpatialNode<ID> | null;
  readonly leafIndexByBaseIndex: readonly number[];
} {
  if (items.length === 0) return Object.freeze({ root: null, leafIndexByBaseIndex: Object.freeze([]) });
  const leafIndexByBaseIndex: number[] = [];
  let level = packedGroups(items, (item) => item.value.rect).map((group, leafIndex): SpatialNode<ID> => {
    for (const item of group) leafIndexByBaseIndex[item.baseIndex] = leafIndex;
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
  return Object.freeze({ root: level[0]!, leafIndexByBaseIndex: Object.freeze(leafIndexByBaseIndex) });
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
    const repaired = node.items.map((item) => Object.freeze({ ...item, value: items.at(item.baseIndex)! }));
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

function queryNode<ID extends StableID>(node: SpatialNode<ID> | null, bounds: VirtualRect, output: SpatialTreeItem<ID>[]): void {
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
function sameSpatialItem<ID extends StableID>(left: SpatialItem<ID>, right: SpatialItem<ID>): boolean {
  return left.id === right.id && (left.zIndex ?? 0) === (right.zIndex ?? 0) && sameRect(left.rect, right.rect);
}
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

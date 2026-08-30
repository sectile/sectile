import type { StableID } from '@sectile/core';
import { applySequencePatch, createSequence, type Sequence } from '@sectile/core/sequence';
import type { ChartDatum, ChartProfile } from '../model.js';

const VALUE_BLOCK_DATUMS = 256;
const MAX_VALUE_PATCH_DEPTH = 16;
const MAX_HIERARCHY_PATCH_DEPTH = 16;
const HIERARCHY_STRIDE = 12;

export interface ChartLayerRevisions {
  readonly identity: number;
  readonly order: number;
  readonly value: number;
  readonly geometry: number;
  readonly aggregate: number;
  readonly style: number;
}

export interface ChartLayerBounds {
  readonly hasValues: boolean;
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumY: number;
  readonly maximumY: number;
}

export interface ChartLayerWork {
  readonly scannedDatums: number;
  readonly copiedValueBlocks: number;
  readonly repairedIndexEntries: number;
  readonly rebuiltIndexEntries: number;
}

export interface OrderedProfileIndex {
  readonly kind: 'ordered';
  readonly hierarchy: PackedAggregateHierarchy;
}

export interface SpatialProfileIndex {
  readonly kind: 'spatial';
  readonly order: Uint32Array;
  readonly positions: Uint32Array;
  readonly hierarchy: PackedAggregateHierarchy;
}

export interface HeatmapProfileIndex {
  readonly kind: 'heatmap';
  readonly representation: 'dense' | 'sparse';
  readonly order: Uint32Array;
  readonly positions: Uint32Array;
  readonly rowValues: Float64Array;
  readonly rowOffsets: Uint32Array;
  readonly datumIndices: Uint32Array;
  readonly hierarchy: PackedAggregateHierarchy;
}

export interface CategoricalProfileIndex {
  readonly kind: 'categorical';
  readonly slots: Float64Array;
  readonly hierarchy: PackedAggregateHierarchy;
}

export interface RadialProfileIndex {
  readonly kind: 'radial';
  readonly prefix: Float64Array;
  readonly total: number;
  readonly hierarchy: PackedAggregateHierarchy;
}

export type ChartProfileIndex =
  | OrderedProfileIndex
  | SpatialProfileIndex
  | HeatmapProfileIndex
  | CategoricalProfileIndex
  | RadialProfileIndex;

export interface PackedChartLayerOwner<ID extends StableID = StableID> {
  readonly id: ID;
  readonly profile: ChartProfile;
  readonly size: number;
  readonly stride: number;
  readonly identities: Sequence<ID>;
  readonly values: PackedValueStore;
  readonly index: ChartProfileIndex;
  readonly bounds: ChartLayerBounds;
  readonly revisions: ChartLayerRevisions;
  readonly geometryToken: object;
  readonly styleToken: object;
}

export interface PackedLayerInput<ID extends StableID = StableID> {
  readonly id: ID;
  readonly profile: ChartProfile;
  readonly identities: readonly ID[];
  readonly values: Float64Array;
  readonly stride: number;
}

export interface PackedLayerPatch<ID extends StableID = StableID> {
  readonly index: number;
  readonly identities: readonly ID[];
  readonly values: Float64Array;
}

export interface PackedLayerMutation<ID extends StableID = StableID> {
  readonly owner: PackedChartLayerOwner<ID>;
  readonly changed: boolean;
  readonly work: ChartLayerWork;
}

export interface PackedValueStore {
  readonly size: number;
  readonly stride: number;
  readonly depth: number;
  readonly base: Float64Array | null;
  readonly parent: PackedValueStore | null;
  readonly blocks: ReadonlyMap<number, Float64Array>;
}

export interface PackedAggregateHierarchy {
  readonly size: number;
  readonly leafCount: number;
  readonly depth: number;
  readonly base: Float64Array | null;
  readonly parent: PackedAggregateHierarchy | null;
  readonly overrides: ReadonlyMap<number, Float64Array>;
}

export interface PackedOrderedEnvelopeSelection {
  readonly indices: Uint32Array;
  readonly visitedNodes: number;
  readonly visibleDatums: number;
  readonly aggregated: boolean;
}

export interface PackedAggregateSelectionEntry {
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumY: number;
  readonly maximumY: number;
  readonly minimumValue: number;
  readonly maximumValue: number;
  readonly sum: number;
  readonly count: number;
  readonly firstIndex: number;
}

export interface PackedAggregateSelection {
  readonly entries: readonly PackedAggregateSelectionEntry[];
  readonly visitedNodes: number;
  readonly visibleDatums: number;
  readonly overflow: boolean;
}

export interface PackedSelectionBounds {
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumY: number;
  readonly maximumY: number;
}

export interface PackedVisibleSelection {
  readonly indices: Uint32Array;
  readonly visitedNodes: number;
  readonly visibleDatums: number;
  readonly overflow: boolean;
}

export function createPackedChartLayerOwner<ID extends StableID>(
  input: PackedLayerInput<ID>,
  maxDatums: number,
  maxIDCodeUnits: number,
  previous?: PackedChartLayerOwner<ID>,
): PackedLayerMutation<ID> {
  const identities = createSequence(input.identities, { maxItems: maxDatums, maxIDCodeUnits });
  const values = createPackedValueStore(input.values, input.stride);
  if (previous !== undefined && sameOwnerInput(previous, input)) {
    return { owner: previous, changed: false, work: emptyWork(input.identities.length) };
  }
  const identityChanged = previous === undefined || !sameIdentitySet(previous.identities, identities);
  const orderChanged = previous === undefined || !sameIdentityOrder(previous.identities, identities);
  const valueChanged = previous === undefined || !sameSemanticValues(previous, input);
  const geometryChanged = previous === undefined || !sameGeometryValues(previous, input);
  const aggregateChanged = previous === undefined || !sameAggregateValues(previous, input);
  const index = createProfileIndex(input.profile, values, input.identities.length);
  const revisions = Object.freeze({
    identity: previous === undefined ? 0 : previous.revisions.identity + (identityChanged ? 1 : 0),
    order: previous === undefined ? 0 : previous.revisions.order + (orderChanged ? 1 : 0),
    value: previous === undefined ? 0 : previous.revisions.value + (valueChanged ? 1 : 0),
    geometry: previous === undefined ? 0 : previous.revisions.geometry + (geometryChanged ? 1 : 0),
    aggregate: previous === undefined ? 0 : previous.revisions.aggregate + (aggregateChanged || orderChanged ? 1 : 0),
    style: previous?.revisions.style ?? 0,
  });
  const owner = freezeOwner({
    id: input.id,
    profile: input.profile,
    size: input.identities.length,
    stride: input.stride,
    identities,
    values,
    index,
    bounds: boundsForIndex(index),
    revisions,
    geometryToken: previous !== undefined && !geometryChanged ? previous.geometryToken : Object.freeze({}),
    styleToken: previous?.styleToken ?? Object.freeze({}),
  });
  return {
    owner,
    changed: true,
    work: Object.freeze({
      scannedDatums: input.identities.length,
      copiedValueBlocks: Math.ceil(input.identities.length / VALUE_BLOCK_DATUMS),
      repairedIndexEntries: 0,
      rebuiltIndexEntries: indexEntryCount(index),
    }),
  };
}

export function patchPackedChartLayerOwner<ID extends StableID>(
  previous: PackedChartLayerOwner<ID>,
  patch: PackedLayerPatch<ID>,
): PackedLayerMutation<ID> {
  if (patch.identities.length === 0) return { owner: previous, changed: false, work: emptyWork(0) };
  let changed = false;
  let packedChanged = false;
  let valueChanged = false;
  let geometryChanged = false;
  let aggregateChanged = false;
  let orderChanged = false;
  let identityChanged = false;
  for (let offset = 0; offset < patch.identities.length; offset += 1) {
    const index = patch.index + offset;
    const nextID = patch.identities[offset] as ID;
    const previousID = previous.identities.at(index);
    if (previousID !== nextID) {
      changed = true;
      orderChanged = true;
      if (!previous.identities.contains(nextID)) identityChanged = true;
    }
    const valueOffset = offset * previous.stride;
    const previousOffset = index * previous.stride;
    for (let component = 0; component < previous.stride; component += 1) {
      if (!Object.is(readPackedValue(previous.values, previousOffset + component), patch.values[valueOffset + component])) {
        changed = true;
        packedChanged = true;
        if (isValueComponent(previous.profile, component)) valueChanged = true;
        if (isGeometryComponent(previous.profile, component)) geometryChanged = true;
        if (isAggregateComponent(previous.profile, component)) aggregateChanged = true;
      }
    }
  }
  if (!changed) return { owner: previous, changed: false, work: emptyWork(patch.identities.length) };

  const identities = applySequencePatch(previous.identities, {
    type: 'splice',
    index: patch.index,
    deleteCount: patch.identities.length,
    inserted: patch.identities,
  });
  const valuePatch = packedChanged
    ? patchPackedValueStore(previous.values, patch.index, patch.values)
    : { store: previous.values, copiedBlocks: 0, materializedDatums: 0 };
  const indexRepair = packedChanged
    ? repairProfileIndex(
      previous.index,
      previous.profile,
      previous.values,
      valuePatch.store,
      patch.index,
      patch.identities.length,
    )
    : { index: previous.index, repairedEntries: 0, rebuiltEntries: 0 };
  const revisions = Object.freeze({
    identity: previous.revisions.identity + (identityChanged ? 1 : 0),
    order: previous.revisions.order + (orderChanged ? 1 : 0),
    value: previous.revisions.value + (valueChanged ? 1 : 0),
    geometry: previous.revisions.geometry + (geometryChanged ? 1 : 0),
    aggregate: previous.revisions.aggregate + (aggregateChanged ? 1 : 0),
    style: previous.revisions.style,
  });
  const owner = freezeOwner({
    id: previous.id,
    profile: previous.profile,
    size: previous.size,
    stride: previous.stride,
    identities,
    values: valuePatch.store,
    index: indexRepair.index,
    bounds: boundsForIndex(indexRepair.index),
    revisions,
    geometryToken: geometryChanged ? Object.freeze({}) : previous.geometryToken,
    styleToken: previous.styleToken,
  });
  return {
    owner,
    changed: true,
    work: Object.freeze({
      scannedDatums: patch.identities.length + valuePatch.materializedDatums,
      copiedValueBlocks: valuePatch.copiedBlocks,
      repairedIndexEntries: indexRepair.repairedEntries,
      rebuiltIndexEntries: indexRepair.rebuiltEntries,
    }),
  };
}

export function materializePackedLayerValues(owner: PackedChartLayerOwner): Float64Array {
  return materializePackedValueStore(owner.values);
}

export function materializePackedLayer<ID extends StableID>(owner: PackedChartLayerOwner<ID>): ChartDatum<ID>[] {
  const datums: ChartDatum<ID>[] = [];
  for (let index = 0; index < owner.size; index += 1) {
    const id = owner.identities.at(index) as ID;
    const offset = index * owner.stride;
    datums.push(materializeDatum(owner.profile, id, owner.values, offset));
  }
  return datums;
}

export function readPackedLayerValue(owner: PackedChartLayerOwner, datumIndex: number, component: number): number {
  return readPackedValue(owner.values, datumIndex * owner.stride + component);
}

export function selectPackedOrderedEnvelope(
  owner: PackedChartLayerOwner,
  minimumX: number,
  maximumX: number,
  pixelColumns: number,
  maximumRepresentatives: number,
): PackedOrderedEnvelopeSelection {
  if (owner.profile !== 'ordered-series' || maximumRepresentatives <= 0 || owner.size === 0 || maximumX < minimumX) {
    return Object.freeze({ indices: new Uint32Array(0), visitedNodes: 0, visibleDatums: 0, aggregated: false });
  }
  let start = lowerBoundPackedX(owner, minimumX);
  let end = upperBoundPackedX(owner, maximumX);
  if (start > 0) start -= 1;
  if (end < owner.size) end += 1;
  const visibleDatums = Math.max(0, end - start);
  if (visibleDatums <= maximumRepresentatives) {
    return Object.freeze({
      indices: Uint32Array.from({ length: visibleDatums }, (_, index) => start + index),
      visitedNodes: Math.ceil(Math.log2(Math.max(1, owner.size))) * 2,
      visibleDatums,
      aggregated: false,
    });
  }
  if (maximumRepresentatives < 4) {
    return Object.freeze({ indices: new Uint32Array(0), visitedNodes: 0, visibleDatums, aggregated: true });
  }
  const columns = Math.max(1, pixelColumns);
  const selected = new Set<number>();
  let visitedNodes = 0;
  const span = maximumX - minimumX;
  for (let column = 0; column < columns; column += 1) {
    const left = span === 0 ? minimumX : minimumX + span * column / columns;
    const right = span === 0 ? maximumX : minimumX + span * (column + 1) / columns;
    const rangeStart = column === 0 ? start : Math.max(start, lowerBoundPackedX(owner, left));
    const rangeEnd = Math.min(end, column === columns - 1 ? upperBoundPackedX(owner, right) : lowerBoundPackedX(owner, right));
    if (rangeStart >= rangeEnd) continue;
    const aggregate = queryHierarchyRange(owner.index.hierarchy, rangeStart, rangeEnd);
    visitedNodes += aggregate.visitedNodes;
    if (aggregate.first >= 0) selected.add(aggregate.first);
    if (aggregate.minimum >= 0) selected.add(aggregate.minimum);
    if (aggregate.maximum >= 0) selected.add(aggregate.maximum);
    if (aggregate.last >= 0) selected.add(aggregate.last);
  }
  const ordered = [...selected].sort((left, right) => left - right);
  if (ordered.length > maximumRepresentatives) {
    return Object.freeze({ indices: new Uint32Array(0), visitedNodes, visibleDatums, aggregated: true });
  }
  return Object.freeze({ indices: Uint32Array.from(ordered), visitedNodes, visibleDatums, aggregated: true });
}

export function selectPackedAggregateFrontier(
  owner: PackedChartLayerOwner,
  maximumRepresentatives: number,
  bounds?: PackedSelectionBounds,
): PackedAggregateSelection {
  if (owner.size === 0) return Object.freeze({ entries: Object.freeze([]), visitedNodes: 0, visibleDatums: 0, overflow: false });
  const hierarchy = owner.index.hierarchy;
  const lookup = new Map<number, Float64Array>();
  if (maximumRepresentatives <= 0 && bounds === undefined) {
    return Object.freeze({ entries: Object.freeze([]), visitedNodes: 1, visibleDatums: owner.size, overflow: true });
  }
  const visible = bounds === undefined
    ? { nodes: [1], visitedNodes: 1, visibleDatums: owner.size, overflow: false }
    : collectVisibleHierarchyNodes(owner, bounds, maximumRepresentatives, lookup);
  if (visible.overflow) return Object.freeze({
    entries: Object.freeze([]), visitedNodes: visible.visitedNodes, visibleDatums: visible.visibleDatums, overflow: true,
  });
  const heap: number[] = [];
  for (const node of visible.nodes) pushHierarchyNode(heap, node, hierarchy, lookup);
  let visitedNodes = visible.visitedNodes;
  while (heap.length < maximumRepresentatives) {
    const node = popLargestHierarchyNode(heap, hierarchy, lookup);
    if (node === null) break;
    if (node >= hierarchy.leafCount) { pushHierarchyNode(heap, node, hierarchy, lookup); break; }
    const left = node * 2;
    const right = left + 1;
    const leftValues = hierarchyNode(hierarchy, lookup, left);
    const rightValues = hierarchyNode(hierarchy, lookup, right);
    visitedNodes += 2;
    if ((leftValues[7] as number) > 0) pushHierarchyNode(heap, left, hierarchy, lookup);
    if ((rightValues[7] as number) > 0) pushHierarchyNode(heap, right, hierarchy, lookup);
  }
  heap.sort((left, right) => (hierarchyNode(hierarchy, lookup, left)[8] as number) - (hierarchyNode(hierarchy, lookup, right)[8] as number));
  const entries = heap.map((node): PackedAggregateSelectionEntry => {
    const values = hierarchyNode(hierarchy, lookup, node);
    return Object.freeze({
      minimumX: values[0] as number,
      maximumX: values[1] as number,
      minimumY: values[2] as number,
      maximumY: values[3] as number,
      minimumValue: values[4] as number,
      maximumValue: values[5] as number,
      sum: values[6] as number,
      count: values[7] as number,
      firstIndex: values[8] as number,
    });
  });
  return Object.freeze({ entries: Object.freeze(entries), visitedNodes, visibleDatums: visible.visibleDatums, overflow: false });
}

export function selectPackedVisibleIndices(
  owner: PackedChartLayerOwner,
  bounds: PackedSelectionBounds,
  maximumRepresentatives: number,
): PackedVisibleSelection {
  if (owner.size === 0 || maximumRepresentatives < 0) {
    return Object.freeze({ indices: new Uint32Array(0), visitedNodes: 0, visibleDatums: 0, overflow: false });
  }
  const hierarchy = owner.index.hierarchy;
  const lookup = new Map<number, Float64Array>();
  const stack = [1];
  const indices: number[] = [];
  let visitedNodes = 0;
  let visibleDatums = 0;
  let overflow = false;
  while (stack.length > 0) {
    const node = stack.pop() as number;
    const values = hierarchyNode(hierarchy, lookup, node);
    visitedNodes += 1;
    const count = values[7] as number;
    if (count === 0 || !intersectsSelection(owner.profile, values, bounds)) continue;
    if (containedBySelection(owner.profile, values, bounds)) {
      visibleDatums += count;
      if (indices.length + count > maximumRepresentatives) { overflow = true; continue; }
      visitedNodes += appendHierarchyLeaves(hierarchy, lookup, node, indices);
      continue;
    }
    if (node >= hierarchy.leafCount) {
      visibleDatums += 1;
      if (indices.length < maximumRepresentatives) indices.push(values[8] as number);
      else overflow = true;
      continue;
    }
    stack.push(node * 2 + 1, node * 2);
  }
  return Object.freeze({ indices: Uint32Array.from(indices), visitedNodes, visibleDatums, overflow });
}

function createPackedValueStore(values: Float64Array, stride: number): PackedValueStore {
  return Object.freeze({
    size: values.length / stride,
    stride,
    depth: 0,
    base: values,
    parent: null,
    blocks: new Map<number, Float64Array>(),
  });
}

function patchPackedValueStore(
  previousInput: PackedValueStore,
  datumIndex: number,
  replacement: Float64Array,
): { readonly store: PackedValueStore; readonly copiedBlocks: number; readonly materializedDatums: number } {
  const materialized = previousInput.depth >= MAX_VALUE_PATCH_DEPTH;
  const previous = materialized
    ? createPackedValueStore(materializePackedValueStore(previousInput), previousInput.stride)
    : previousInput;
  const datumCount = replacement.length / previous.stride;
  const firstBlock = Math.floor(datumIndex / VALUE_BLOCK_DATUMS);
  const lastBlock = Math.floor((datumIndex + datumCount - 1) / VALUE_BLOCK_DATUMS);
  const blocks = new Map<number, Float64Array>();
  for (let blockIndex = firstBlock; blockIndex <= lastBlock; blockIndex += 1) {
    const blockStartDatum = blockIndex * VALUE_BLOCK_DATUMS;
    const blockDatums = Math.min(VALUE_BLOCK_DATUMS, previous.size - blockStartDatum);
    const block = new Float64Array(blockDatums * previous.stride);
    const scalarStart = blockStartDatum * previous.stride;
    for (let scalar = 0; scalar < block.length; scalar += 1) {
      block[scalar] = readPackedValue(previous, scalarStart + scalar);
    }
    blocks.set(blockIndex, block);
  }
  for (let datumOffset = 0; datumOffset < datumCount; datumOffset += 1) {
    const targetDatum = datumIndex + datumOffset;
    const blockIndex = Math.floor(targetDatum / VALUE_BLOCK_DATUMS);
    const block = blocks.get(blockIndex) as Float64Array;
    const targetOffset = (targetDatum % VALUE_BLOCK_DATUMS) * previous.stride;
    const sourceOffset = datumOffset * previous.stride;
    block.set(replacement.subarray(sourceOffset, sourceOffset + previous.stride), targetOffset);
  }
  return {
    store: Object.freeze({
      size: previous.size,
      stride: previous.stride,
      depth: previous.depth + 1,
      base: null,
      parent: previous,
      blocks,
    }),
    copiedBlocks: blocks.size + (materialized ? Math.ceil(previousInput.size / VALUE_BLOCK_DATUMS) : 0),
    materializedDatums: materialized ? previousInput.size : 0,
  };
}

function readPackedValue(store: PackedValueStore, scalarIndex: number): number {
  let current: PackedValueStore | null = store;
  while (current !== null) {
    if (current.base !== null) return current.base[scalarIndex] as number;
    const datumIndex = Math.floor(scalarIndex / current.stride);
    const blockIndex = Math.floor(datumIndex / VALUE_BLOCK_DATUMS);
    const block = current.blocks.get(blockIndex);
    if (block !== undefined) {
      const localDatum = datumIndex % VALUE_BLOCK_DATUMS;
      return block[localDatum * current.stride + scalarIndex % current.stride] as number;
    }
    current = current.parent;
  }
  throw new Error('Packed chart value is unavailable.');
}

function materializePackedValueStore(store: PackedValueStore): Float64Array {
  if (store.base !== null) return store.base;
  const values = new Float64Array(store.size * store.stride);
  for (let index = 0; index < values.length; index += 1) values[index] = readPackedValue(store, index);
  return values;
}

function createSpatialOrder(values: PackedValueStore, size: number): Uint32Array {
  let minimumX = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < size; index += 1) {
    const x = readPackedValue(values, index * values.stride);
    const y = readPackedValue(values, index * values.stride + 1);
    minimumX = Math.min(minimumX, x); maximumX = Math.max(maximumX, x);
    minimumY = Math.min(minimumY, y); maximumY = Math.max(maximumY, y);
  }
  const spanX = maximumX - minimumX || 1;
  const spanY = maximumY - minimumY || 1;
  const keys = new Uint32Array(size);
  let order = Uint32Array.from({ length: size }, (_, index) => index);
  let output = new Uint32Array(size);
  for (let index = 0; index < size; index += 1) {
    const x = Math.max(0, Math.min(65_535, Math.floor((readPackedValue(values, index * values.stride) - minimumX) / spanX * 65_535)));
    const y = Math.max(0, Math.min(65_535, Math.floor((readPackedValue(values, index * values.stride + 1) - minimumY) / spanY * 65_535)));
    keys[index] = interleaveSpatial16(x) | (interleaveSpatial16(y) << 1);
  }
  for (let shift = 0; shift < 32; shift += 8) {
    const counts = new Uint32Array(256);
    for (const datum of order) {
      const bucket = ((keys[datum] as number) >>> shift) & 0xff;
      counts[bucket] = (counts[bucket] as number) + 1;
    }
    let cursor = 0;
    for (let bucket = 0; bucket < counts.length; bucket += 1) {
      const count = counts[bucket] as number;
      counts[bucket] = cursor;
      cursor += count;
    }
    for (const datum of order) {
      const bucket = ((keys[datum] as number) >>> shift) & 0xff;
      output[counts[bucket] as number] = datum;
      counts[bucket] = (counts[bucket] as number) + 1;
    }
    const temporary = order; order = output; output = temporary;
  }
  return order;
}

function interleaveSpatial16(input: number): number {
  let value = input & 0xffff;
  value = (value | (value << 8)) & 0x00ff00ff;
  value = (value | (value << 4)) & 0x0f0f0f0f;
  value = (value | (value << 2)) & 0x33333333;
  value = (value | (value << 1)) & 0x55555555;
  return value;
}

function createProfileIndex(profile: ChartProfile, values: PackedValueStore, size: number): ChartProfileIndex {
  if (profile === 'point' || profile === 'grid-cell') {
    const order = createSpatialOrder(values, size);
    const positions = new Uint32Array(size);
    for (let position = 0; position < order.length; position += 1) positions[order[position] as number] = position;
    const hierarchy = buildHierarchy(profile, values, size, order);
    if (profile === 'point') return Object.freeze({ kind: 'spatial', order, positions, hierarchy });
    return createHeatmapIndex(values, size, hierarchy, order, positions);
  }
  const hierarchy = buildHierarchy(profile, values, size);
  if (profile === 'ordered-series') return Object.freeze({ kind: 'ordered', hierarchy });
  if (profile === 'cartesian-segment') {
    const slots = new Float64Array(size * 2);
    for (let index = 0; index < size; index += 1) {
      slots[index * 2] = readPackedValue(values, index * 4);
      slots[index * 2 + 1] = readPackedValue(values, index * 4 + 2);
    }
    return Object.freeze({ kind: 'categorical', slots, hierarchy });
  }
  return createRadialIndex(values, size, hierarchy);
}

function repairProfileIndex(
  previous: ChartProfileIndex,
  profile: ChartProfile,
  previousValues: PackedValueStore,
  values: PackedValueStore,
  index: number,
  count: number,
): { readonly index: ChartProfileIndex; readonly repairedEntries: number; readonly rebuiltEntries: number } {
  if ((previous.kind === 'spatial' || previous.kind === 'heatmap')
    && previous.hierarchy.depth >= MAX_HIERARCHY_PATCH_DEPTH) {
    const rebuilt = createProfileIndex(profile, values, values.size);
    return { index: rebuilt, repairedEntries: 0, rebuiltEntries: indexEntryCount(rebuilt) };
  }
  const positions = previous.kind === 'spatial' || previous.kind === 'heatmap' ? previous.positions : undefined;
  const repaired = repairHierarchy(
    previous.hierarchy,
    profile,
    values,
    index,
    count,
    positions,
    previous.kind === 'spatial' || previous.kind === 'heatmap' ? previous.order : undefined,
  );
  if (previous.kind === 'ordered') return { index: Object.freeze({ kind: 'ordered', hierarchy: repaired.hierarchy }), repairedEntries: repaired.entries, rebuiltEntries: repaired.rebuiltEntries };
  if (previous.kind === 'spatial') return {
    index: Object.freeze({ kind: 'spatial', order: previous.order, positions: previous.positions, hierarchy: repaired.hierarchy }),
    repairedEntries: repaired.entries,
    rebuiltEntries: repaired.rebuiltEntries,
  };
  if (previous.kind === 'heatmap') {
    let geometryChanged = false;
    for (let datum = index; datum < index + count; datum += 1) {
      const offset = datum * 3;
      if (!Object.is(readPackedValue(previousValues, offset), readPackedValue(values, offset))
        || !Object.is(readPackedValue(previousValues, offset + 1), readPackedValue(values, offset + 1))) {
        geometryChanged = true;
        break;
      }
    }
    if (!geometryChanged) {
      return {
        index: Object.freeze({ ...previous, hierarchy: repaired.hierarchy }),
        repairedEntries: repaired.entries,
        rebuiltEntries: repaired.rebuiltEntries,
      };
    }
  }
  if (previous.kind === 'radial') {
    const prefix = new Float64Array(previous.prefix);
    let cumulative = index === 0 ? 0 : prefix[index] as number;
    for (let datum = index; datum < values.size; datum += 1) {
      cumulative += readPackedValue(values, datum * values.stride);
      prefix[datum + 1] = cumulative;
    }
    return {
      index: Object.freeze({ kind: 'radial', prefix, total: cumulative, hierarchy: repaired.hierarchy }),
      repairedEntries: repaired.entries + values.size - index,
      rebuiltEntries: repaired.rebuiltEntries,
    };
  }
  const rebuilt = createProfileIndex(profile, values, values.size);
  return {
    index: rebuilt,
    repairedEntries: repaired.entries,
    rebuiltEntries: repaired.rebuiltEntries + indexEntryCount(rebuilt),
  };
}

function buildHierarchy(
  profile: ChartProfile,
  values: PackedValueStore,
  size: number,
  order?: Uint32Array,
): PackedAggregateHierarchy {
  let leafCount = 1;
  while (leafCount < Math.max(1, size)) leafCount *= 2;
  const data = new Float64Array(leafCount * 2 * HIERARCHY_STRIDE);
  fillEmptyNodes(data);
  for (let index = 0; index < size; index += 1) writeLeaf(data, leafCount + index, profile, values, order?.[index] ?? index);
  for (let node = leafCount - 1; node > 0; node -= 1) mergeNodes(data, node, data, node * 2, data, node * 2 + 1);
  return Object.freeze({ size, leafCount, depth: 0, base: data, parent: null, overrides: new Map<number, Float64Array>() });
}

function repairHierarchy(
  previousInput: PackedAggregateHierarchy,
  profile: ChartProfile,
  values: PackedValueStore,
  index: number,
  count: number,
  positions?: Uint32Array,
  order?: Uint32Array,
): { readonly hierarchy: PackedAggregateHierarchy; readonly entries: number; readonly rebuiltEntries: number } {
  const materialized = previousInput.depth >= MAX_HIERARCHY_PATCH_DEPTH;
  const previous = materialized
    ? materializeHierarchy(previousInput)
    : previousInput;
  const levels: Set<number>[] = [];
  for (let datum = index; datum < index + count; datum += 1) {
    let node = previous.leafCount + (positions?.[datum] ?? datum);
    let level = 0;
    while (node > 0) {
      let nodes = levels[level];
      if (nodes === undefined) {
        nodes = new Set<number>();
        levels.push(nodes);
      }
      nodes.add(node);
      node = Math.floor(node / 2);
      level += 1;
    }
  }
  const overrides = new Map<number, Float64Array>();
  for (const nodes of levels) {
    for (const node of nodes) {
      const data = new Float64Array(HIERARCHY_STRIDE);
      fillEmptyNode(data, 0);
      if (node >= previous.leafCount) {
        const leafPosition = node - previous.leafCount;
        const datumIndex = order?.[leafPosition] ?? leafPosition;
        writeLeaf(data, 0, profile, values, datumIndex);
      } else {
        mergeNodeValues(data, 0, hierarchyNode(previous, overrides, node * 2), hierarchyNode(previous, overrides, node * 2 + 1));
      }
      overrides.set(node, data);
    }
  }
  return {
    hierarchy: Object.freeze({
      size: previous.size,
      leafCount: previous.leafCount,
      depth: previous.depth + 1,
      base: null,
      parent: previous,
      overrides,
    }),
    entries: overrides.size,
    rebuiltEntries: materialized ? previousInput.leafCount * 2 : 0,
  };
}

function hierarchyNode(
  hierarchy: PackedAggregateHierarchy,
  local: ReadonlyMap<number, Float64Array>,
  node: number,
): Float64Array {
  const current = local.get(node);
  if (current !== undefined) return current;
  let owner: PackedAggregateHierarchy | null = hierarchy;
  while (owner !== null) {
    const override = owner.overrides.get(node);
    if (override !== undefined) return override;
    if (owner.base !== null) return owner.base.subarray(node * HIERARCHY_STRIDE, (node + 1) * HIERARCHY_STRIDE);
    owner = owner.parent;
  }
  throw new Error('Chart hierarchy node is unavailable.');
}

interface HierarchyRangeResult {
  readonly first: number;
  readonly last: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly minimumValue: number;
  readonly maximumValue: number;
  readonly visitedNodes: number;
}

function queryHierarchyRange(
  hierarchy: PackedAggregateHierarchy,
  start: number,
  end: number,
): HierarchyRangeResult {
  let first = -1;
  let last = -1;
  let minimum = -1;
  let maximum = -1;
  let minimumValue = Number.POSITIVE_INFINITY;
  let maximumValue = Number.NEGATIVE_INFINITY;
  let visitedNodes = 0;
  const overrides = new Map<number, Float64Array>();
  const visit = (node: number, nodeStart: number, nodeEnd: number): void => {
    visitedNodes += 1;
    if (nodeEnd <= start || nodeStart >= end) return;
    if (start <= nodeStart && nodeEnd <= end) {
      const values = hierarchyNode(hierarchy, overrides, node);
      if ((values[7] as number) === 0) return;
      if (first < 0) first = values[8] as number;
      last = values[9] as number;
      if ((values[4] as number) < minimumValue) { minimumValue = values[4] as number; minimum = values[10] as number; }
      if ((values[5] as number) > maximumValue) { maximumValue = values[5] as number; maximum = values[11] as number; }
      return;
    }
    const middle = (nodeStart + nodeEnd) >>> 1;
    visit(node * 2, nodeStart, middle);
    visit(node * 2 + 1, middle, nodeEnd);
  };
  visit(1, 0, hierarchy.leafCount);
  return { first, last, minimum, maximum, minimumValue, maximumValue, visitedNodes };
}

function lowerBoundPackedX(owner: PackedChartLayerOwner, value: number): number {
  let low = 0;
  let high = owner.size;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (readPackedLayerValue(owner, middle, 0) < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

function upperBoundPackedX(owner: PackedChartLayerOwner, value: number): number {
  let low = 0;
  let high = owner.size;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (readPackedLayerValue(owner, middle, 0) <= value) low = middle + 1;
    else high = middle;
  }
  return low;
}

function collectVisibleHierarchyNodes(
  owner: PackedChartLayerOwner,
  bounds: PackedSelectionBounds,
  maximumNodes: number,
  lookup: ReadonlyMap<number, Float64Array>,
): { readonly nodes: number[]; readonly visitedNodes: number; readonly visibleDatums: number; readonly overflow: boolean } {
  const hierarchy = owner.index.hierarchy;
  const stack = [1];
  const nodes: number[] = [];
  let visitedNodes = 0;
  let visibleDatums = 0;
  let overflow = false;
  while (stack.length > 0) {
    const node = stack.pop() as number;
    const values = hierarchyNode(hierarchy, lookup, node);
    visitedNodes += 1;
    const count = values[7] as number;
    if (count === 0 || !intersectsSelection(owner.profile, values, bounds)) continue;
    if (containedBySelection(owner.profile, values, bounds) || node >= hierarchy.leafCount) {
      visibleDatums += count;
      if (nodes.length < maximumNodes) nodes.push(node);
      else overflow = true;
      continue;
    }
    stack.push(node * 2 + 1, node * 2);
  }
  return { nodes, visitedNodes, visibleDatums, overflow };
}

function intersectsSelection(
  profile: ChartProfile,
  values: Float64Array,
  bounds: PackedSelectionBounds,
): boolean {
  if (profile === 'point') {
    return (values[1] as number) >= bounds.minimumX && (values[0] as number) <= bounds.maximumX
      && (values[3] as number) >= bounds.minimumY && (values[2] as number) <= bounds.maximumY;
  }
  return (values[1] as number) > bounds.minimumX && (values[0] as number) < bounds.maximumX
    && (values[3] as number) > bounds.minimumY && (values[2] as number) < bounds.maximumY;
}

function containedBySelection(
  _profile: ChartProfile,
  values: Float64Array,
  bounds: PackedSelectionBounds,
): boolean {
  return (values[0] as number) >= bounds.minimumX
    && (values[1] as number) <= bounds.maximumX
    && (values[2] as number) >= bounds.minimumY
    && (values[3] as number) <= bounds.maximumY;
}

function appendHierarchyLeaves(
  hierarchy: PackedAggregateHierarchy,
  lookup: ReadonlyMap<number, Float64Array>,
  root: number,
  output: number[],
): number {
  const stack = [root];
  let visitedNodes = 0;
  while (stack.length > 0) {
    const node = stack.pop() as number;
    const values = hierarchyNode(hierarchy, lookup, node);
    visitedNodes += 1;
    if ((values[7] as number) === 0) continue;
    if (node >= hierarchy.leafCount) output.push(values[8] as number);
    else stack.push(node * 2 + 1, node * 2);
  }
  return visitedNodes;
}

function pushHierarchyNode(
  heap: number[],
  node: number,
  hierarchy: PackedAggregateHierarchy,
  lookup: ReadonlyMap<number, Float64Array>,
): void {
  heap.push(node);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = (index - 1) >>> 1;
    if (compareHierarchyPriority(heap[parent] as number, node, hierarchy, lookup) >= 0) break;
    heap[index] = heap[parent] as number;
    index = parent;
  }
  heap[index] = node;
}

function popLargestHierarchyNode(
  heap: number[],
  hierarchy: PackedAggregateHierarchy,
  lookup: ReadonlyMap<number, Float64Array>,
): number | null {
  if (heap.length === 0) return null;
  const root = heap[0] as number;
  const tail = heap.pop() as number;
  if (heap.length > 0) {
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= heap.length) break;
      const right = left + 1;
      const child = right < heap.length
        && compareHierarchyPriority(heap[right] as number, heap[left] as number, hierarchy, lookup) > 0 ? right : left;
      if (compareHierarchyPriority(tail, heap[child] as number, hierarchy, lookup) >= 0) break;
      heap[index] = heap[child] as number;
      index = child;
    }
    heap[index] = tail;
  }
  return root;
}

function compareHierarchyPriority(
  left: number,
  right: number,
  hierarchy: PackedAggregateHierarchy,
  lookup: ReadonlyMap<number, Float64Array>,
): number {
  const leftCount = hierarchyNode(hierarchy, lookup, left)[7] as number;
  const rightCount = hierarchyNode(hierarchy, lookup, right)[7] as number;
  return leftCount - rightCount
    || Number(left < hierarchy.leafCount) - Number(right < hierarchy.leafCount)
    || right - left;
}

function materializeHierarchy(hierarchy: PackedAggregateHierarchy): PackedAggregateHierarchy {
  const data = new Float64Array(hierarchy.leafCount * 2 * HIERARCHY_STRIDE);
  const overrides = new Map<number, Float64Array>();
  for (let node = 0; node < hierarchy.leafCount * 2; node += 1) data.set(hierarchyNode(hierarchy, overrides, node), node * HIERARCHY_STRIDE);
  return Object.freeze({ size: hierarchy.size, leafCount: hierarchy.leafCount, depth: 0, base: data, parent: null, overrides: new Map<number, Float64Array>() });
}

function createHeatmapIndex(
  values: PackedValueStore,
  size: number,
  hierarchy: PackedAggregateHierarchy,
  order: Uint32Array,
  positions: Uint32Array,
): HeatmapProfileIndex {
  const rows = new Map<number, number[]>();
  let minimumRow = Number.POSITIVE_INFINITY;
  let maximumRow = Number.NEGATIVE_INFINITY;
  let minimumColumn = Number.POSITIVE_INFINITY;
  let maximumColumn = Number.NEGATIVE_INFINITY;
  const occupied = new Map<number, Set<number>>();
  for (let index = 0; index < size; index += 1) {
    const offset = index * 3;
    const column = readPackedValue(values, offset);
    const row = readPackedValue(values, offset + 1);
    const rowItems = rows.get(row);
    if (rowItems === undefined) rows.set(row, [index]);
    else rowItems.push(index);
    const columns = occupied.get(row);
    if (columns === undefined) occupied.set(row, new Set([column]));
    else columns.add(column);
    minimumRow = Math.min(minimumRow, row);
    maximumRow = Math.max(maximumRow, row);
    minimumColumn = Math.min(minimumColumn, column);
    maximumColumn = Math.max(maximumColumn, column);
  }
  const rowValues = Float64Array.from(rows.keys());
  const rowOffsets = new Uint32Array(rowValues.length + 1);
  const datumIndices = new Uint32Array(size);
  let cursor = 0;
  for (let rowIndex = 0; rowIndex < rowValues.length; rowIndex += 1) {
    rowOffsets[rowIndex] = cursor;
    const items = rows.get(rowValues[rowIndex] as number) as number[];
    datumIndices.set(items, cursor);
    cursor += items.length;
  }
  rowOffsets[rowValues.length] = cursor;
  const area = size === 0 ? 0 : (maximumRow - minimumRow + 1) * (maximumColumn - minimumColumn + 1);
  const dense = Number.isSafeInteger(area) && area === size && [...occupied.values()].every((columns) => columns.size === maximumColumn - minimumColumn + 1);
  return Object.freeze({
    kind: 'heatmap', representation: dense ? 'dense' : 'sparse', order, positions,
    rowValues, rowOffsets, datumIndices, hierarchy,
  });
}

function createRadialIndex(values: PackedValueStore, size: number, hierarchy: PackedAggregateHierarchy): RadialProfileIndex {
  const prefix = new Float64Array(size + 1);
  let total = 0;
  for (let index = 0; index < size; index += 1) {
    total += readPackedValue(values, index * 3);
    prefix[index + 1] = total;
  }
  return Object.freeze({ kind: 'radial', prefix, total, hierarchy });
}

function writeLeaf(
  target: Float64Array,
  node: number,
  profile: ChartProfile,
  values: PackedValueStore,
  datumIndex: number,
): void {
  if (datumIndex >= values.size) return;
  const offset = node * HIERARCHY_STRIDE;
  const valueOffset = datumIndex * values.stride;
  let minimumX: number;
  let maximumX: number;
  let minimumY: number;
  let maximumY: number;
  let aggregate: number;
  if (profile === 'point' || profile === 'ordered-series') {
    minimumX = maximumX = readPackedValue(values, valueOffset);
    minimumY = maximumY = readPackedValue(values, valueOffset + 1);
    aggregate = maximumY;
  } else if (profile === 'cartesian-segment') {
    const x1 = readPackedValue(values, valueOffset);
    const y1 = readPackedValue(values, valueOffset + 1);
    const x2 = readPackedValue(values, valueOffset + 2);
    const y2 = readPackedValue(values, valueOffset + 3);
    minimumX = Math.min(x1, x2); maximumX = Math.max(x1, x2);
    minimumY = Math.min(y1, y2); maximumY = Math.max(y1, y2);
    aggregate = y2;
  } else if (profile === 'grid-cell') {
    minimumX = readPackedValue(values, valueOffset);
    maximumX = minimumX + 1;
    minimumY = readPackedValue(values, valueOffset + 1);
    maximumY = minimumY + 1;
    aggregate = readPackedValue(values, valueOffset + 2);
  } else {
    minimumX = maximumX = datumIndex;
    minimumY = readPackedValue(values, valueOffset + 1);
    maximumY = readPackedValue(values, valueOffset + 2);
    aggregate = readPackedValue(values, valueOffset);
  }
  target[offset] = minimumX;
  target[offset + 1] = maximumX;
  target[offset + 2] = minimumY;
  target[offset + 3] = maximumY;
  target[offset + 4] = aggregate;
  target[offset + 5] = aggregate;
  target[offset + 6] = aggregate;
  target[offset + 7] = 1;
  target[offset + 8] = datumIndex;
  target[offset + 9] = datumIndex;
  target[offset + 10] = datumIndex;
  target[offset + 11] = datumIndex;
}

function mergeNodes(target: Float64Array, targetNode: number, left: Float64Array, leftNode: number, right: Float64Array, rightNode: number): void {
  mergeNodeValues(
    target,
    targetNode * HIERARCHY_STRIDE,
    left.subarray(leftNode * HIERARCHY_STRIDE, (leftNode + 1) * HIERARCHY_STRIDE),
    right.subarray(rightNode * HIERARCHY_STRIDE, (rightNode + 1) * HIERARCHY_STRIDE),
  );
}

function mergeNodeValues(target: Float64Array, offset: number, left: Float64Array, right: Float64Array): void {
  const leftCount = left[7] as number;
  const rightCount = right[7] as number;
  if (leftCount === 0) { target.set(right, offset); return; }
  if (rightCount === 0) { target.set(left, offset); return; }
  target[offset] = Math.min(left[0] as number, right[0] as number);
  target[offset + 1] = Math.max(left[1] as number, right[1] as number);
  target[offset + 2] = Math.min(left[2] as number, right[2] as number);
  target[offset + 3] = Math.max(left[3] as number, right[3] as number);
  target[offset + 4] = Math.min(left[4] as number, right[4] as number);
  target[offset + 5] = Math.max(left[5] as number, right[5] as number);
  target[offset + 6] = (left[6] as number) + (right[6] as number);
  target[offset + 7] = leftCount + rightCount;
  target[offset + 8] = left[8] as number;
  target[offset + 9] = right[9] as number;
  target[offset + 10] = (left[4] as number) <= (right[4] as number) ? left[10] as number : right[10] as number;
  target[offset + 11] = (left[5] as number) >= (right[5] as number) ? left[11] as number : right[11] as number;
}

function fillEmptyNodes(data: Float64Array): void {
  for (let node = 0; node < data.length / HIERARCHY_STRIDE; node += 1) fillEmptyNode(data, node * HIERARCHY_STRIDE);
}

function fillEmptyNode(data: Float64Array, offset: number): void {
  data[offset] = Number.POSITIVE_INFINITY;
  data[offset + 1] = Number.NEGATIVE_INFINITY;
  data[offset + 2] = Number.POSITIVE_INFINITY;
  data[offset + 3] = Number.NEGATIVE_INFINITY;
  data[offset + 4] = Number.POSITIVE_INFINITY;
  data[offset + 5] = Number.NEGATIVE_INFINITY;
  data[offset + 6] = 0;
  data[offset + 7] = 0;
  data[offset + 8] = -1;
  data[offset + 9] = -1;
  data[offset + 10] = -1;
  data[offset + 11] = -1;
}

function boundsForIndex(index: ChartProfileIndex): ChartLayerBounds {
  const root = hierarchyNode(index.hierarchy, new Map(), 1);
  return Object.freeze({
    hasValues: (root[7] as number) > 0 && index.kind !== 'radial',
    minimumX: root[0] as number,
    maximumX: root[1] as number,
    minimumY: root[2] as number,
    maximumY: root[3] as number,
  });
}

function indexEntryCount(index: ChartProfileIndex): number {
  const hierarchyEntries = index.hierarchy.leafCount * 2;
  if (index.kind === 'spatial') return hierarchyEntries + index.order.length + index.positions.length;
  if (index.kind === 'heatmap') {
    return hierarchyEntries + index.order.length + index.positions.length + index.rowOffsets.length + index.datumIndices.length;
  }
  if (index.kind === 'categorical') return hierarchyEntries + index.slots.length / 2;
  if (index.kind === 'radial') return hierarchyEntries + index.prefix.length;
  return hierarchyEntries;
}

function sameOwnerInput<ID extends StableID>(owner: PackedChartLayerOwner<ID>, input: PackedLayerInput<ID>): boolean {
  return owner.id === input.id
    && owner.profile === input.profile
    && sameIdentityArray(owner.identities, input.identities)
    && samePackedValues(owner.values, input.values);
}

function sameIdentityArray<ID extends StableID>(sequence: Sequence<ID>, ids: readonly ID[]): boolean {
  if (sequence.size !== ids.length) return false;
  for (let index = 0; index < ids.length; index += 1) if (sequence.at(index) !== ids[index]) return false;
  return true;
}

function sameIdentityOrder<ID extends StableID>(left: Sequence<ID>, right: Sequence<ID>): boolean {
  if (left.size !== right.size) return false;
  for (let index = 0; index < left.size; index += 1) if (left.at(index) !== right.at(index)) return false;
  return true;
}

function sameIdentitySet<ID extends StableID>(left: Sequence<ID>, right: Sequence<ID>): boolean {
  if (left.size !== right.size) return false;
  for (let index = 0; index < right.size; index += 1) {
    const id = right.at(index);
    if (id === null || !left.contains(id)) return false;
  }
  return true;
}

function samePackedValues(store: PackedValueStore, values: Float64Array): boolean {
  if (store.size * store.stride !== values.length) return false;
  for (let index = 0; index < values.length; index += 1) if (!Object.is(readPackedValue(store, index), values[index])) return false;
  return true;
}

function sameSemanticValues<ID extends StableID>(owner: PackedChartLayerOwner<ID>, input: PackedLayerInput<ID>): boolean {
  return sameSelectedValues(owner, input, isValueComponent);
}

function sameGeometryValues<ID extends StableID>(owner: PackedChartLayerOwner<ID>, input: PackedLayerInput<ID>): boolean {
  return sameSelectedValues(owner, input, isGeometryComponent);
}

function sameAggregateValues<ID extends StableID>(owner: PackedChartLayerOwner<ID>, input: PackedLayerInput<ID>): boolean {
  return sameSelectedValues(owner, input, isAggregateComponent);
}

function sameSelectedValues<ID extends StableID>(
  owner: PackedChartLayerOwner<ID>,
  input: PackedLayerInput<ID>,
  selected: (profile: ChartProfile, component: number) => boolean,
): boolean {
  if (owner.profile !== input.profile || owner.stride !== input.stride || owner.size * owner.stride !== input.values.length) return false;
  for (let scalar = 0; scalar < input.values.length; scalar += 1) {
    const component = scalar % owner.stride;
    if (selected(owner.profile, component) && !Object.is(readPackedValue(owner.values, scalar), input.values[scalar])) return false;
  }
  return true;
}

function isValueComponent(profile: ChartProfile, component: number): boolean {
  if (profile === 'point' || profile === 'ordered-series') return component === 1;
  if (profile === 'cartesian-segment') return component === 1 || component === 3;
  if (profile === 'grid-cell') return component === 2;
  return component === 0;
}

function isGeometryComponent(profile: ChartProfile, component: number): boolean {
  return profile !== 'grid-cell' || component < 2;
}

function isAggregateComponent(profile: ChartProfile, component: number): boolean {
  if (profile === 'point' || profile === 'ordered-series') return component === 1;
  if (profile === 'cartesian-segment') return component === 3;
  if (profile === 'grid-cell') return component === 2;
  return component === 0;
}

function freezeOwner<ID extends StableID>(owner: PackedChartLayerOwner<ID>): PackedChartLayerOwner<ID> {
  return Object.freeze(owner);
}

function emptyWork(scannedDatums: number): ChartLayerWork {
  return Object.freeze({ scannedDatums, copiedValueBlocks: 0, repairedIndexEntries: 0, rebuiltIndexEntries: 0 });
}

function materializeDatum<ID extends StableID>(
  profile: ChartProfile,
  id: ID,
  values: PackedValueStore,
  offset: number,
): ChartDatum<ID> {
  if (profile === 'point' || profile === 'ordered-series') {
    return Object.freeze({ id, x: readPackedValue(values, offset), y: readPackedValue(values, offset + 1) });
  }
  if (profile === 'cartesian-segment') {
    return Object.freeze({
      id,
      x1: readPackedValue(values, offset),
      y1: readPackedValue(values, offset + 1),
      x2: readPackedValue(values, offset + 2),
      y2: readPackedValue(values, offset + 3),
    });
  }
  if (profile === 'grid-cell') {
    return Object.freeze({
      id,
      column: readPackedValue(values, offset),
      row: readPackedValue(values, offset + 1),
      value: readPackedValue(values, offset + 2),
    });
  }
  return Object.freeze({
    id,
    value: readPackedValue(values, offset),
    innerRadius: readPackedValue(values, offset + 1),
    outerRadius: readPackedValue(values, offset + 2),
  });
}

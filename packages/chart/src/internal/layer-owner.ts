import type { StableID } from '@sectile/core';
import { applySequencePatch, createSequence, type Sequence } from '@sectile/core/sequence';
import type { ChartDatum, ChartProfile } from '../model.js';

const VALUE_BLOCK_DATUMS = 256;
const MAX_VALUE_PATCH_DEPTH = 16;
const MAX_HIERARCHY_PATCH_DEPTH = 16;
const HIERARCHY_STRIDE = 10;

export interface ChartLayerRevisions {
  readonly identity: number;
  readonly order: number;
  readonly value: number;
  readonly aggregate: number;
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
  readonly hierarchy: PackedAggregateHierarchy;
}

export interface HeatmapProfileIndex {
  readonly kind: 'heatmap';
  readonly representation: 'dense' | 'sparse';
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
  const valueChanged = previous === undefined || !samePackedValues(previous.values, input.values);
  const index = createProfileIndex(input.profile, values, input.identities.length);
  const revisions = Object.freeze({
    identity: previous === undefined ? 0 : previous.revisions.identity + (identityChanged ? 1 : 0),
    order: previous === undefined ? 0 : previous.revisions.order + (orderChanged ? 1 : 0),
    value: previous === undefined ? 0 : previous.revisions.value + (valueChanged ? 1 : 0),
    aggregate: previous === undefined ? 0 : previous.revisions.aggregate + (valueChanged || orderChanged ? 1 : 0),
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
  let valueChanged = false;
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
        valueChanged = true;
        break;
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
  const valuePatch = valueChanged
    ? patchPackedValueStore(previous.values, patch.index, patch.values)
    : { store: previous.values, copiedBlocks: 0, materializedDatums: 0 };
  const indexRepair = valueChanged
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
    aggregate: previous.revisions.aggregate + (valueChanged ? 1 : 0),
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

function createProfileIndex(profile: ChartProfile, values: PackedValueStore, size: number): ChartProfileIndex {
  const hierarchy = buildHierarchy(profile, values, size);
  if (profile === 'ordered-series') return Object.freeze({ kind: 'ordered', hierarchy });
  if (profile === 'point') return Object.freeze({ kind: 'spatial', hierarchy });
  if (profile === 'grid-cell') return createHeatmapIndex(values, size, hierarchy);
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
  const repaired = repairHierarchy(previous.hierarchy, profile, values, index, count);
  if (previous.kind === 'ordered') return { index: Object.freeze({ kind: 'ordered', hierarchy: repaired.hierarchy }), repairedEntries: repaired.entries, rebuiltEntries: repaired.rebuiltEntries };
  if (previous.kind === 'spatial') return { index: Object.freeze({ kind: 'spatial', hierarchy: repaired.hierarchy }), repairedEntries: repaired.entries, rebuiltEntries: repaired.rebuiltEntries };
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

function buildHierarchy(profile: ChartProfile, values: PackedValueStore, size: number): PackedAggregateHierarchy {
  let leafCount = 1;
  while (leafCount < Math.max(1, size)) leafCount *= 2;
  const data = new Float64Array(leafCount * 2 * HIERARCHY_STRIDE);
  fillEmptyNodes(data);
  for (let index = 0; index < size; index += 1) writeLeaf(data, leafCount + index, profile, values, index);
  for (let node = leafCount - 1; node > 0; node -= 1) mergeNodes(data, node, data, node * 2, data, node * 2 + 1);
  return Object.freeze({ size, leafCount, depth: 0, base: data, parent: null, overrides: new Map<number, Float64Array>() });
}

function repairHierarchy(
  previousInput: PackedAggregateHierarchy,
  profile: ChartProfile,
  values: PackedValueStore,
  index: number,
  count: number,
): { readonly hierarchy: PackedAggregateHierarchy; readonly entries: number; readonly rebuiltEntries: number } {
  const materialized = previousInput.depth >= MAX_HIERARCHY_PATCH_DEPTH;
  const previous = materialized
    ? materializeHierarchy(previousInput)
    : previousInput;
  const levels: Set<number>[] = [];
  for (let datum = index; datum < index + count; datum += 1) {
    let node = previous.leafCount + datum;
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
        writeLeaf(data, 0, profile, values, node - previous.leafCount);
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

function materializeHierarchy(hierarchy: PackedAggregateHierarchy): PackedAggregateHierarchy {
  const data = new Float64Array(hierarchy.leafCount * 2 * HIERARCHY_STRIDE);
  for (let node = 0; node < hierarchy.leafCount * 2; node += 1) data.set(hierarchyNode(hierarchy, new Map(), node), node * HIERARCHY_STRIDE);
  return Object.freeze({ size: hierarchy.size, leafCount: hierarchy.leafCount, depth: 0, base: data, parent: null, overrides: new Map<number, Float64Array>() });
}

function createHeatmapIndex(values: PackedValueStore, size: number, hierarchy: PackedAggregateHierarchy): HeatmapProfileIndex {
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
  return Object.freeze({ kind: 'heatmap', representation: dense ? 'dense' : 'sparse', rowValues, rowOffsets, datumIndices, hierarchy });
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
  if (index.kind === 'heatmap') return hierarchyEntries + index.rowOffsets.length + index.datumIndices.length;
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

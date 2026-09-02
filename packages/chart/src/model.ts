import type { StableID } from '@sectile/core';
import { validateStableID } from '@sectile/core/identity';
import { unwrap } from '@sectile/core/result';
import { applySequencePatch, createSequence, type Sequence } from '@sectile/core/sequence';
import {
  createPackedChartLayerOwner,
  materializePackedLayer,
  patchPackedChartLayerOwner,
  readPackedLayerValue,
  type ChartLayerWork,
  type PackedChartLayerOwner,
  type PackedLayerInput,
} from './internal/layer-owner.js';
import {
  bindChartModelData,
  chartCartesianBounds,
  createPackedChartLayerView,
  getChartModelData,
  type ChartModelData,
  type PackedChartLayer,
} from './internal/model-store.js';
import { tryNormalizeChartLimits } from './internal/limits.js';
import { chartFail, chartOK } from './internal/result.js';
import type { ChartResult } from './result.js';

export type ChartProfile =
  | 'point'
  | 'ordered-series'
  | 'cartesian-segment'
  | 'grid-cell'
  | 'radial-segment';

export interface PointChartDatum<ID extends StableID = StableID> {
  readonly id: ID;
  readonly x: number;
  readonly y: number;
}

export interface OrderedSeriesDatum<ID extends StableID = StableID> extends PointChartDatum<ID> {}

export interface CartesianSegmentDatum<ID extends StableID = StableID> {
  readonly id: ID;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface GridCellDatum<ID extends StableID = StableID> {
  readonly id: ID;
  readonly column: number;
  readonly row: number;
  readonly value: number;
}

export interface RadialSegmentDatum<ID extends StableID = StableID> {
  readonly id: ID;
  readonly value: number;
  readonly innerRadius?: number;
  readonly outerRadius?: number;
}

export type ChartDatum<ID extends StableID = StableID> =
  | PointChartDatum<ID>
  | CartesianSegmentDatum<ID>
  | GridCellDatum<ID>
  | RadialSegmentDatum<ID>;

export type ChartLayer<ID extends StableID = StableID> =
  | { readonly id: ID; readonly profile: 'point'; readonly data: readonly PointChartDatum<ID>[] }
  | { readonly id: ID; readonly profile: 'ordered-series'; readonly data: readonly OrderedSeriesDatum<ID>[] }
  | { readonly id: ID; readonly profile: 'cartesian-segment'; readonly data: readonly CartesianSegmentDatum<ID>[] }
  | { readonly id: ID; readonly profile: 'grid-cell'; readonly data: readonly GridCellDatum<ID>[] }
  | { readonly id: ID; readonly profile: 'radial-segment'; readonly data: readonly RadialSegmentDatum<ID>[] };

export interface ChartModel<ID extends StableID = StableID> {
  readonly layers: readonly ChartLayer<ID>[];
}

export interface ChartLimits {
  readonly maxAxes?: number;
  readonly maxLayers?: number;
  readonly maxDatums?: number;
  readonly maxPatchOperations?: number;
  readonly maxIDCodeUnits?: number;
}

export const DEFAULT_CHART_LIMITS: Readonly<Required<ChartLimits>> = Object.freeze({
  maxAxes: 16,
  maxLayers: 64,
  maxDatums: 1_000_000,
  maxPatchOperations: 100_000,
  maxIDCodeUnits: 1_024,
});

export type ChartPatchOperation<ID extends StableID = StableID> =
  | { readonly type: 'insert'; readonly layerID: ID; readonly index: number; readonly data: readonly ChartDatum<ID>[] }
  | { readonly type: 'remove'; readonly layerID: ID; readonly index: number; readonly count: number }
  | { readonly type: 'replace'; readonly layerID: ID; readonly index: number; readonly data: readonly ChartDatum<ID>[] };

export interface ChartPatch<ID extends StableID = StableID> {
  readonly expectedGeneration?: number;
  readonly operations: readonly ChartPatchOperation<ID>[];
}

export interface ChartGeneration {
  readonly value: number;
}

export interface ChartLayerSummary<ID extends StableID = StableID> {
  readonly id: ID;
  readonly profile: ChartProfile;
  readonly size: number;
  readonly revisions: Readonly<{
    readonly identity: number;
    readonly order: number;
    readonly value: number;
    readonly geometry: number;
    readonly aggregate: number;
    readonly style: number;
  }>;
}

export interface ChartModelDiagnostics {
  readonly normalizedLayers: number;
  readonly normalizedDatums: number;
  readonly reusedLayers: number;
  readonly rebuiltLayers: number;
  readonly repairedLayers: number;
  readonly copiedValueBlocks: number;
  readonly repairedIndexEntries: number;
  readonly rebuiltIndexEntries: number;
}

export interface ChartModelState<ID extends StableID = StableID> {
  readonly generation: number;
  readonly size: number;
  readonly layerCount: number;
  readonly identities: readonly ID[];
  readonly limits: Readonly<Required<ChartLimits>>;
  readonly diagnostics: ChartModelDiagnostics;
  identityAt(index: number): ID | null;
  indexOf(id: ID): number;
  layerAt(index: number): ChartLayerSummary<ID> | null;
  toModel(): ChartModel<ID>;
}

class ImmutableChartModel<ID extends StableID> implements ChartModelState<ID> {
  public readonly generation: number;
  public readonly size: number;
  public readonly layerCount: number;
  public readonly limits: Readonly<Required<ChartLimits>>;
  public readonly diagnostics: ChartModelDiagnostics;

  public constructor(generation: number, data: ChartModelData<ID>, diagnostics: ChartModelDiagnostics) {
    this.generation = generation;
    this.size = data.identities.size;
    this.layerCount = data.layers.length;
    this.limits = data.limits;
    this.diagnostics = Object.freeze(diagnostics);
    bindChartModelData(this, data);
    Object.freeze(this);
  }

  public get identities(): readonly ID[] {
    return getChartModelData<ID>(this).identities.ids;
  }

  public identityAt(index: number): ID | null {
    return getChartModelData<ID>(this).identities.at(index);
  }

  public indexOf(id: ID): number {
    return getChartModelData<ID>(this).identities.indexOf(id) ?? -1;
  }

  public layerAt(index: number): ChartLayerSummary<ID> | null {
    if (!Number.isSafeInteger(index) || index < 0) return null;
    const layer = getChartModelData<ID>(this).layers[index];
    return layer === undefined ? null : Object.freeze({
      id: layer.id,
      profile: layer.profile,
      size: layer.identityIndices.length,
      revisions: layer.owner.revisions,
    });
  }

  public toModel(): ChartModel<ID> {
    return materializeModel(this, getChartModelData<ID>(this));
  }
}

export function createChartModel<ID extends StableID>(
  input: ChartModel<ID>,
  limits: ChartLimits = {},
): ChartModelState<ID> {
  return unwrap(tryCreateChartModel(input, limits));
}

export function tryCreateChartModel<ID extends StableID>(
  input: ChartModel<ID>,
  limits: ChartLimits = {},
): ChartResult<ChartModelState<ID>> {
  return normalizeChartModel(input, limits, 0);
}

export function replaceChartModel<ID extends StableID>(
  state: ChartModelState<ID>,
  input: ChartModel<ID>,
  expectedGeneration?: number,
): ChartModelState<ID> {
  return unwrap(tryReplaceChartModel(state, input, expectedGeneration));
}

export function tryReplaceChartModel<ID extends StableID>(
  state: ChartModelState<ID>,
  input: ChartModel<ID>,
  expectedGeneration?: number,
): ChartResult<ChartModelState<ID>> {
  const stale = staleGeneration<ChartModelState<ID>>(state.generation, expectedGeneration);
  if (stale !== null) return stale;
  if (state.generation === Number.MAX_SAFE_INTEGER) {
    return chartFail('resource-rejection', 'chart-generation-exhausted', 'Chart generation is exhausted.');
  }
  const next = normalizeChartModel(input, state.limits, state.generation + 1, state);
  if (!next.ok) return next;
  return sameModel(state, next.value) ? chartOK(state) : next;
}

export function replaceChartLayer<ID extends StableID>(
  state: ChartModelState<ID>,
  layer: ChartLayer<ID>,
  expectedGeneration?: number,
): ChartModelState<ID> {
  return unwrap(tryReplaceChartLayer(state, layer, expectedGeneration));
}

export function tryReplaceChartLayer<ID extends StableID>(
  state: ChartModelState<ID>,
  layer: ChartLayer<ID>,
  expectedGeneration?: number,
): ChartResult<ChartModelState<ID>> {
  const stale = staleGeneration<ChartModelState<ID>>(state.generation, expectedGeneration);
  if (stale !== null) return stale;
  if (state.generation === Number.MAX_SAFE_INTEGER) {
    return chartFail('resource-rejection', 'chart-generation-exhausted', 'Chart generation is exhausted.');
  }
  if (layer === null || typeof layer !== 'object' || !Array.isArray(layer.data)) {
    return chartFail('construction', 'chart-model-invalid', 'Chart layer data must be an array.');
  }
  const layerID = layer.id;
  const profile = layer.profile;
  const layerData = layer.data;
  const layerSize = layerData.length;
  const data = getChartModelData<ID>(state);
  const layerPosition = data.layerIndex.get(layerID);
  if (layerPosition === undefined) {
    return chartFail('transition-rejection', 'chart-layer-missing', 'Chart layer does not exist.', { layerID });
  }
  const previous = data.layers[layerPosition] as PackedChartLayer<ID>;
  const retainedSize = data.identities.size - previous.owner.size;
  if (layerSize > state.limits.maxDatums - retainedSize) {
    return chartFail('resource-rejection', 'chart-datum-ceiling-exceeded', 'Chart datum count exceeds its ceiling.', {
      actual: retainedSize + layerSize,
      ceiling: state.limits.maxDatums,
    });
  }
  const packed = packLayerInput(
    { id: layerID, profile, data: layerData } as ChartLayer<ID>,
    layerPosition,
    state.limits,
    layerSize,
  );
  if (!packed.ok) return packed;
  for (const id of packed.value.identities) {
    const existing = data.identities.indexOf(id);
    if (existing !== null && !previous.owner.identities.contains(id)) {
      return chartFail('construction', 'chart-datum-duplicate', 'Chart datum identities must be globally unique.', { id });
    }
  }
  const mutation = createPackedChartLayerOwner(
    packed.value,
    state.limits.maxDatums,
    state.limits.maxIDCodeUnits,
    previous.owner,
  );
  if (!mutation.changed) return chartOK(state);
  const identities = applySequencePatch(data.identities, {
    type: 'splice',
    index: previous.identityOffset,
    deleteCount: previous.owner.size,
    inserted: packed.value.identities,
  });
  const owners = data.layers.map((candidate, index) => index === layerPosition ? mutation.owner : candidate.owner);
  return chartOK(assembleChartModel(
    state.generation + 1,
    owners,
    identities,
    state.limits,
    diagnosticsForMutation(owners.length, mutation.work, 'rebuild'),
  ));
}

export function applyChartPatch<ID extends StableID>(
  state: ChartModelState<ID>,
  patch: ChartPatch<ID>,
): ChartModelState<ID> {
  return unwrap(tryApplyChartPatch(state, patch));
}

export function tryApplyChartPatch<ID extends StableID>(
  state: ChartModelState<ID>,
  patch: ChartPatch<ID>,
): ChartResult<ChartModelState<ID>> {
  if (patch === null || typeof patch !== 'object') {
    return chartFail('construction', 'chart-patch-invalid', 'Chart patch operations must be an array.');
  }
  const operations = patch.operations;
  if (!Array.isArray(operations)) {
    return chartFail('construction', 'chart-patch-invalid', 'Chart patch operations must be an array.');
  }
  const stale = staleGeneration<ChartModelState<ID>>(state.generation, patch.expectedGeneration);
  if (stale !== null) return stale;
  const operationCount = operations.length;
  if (operationCount > state.limits.maxPatchOperations) {
    return chartFail('resource-rejection', 'chart-patch-ceiling-exceeded', 'Chart patch operation count exceeds its ceiling.', {
      actual: operationCount,
      ceiling: state.limits.maxPatchOperations,
    });
  }
  if (operationCount === 0) return chartOK(state);
  if (state.generation === Number.MAX_SAFE_INTEGER) {
    return chartFail('resource-rejection', 'chart-generation-exhausted', 'Chart generation is exhausted.');
  }

  const data = getChartModelData<ID>(state);
  const prepared = preflightChartPatch(data, operations, operationCount, state.limits);
  if (!prepared.ok) return prepared;
  if (prepared.value.length === 0) return chartOK(state);
  const owners = data.layers.map((layer) => layer.owner);
  let identities: Sequence<ID> = data.identities;
  let changed = false;
  let scannedDatums = 0;
  let copiedValueBlocks = 0;
  let repairedIndexEntries = 0;
  let rebuiltIndexEntries = 0;
  let repairedLayers = 0;
  let rebuiltLayers = 0;
  for (const operation of prepared.value) {
    const targetIndex = operation.layerIndex;
    const owner = owners[targetIndex] as PackedChartLayerOwner<ID>;
    if (operation.type === 'replace') {
      const packed = packLayerPatch(
        owner,
        operation.data,
        targetIndex,
        operation.index,
        state.limits,
        operation.dataLength,
      );
      if (!packed.ok) return packed;
      const localDuplicate = duplicateOutsideReplacedRange(
        owner,
        operation.index,
        operation.dataLength,
        packed.value.identities,
      );
      if (localDuplicate !== null) return chartFail('construction', 'chart-datum-duplicate', 'Chart datum identities must be unique within a layer.', { id: localDuplicate });
      const duplicate = duplicateOutsideLayer(identities, owner.identities, packed.value.identities);
      if (duplicate !== null) return chartFail('construction', 'chart-datum-duplicate', 'Chart datum identities must be globally unique.', { id: duplicate });
      const mutation = patchPackedChartLayerOwner(owner, packed.value);
      if (!mutation.changed) continue;
      const identityOffset = ownerOffset(owners, targetIndex) + operation.index;
      identities = applySequencePatch(identities, {
        type: 'splice', index: identityOffset, deleteCount: operation.dataLength, inserted: packed.value.identities,
      });
      owners[targetIndex] = mutation.owner;
      changed = true;
      repairedLayers += 1;
      scannedDatums += mutation.work.scannedDatums;
      copiedValueBlocks += mutation.work.copiedValueBlocks;
      repairedIndexEntries += mutation.work.repairedIndexEntries;
      rebuiltIndexEntries += mutation.work.rebuiltIndexEntries;
      continue;
    }
    const datums = materializeCardinalityPatch(owner, operation);
    const rebuilt = packLayerInput(
      { id: owner.id, profile: owner.profile, data: datums } as ChartLayer<ID>,
      targetIndex,
      state.limits,
      datums.length,
    );
    if (!rebuilt.ok) return rebuilt;
    const duplicate = duplicateOutsideLayer(identities, owner.identities, rebuilt.value.identities);
    if (duplicate !== null) return chartFail('construction', 'chart-datum-duplicate', 'Chart datum identities must be globally unique.', { id: duplicate });
    const mutation = createPackedChartLayerOwner(
      rebuilt.value, state.limits.maxDatums, state.limits.maxIDCodeUnits, owner,
    );
    const identityOffset = ownerOffset(owners, targetIndex);
    identities = applySequencePatch(identities, {
      type: 'splice', index: identityOffset, deleteCount: owner.size, inserted: rebuilt.value.identities,
    });
    owners[targetIndex] = mutation.owner;
    changed = true;
    rebuiltLayers += 1;
    scannedDatums += mutation.work.scannedDatums;
    copiedValueBlocks += mutation.work.copiedValueBlocks;
    repairedIndexEntries += mutation.work.repairedIndexEntries;
    rebuiltIndexEntries += mutation.work.rebuiltIndexEntries;
  }
  if (!changed) return chartOK(state);
  return chartOK(assembleChartModel(
    state.generation + 1,
    owners,
    identities,
    state.limits,
    {
      normalizedLayers: rebuiltLayers,
      normalizedDatums: scannedDatums,
      reusedLayers: owners.length - rebuiltLayers - repairedLayers,
      rebuiltLayers,
      repairedLayers,
      copiedValueBlocks,
      repairedIndexEntries,
      rebuiltIndexEntries,
    },
  ));
}

interface PreparedChartPatchBase<ID extends StableID> {
  readonly layerID: ID;
  readonly layerIndex: number;
  readonly index: number;
}

interface PreparedChartReplaceOperation<ID extends StableID> extends PreparedChartPatchBase<ID> {
  readonly type: 'replace';
  readonly data: readonly ChartDatum<ID>[];
  readonly dataLength: number;
}

interface PreparedChartInsertOperation<ID extends StableID> extends PreparedChartPatchBase<ID> {
  readonly type: 'insert';
  readonly data: readonly ChartDatum<ID>[];
  readonly dataLength: number;
}

interface PreparedChartRemoveOperation<ID extends StableID> extends PreparedChartPatchBase<ID> {
  readonly type: 'remove';
  readonly count: number;
}

type PreparedChartPatchOperation<ID extends StableID> =
  | PreparedChartReplaceOperation<ID>
  | PreparedChartInsertOperation<ID>
  | PreparedChartRemoveOperation<ID>;

type PreparedChartCardinalityOperation<ID extends StableID> =
  | PreparedChartInsertOperation<ID>
  | PreparedChartRemoveOperation<ID>;

function preflightChartPatch<ID extends StableID>(
  data: ChartModelData<ID>,
  operations: readonly ChartPatchOperation<ID>[],
  operationCount: number,
  limits: Required<ChartLimits>,
): ChartResult<readonly PreparedChartPatchOperation<ID>[]> {
  const layerSizes = data.layers.map((layer) => layer.owner.size);
  const prepared: PreparedChartPatchOperation<ID>[] = [];
  let datumCount = data.identities.size;
  for (let operationIndex = 0; operationIndex < operationCount; operationIndex += 1) {
    const input = operations[operationIndex];
    if (input === null || typeof input !== 'object' || !('layerID' in input)) {
      return chartFail('construction', 'chart-patch-invalid', 'Chart patch operation is invalid.');
    }
    const record = input as unknown as Record<string, unknown>;
    const type = record['type'];
    const layerID = record['layerID'] as ID;
    const index = record['index'];
    const layerIndex = data.layerIndex.get(layerID);
    if (layerIndex === undefined) {
      return chartFail('transition-rejection', 'chart-layer-missing', 'Chart patch layer does not exist.', { layerID });
    }
    const layerSize = layerSizes[layerIndex] as number;
    if (!Number.isSafeInteger(index) || (index as number) < 0 || (index as number) > layerSize) {
      return chartFail('construction', 'chart-patch-invalid', 'Chart patch index is outside the target layer.', {
        index,
        size: layerSize,
      });
    }
    const normalizedIndex = index as number;
    if (type === 'replace') {
      const operationData = record['data'];
      if (!Array.isArray(operationData)) {
        return chartFail('construction', 'chart-patch-invalid', 'Chart patch replacement data must be an array.');
      }
      const dataLength = operationData.length;
      if (dataLength > layerSize - normalizedIndex) {
        return chartFail('construction', 'chart-patch-invalid', 'Chart patch replacement is outside the target layer.');
      }
      if (dataLength > 0) prepared.push(Object.freeze({
        type,
        layerID,
        layerIndex,
        index: normalizedIndex,
        data: operationData as readonly ChartDatum<ID>[],
        dataLength,
      }));
      continue;
    }
    if (type === 'insert') {
      const operationData = record['data'];
      if (!Array.isArray(operationData)) {
        return chartFail('construction', 'chart-patch-invalid', 'Inserted chart data must be an array.');
      }
      const dataLength = operationData.length;
      if (dataLength === 0) continue;
      if (dataLength > limits.maxDatums - datumCount) {
        return chartFail('resource-rejection', 'chart-datum-ceiling-exceeded', 'Chart datum count exceeds its ceiling.', {
          actual: datumCount + dataLength,
          ceiling: limits.maxDatums,
        });
      }
      datumCount += dataLength;
      layerSizes[layerIndex] = layerSize + dataLength;
      prepared.push(Object.freeze({
        type,
        layerID,
        layerIndex,
        index: normalizedIndex,
        data: operationData as readonly ChartDatum<ID>[],
        dataLength,
      }));
      continue;
    }
    if (type === 'remove') {
      const count = record['count'];
      if (!Number.isSafeInteger(count) || (count as number) < 0 || (count as number) > layerSize - normalizedIndex) {
        return chartFail('construction', 'chart-patch-invalid', 'Chart patch removal is outside the target layer.');
      }
      const normalizedCount = count as number;
      if (normalizedCount === 0) continue;
      datumCount -= normalizedCount;
      layerSizes[layerIndex] = layerSize - normalizedCount;
      prepared.push(Object.freeze({
        type,
        layerID,
        layerIndex,
        index: normalizedIndex,
        count: normalizedCount,
      }));
      continue;
    }
    return chartFail('construction', 'chart-patch-invalid', 'Chart patch operation type is invalid.');
  }
  return chartOK(Object.freeze(prepared));
}

function materializeCardinalityPatch<ID extends StableID>(
  owner: PackedChartLayerOwner<ID>,
  operation: PreparedChartCardinalityOperation<ID>,
): ChartDatum<ID>[] {
  const datums = materializePackedLayer(owner);
  if (operation.type === 'insert') {
    const previousSize = datums.length;
    datums.length = previousSize + operation.dataLength;
    datums.copyWithin(operation.index + operation.dataLength, operation.index, previousSize);
    for (let offset = 0; offset < operation.dataLength; offset += 1) {
      datums[operation.index + offset] = operation.data[offset] as ChartDatum<ID>;
    }
    return datums;
  }
  datums.copyWithin(operation.index, operation.index + operation.count);
  datums.length -= operation.count;
  return datums;
}

interface PreparedChartLayerInput<ID extends StableID> {
  readonly id: ID;
  readonly profile: ChartProfile;
  readonly data: readonly ChartDatum<ID>[];
  readonly dataLength: number;
}

interface PreparedChartModelInput<ID extends StableID> {
  readonly layers: readonly PreparedChartLayerInput<ID>[];
  readonly datumCount: number;
}

function preflightChartModel<ID extends StableID>(
  layers: readonly ChartLayer<ID>[],
  limits: Required<ChartLimits>,
): ChartResult<PreparedChartModelInput<ID>> {
  if (layers.length > limits.maxLayers) {
    return chartFail('resource-rejection', 'chart-layer-ceiling-exceeded', 'Chart layer count exceeds its ceiling.', {
      actual: layers.length,
      ceiling: limits.maxLayers,
    });
  }
  const prepared: PreparedChartLayerInput<ID>[] = [];
  const layerIDs = new Set<ID>();
  let datumCount = 0;
  for (let layerPosition = 0; layerPosition < layers.length; layerPosition += 1) {
    const layer = layers[layerPosition];
    if (layer === null || typeof layer !== 'object' || !Array.isArray(layer.data)) {
      return chartFail('construction', 'chart-model-invalid', 'Chart layer data must be an array.', { layer: layerPosition });
    }
    const id = layer.id;
    if (layerIDs.has(id)) {
      return chartFail('construction', 'chart-layer-duplicate', 'Chart layer identities must be unique.', { id });
    }
    const data = layer.data as readonly ChartDatum<ID>[];
    const dataLength = data.length;
    if (dataLength > limits.maxDatums - datumCount) {
      return chartFail('resource-rejection', 'chart-datum-ceiling-exceeded', 'Chart datum count exceeds its ceiling.', {
        actual: datumCount + dataLength,
        ceiling: limits.maxDatums,
      });
    }
    datumCount += dataLength;
    layerIDs.add(id);
    prepared.push(Object.freeze({ id, profile: layer.profile, data, dataLength }));
  }
  return chartOK(Object.freeze({ layers: Object.freeze(prepared), datumCount }));
}

function normalizeChartModel<ID extends StableID>(
  input: ChartModel<ID>,
  limitsInput: ChartLimits,
  generation: number,
  previousState?: ChartModelState<ID>,
): ChartResult<ChartModelState<ID>> {
  const limits = tryNormalizeChartLimits(limitsInput, DEFAULT_CHART_LIMITS);
  if (!limits.ok) return limits;
  if (input === null || typeof input !== 'object' || !Array.isArray(input.layers)) {
    return chartFail('construction', 'chart-model-invalid', 'Chart model layers must be an array.');
  }
  const prepared = preflightChartModel(input.layers, limits.value);
  if (!prepared.ok) return prepared;

  const identities: ID[] = [];
  const identitySet = new Set<ID>();
  const layerIndex = new Map<ID, number>();
  const owners: PackedChartLayerOwner<ID>[] = [];
  const previousData = previousState === undefined ? null : getChartModelData<ID>(previousState);
  let reusedLayers = 0;
  let rebuiltLayers = 0;
  let copiedValueBlocks = 0;
  let rebuiltIndexEntries = 0;
  for (let layerPosition = 0; layerPosition < prepared.value.layers.length; layerPosition += 1) {
    const layer = prepared.value.layers[layerPosition] as PreparedChartLayerInput<ID>;
    const packed = packLayerInput(
      { id: layer.id, profile: layer.profile, data: layer.data } as ChartLayer<ID>,
      layerPosition,
      limits.value,
      layer.dataLength,
    );
    if (!packed.ok) return packed;
    for (const id of packed.value.identities) {
      if (identitySet.has(id)) return chartFail('construction', 'chart-datum-duplicate', 'Chart datum identities must be globally unique.', { id });
      identitySet.add(id);
      identities.push(id);
    }
    const previousPosition = previousData?.layerIndex.get(layer.id);
    const previousOwner = previousPosition === undefined ? undefined : previousData?.layers[previousPosition]?.owner;
    const mutation = createPackedChartLayerOwner(
      packed.value,
      limits.value.maxDatums,
      limits.value.maxIDCodeUnits,
      previousOwner,
    );
    owners.push(mutation.owner);
    if (mutation.changed) {
      rebuiltLayers += 1;
      copiedValueBlocks += mutation.work.copiedValueBlocks;
      rebuiltIndexEntries += mutation.work.rebuiltIndexEntries;
    } else reusedLayers += 1;
    layerIndex.set(layer.id, layerPosition);
  }
  const sequence = createSequence(identities, { maxItems: limits.value.maxDatums, maxIDCodeUnits: limits.value.maxIDCodeUnits });
  return chartOK(assembleChartModel(generation, owners, sequence, limits.value, {
    normalizedLayers: rebuiltLayers,
    normalizedDatums: prepared.value.datumCount,
    reusedLayers,
    rebuiltLayers,
    repairedLayers: 0,
    copiedValueBlocks,
    repairedIndexEntries: 0,
    rebuiltIndexEntries,
  }));
}

function packLayerInput<ID extends StableID>(
  layer: ChartLayer<ID>,
  layerPosition: number,
  limits: Required<ChartLimits>,
  datumCount?: number,
): ChartResult<PackedLayerInput<ID>> {
  if (layer === null || typeof layer !== 'object' || !Array.isArray(layer.data)) {
    return chartFail('construction', 'chart-model-invalid', 'Chart layer data must be an array.', { layer: layerPosition });
  }
  const layerIDError = validateStableID(layer.id, limits.maxIDCodeUnits);
  if (layerIDError !== null) return { ok: false, error: layerIDError };
  if (!isChartProfile(layer.profile)) {
    return chartFail('construction', 'chart-profile-invalid', 'Chart layer profile is invalid.', { profile: layer.profile });
  }
  const data = layer.data;
  const normalizedDatumCount = datumCount ?? data.length;
  const stride = strideFor(layer.profile);
  const values = new Float64Array(normalizedDatumCount * stride);
  const identities: ID[] = [];
  const identitySet = new Set<ID>();
  let previousX = -Infinity;
  for (let datumPosition = 0; datumPosition < normalizedDatumCount; datumPosition += 1) {
    const datum = data[datumPosition];
    if (datum === null || typeof datum !== 'object' || !('id' in datum)) {
      return invalidDatum(layerPosition, datumPosition);
    }
    const id = datum.id as ID;
    const idError = validateStableID(id, limits.maxIDCodeUnits);
    if (idError !== null) return { ok: false, error: idError };
    if (identitySet.has(id)) return chartFail('construction', 'chart-datum-duplicate', 'Chart datum identities must be unique within a layer.', { id });
    identitySet.add(id);
    identities.push(id);
    const offset = datumPosition * stride;
    const packed = packDatum(layer.profile, datum as ChartDatum<ID>, values, offset);
    if (!packed) return invalidDatum(layerPosition, datumPosition);
    if (layer.profile === 'ordered-series') {
      const x = values[offset] as number;
      if (x < previousX) {
        return chartFail('construction', 'chart-datum-invalid', 'Ordered-series x values must be nondecreasing.', {
          layer: layerPosition,
          datum: datumPosition,
        });
      }
      previousX = x;
    }
  }
  return chartOK({ id: layer.id, profile: layer.profile, identities: Object.freeze(identities), values, stride });
}

function packDatum<ID extends StableID>(
  profile: ChartProfile,
  datum: ChartDatum<ID>,
  values: Float64Array,
  offset: number,
): boolean {
  const value = datum as unknown as Record<string, unknown>;
  if (profile === 'point' || profile === 'ordered-series') {
    if (!finite(value['x']) || !finite(value['y'])) return false;
    values[offset] = value['x'];
    values[offset + 1] = value['y'];
    return true;
  }
  if (profile === 'cartesian-segment') {
    if (!finite(value['x1']) || !finite(value['y1']) || !finite(value['x2']) || !finite(value['y2'])) return false;
    values[offset] = value['x1'];
    values[offset + 1] = value['y1'];
    values[offset + 2] = value['x2'];
    values[offset + 3] = value['y2'];
    return true;
  }
  if (profile === 'grid-cell') {
    if (!nonNegativeSafeInteger(value['column']) || !nonNegativeSafeInteger(value['row']) || !finite(value['value'])) return false;
    values[offset] = value['column'];
    values[offset + 1] = value['row'];
    values[offset + 2] = value['value'];
    return true;
  }
  const innerRadius = value['innerRadius'] ?? 0;
  const outerRadius = value['outerRadius'] ?? 1;
  if (!finite(value['value']) || (value['value'] as number) < 0
    || !finite(innerRadius) || !finite(outerRadius)
    || (innerRadius as number) < 0 || (outerRadius as number) < (innerRadius as number)) return false;
  values[offset] = value['value'];
  values[offset + 1] = innerRadius;
  values[offset + 2] = outerRadius;
  return true;
}

function materializeModel<ID extends StableID>(
  _state: ChartModelState<ID>,
  data: ChartModelData<ID>,
): ChartModel<ID> {
  const layers = data.layers.map((layer) => {
    const datums = materializePackedLayer(layer.owner);
    return Object.freeze({ id: layer.id, profile: layer.profile, data: Object.freeze(datums) }) as ChartLayer<ID>;
  });
  return Object.freeze({ layers: Object.freeze(layers) });
}

function packLayerPatch<ID extends StableID>(
  owner: PackedChartLayerOwner<ID>,
  datums: readonly ChartDatum<ID>[],
  layerPosition: number,
  index: number,
  limits: Required<ChartLimits>,
  datumCount: number,
): ChartResult<{ readonly index: number; readonly identities: readonly ID[]; readonly values: Float64Array }> {
  const identities: ID[] = [];
  const seen = new Set<ID>();
  const values = new Float64Array(datumCount * owner.stride);
  let previousX = owner.profile === 'ordered-series' && index > 0
    ? readPackedLayerValue(owner, index - 1, 0)
    : Number.NEGATIVE_INFINITY;
  for (let offset = 0; offset < datumCount; offset += 1) {
    const datum = datums[offset];
    if (datum === null || typeof datum !== 'object' || !('id' in datum)) return invalidDatum(layerPosition, index + offset);
    const id = datum.id as ID;
    const idError = validateStableID(id, limits.maxIDCodeUnits);
    if (idError !== null) return { ok: false, error: idError };
    if (seen.has(id)) return chartFail('construction', 'chart-datum-duplicate', 'Chart patch identities must be unique.', { id });
    seen.add(id);
    identities.push(id);
    const valueOffset = offset * owner.stride;
    if (!packDatum(owner.profile, datum as ChartDatum<ID>, values, valueOffset)) return invalidDatum(layerPosition, index + offset);
    if (owner.profile === 'ordered-series') {
      const x = values[valueOffset] as number;
      if (x < previousX) return invalidDatum(layerPosition, index + offset);
      previousX = x;
    }
  }
  if (owner.profile === 'ordered-series' && index + datumCount < owner.size
    && previousX > readPackedLayerValue(owner, index + datumCount, 0)) {
    return invalidDatum(layerPosition, index + datumCount - 1);
  }
  return chartOK({ index, identities: Object.freeze(identities), values });
}

function assembleChartModel<ID extends StableID>(
  generation: number,
  owners: readonly PackedChartLayerOwner<ID>[],
  identities: Sequence<ID>,
  limits: Required<ChartLimits>,
  diagnostics: ChartModelDiagnostics,
): ChartModelState<ID> {
  const layers: PackedChartLayer<ID>[] = [];
  const layerIndex = new Map<ID, number>();
  let identityOffset = 0;
  for (let index = 0; index < owners.length; index += 1) {
    const owner = owners[index] as PackedChartLayerOwner<ID>;
    layers.push(createPackedChartLayerView(owner, identityOffset));
    layerIndex.set(owner.id, index);
    identityOffset += owner.size;
  }
  const frozenLayers = Object.freeze(layers);
  const data: ChartModelData<ID> = {
    limits,
    identities,
    layerIndex,
    layers: frozenLayers,
    cartesianBounds: chartCartesianBounds(frozenLayers),
  };
  return new ImmutableChartModel(generation, data, diagnostics);
}

function diagnosticsForMutation(
  layerCount: number,
  work: ChartLayerWork,
  kind: 'repair' | 'rebuild',
): ChartModelDiagnostics {
  return {
    normalizedLayers: kind === 'rebuild' ? 1 : 0,
    normalizedDatums: work.scannedDatums,
    reusedLayers: layerCount - 1,
    rebuiltLayers: kind === 'rebuild' ? 1 : 0,
    repairedLayers: kind === 'repair' ? 1 : 0,
    copiedValueBlocks: work.copiedValueBlocks,
    repairedIndexEntries: work.repairedIndexEntries,
    rebuiltIndexEntries: work.rebuiltIndexEntries,
  };
}

function ownerOffset<ID extends StableID>(owners: readonly PackedChartLayerOwner<ID>[], target: number): number {
  let offset = 0;
  for (let index = 0; index < target; index += 1) offset += (owners[index] as PackedChartLayerOwner<ID>).size;
  return offset;
}

function duplicateOutsideLayer<ID extends StableID>(
  global: Sequence<ID>,
  previousLayer: Sequence<ID>,
  identities: readonly ID[],
): ID | null {
  for (const id of identities) if (global.contains(id) && !previousLayer.contains(id)) return id;
  return null;
}

function duplicateOutsideReplacedRange<ID extends StableID>(
  owner: PackedChartLayerOwner<ID>,
  index: number,
  count: number,
  identities: readonly ID[],
): ID | null {
  const end = index + count;
  for (const id of identities) {
    const previousIndex = owner.identities.indexOf(id);
    if (previousIndex !== null && (previousIndex < index || previousIndex >= end)) return id;
  }
  return null;
}

function staleGeneration<T>(actual: number, expected: number | undefined): ChartResult<T> | null {
  return expected === undefined || expected === actual
    ? null
    : chartFail('transition-rejection', 'chart-stale-generation', 'Chart generation does not match.', {
      actual,
      expected,
    });
}

function sameModel<ID extends StableID>(left: ChartModelState<ID>, right: ChartModelState<ID>): boolean {
  if (left.size !== right.size || left.layerCount !== right.layerCount) return false;
  const leftData = getChartModelData<ID>(left);
  const rightData = getChartModelData<ID>(right);
  for (let index = 0; index < leftData.layers.length; index += 1) {
    const a = leftData.layers[index] as PackedChartLayer<ID>;
    const b = rightData.layers[index] as PackedChartLayer<ID>;
    if (a.owner !== b.owner) return false;
  }
  return true;
}

function invalidDatum<T>(layer: number, datum: number): ChartResult<T> {
  return chartFail('construction', 'chart-datum-invalid', 'Chart datum is invalid for its layer profile.', { layer, datum });
}

function isChartProfile(value: unknown): value is ChartProfile {
  return value === 'point'
    || value === 'ordered-series'
    || value === 'cartesian-segment'
    || value === 'grid-cell'
    || value === 'radial-segment';
}

function strideFor(profile: ChartProfile): number {
  if (profile === 'point' || profile === 'ordered-series') return 2;
  if (profile === 'cartesian-segment') return 4;
  return 3;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

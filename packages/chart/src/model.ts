import type { StableID } from '@sectile/core';
import { validateStableID } from '@sectile/core/identity';
import { unwrap } from '@sectile/core/result';
import {
  bindChartModelData,
  getChartModelData,
  type ChartCartesianBounds,
  type ChartModelData,
  type PackedChartLayer,
} from './internal/model-store.js';
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
}

export interface ChartModelDiagnostics {
  readonly normalizedLayers: number;
  readonly normalizedDatums: number;
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
  public readonly identities: readonly ID[];
  public readonly limits: Readonly<Required<ChartLimits>>;
  public readonly diagnostics: ChartModelDiagnostics;

  public constructor(generation: number, identities: readonly ID[], data: ChartModelData<ID>) {
    this.generation = generation;
    this.size = identities.length;
    this.layerCount = data.layers.length;
    this.identities = Object.freeze([...identities]);
    this.limits = data.limits;
    this.diagnostics = Object.freeze({
      normalizedLayers: data.layers.length,
      normalizedDatums: identities.length,
    });
    bindChartModelData(this, data);
    Object.freeze(this);
  }

  public identityAt(index: number): ID | null {
    return Number.isSafeInteger(index) && index >= 0 ? this.identities[index] ?? null : null;
  }

  public indexOf(id: ID): number {
    return getChartModelData<ID>(this).identityIndex.get(id) ?? -1;
  }

  public layerAt(index: number): ChartLayerSummary<ID> | null {
    if (!Number.isSafeInteger(index) || index < 0) return null;
    const layer = getChartModelData<ID>(this).layers[index];
    return layer === undefined ? null : Object.freeze({
      id: layer.id,
      profile: layer.profile,
      size: layer.identityIndices.length,
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
  const next = normalizeChartModel(input, state.limits, state.generation + 1);
  if (!next.ok) return next;
  return sameModel(state, next.value) ? chartOK(state) : next;
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
  if (patch === null || typeof patch !== 'object' || !Array.isArray(patch.operations)) {
    return chartFail('construction', 'chart-patch-invalid', 'Chart patch operations must be an array.');
  }
  const stale = staleGeneration<ChartModelState<ID>>(state.generation, patch.expectedGeneration);
  if (stale !== null) return stale;
  if (patch.operations.length > state.limits.maxPatchOperations) {
    return chartFail('resource-rejection', 'chart-patch-ceiling-exceeded', 'Chart patch operation count exceeds its ceiling.', {
      actual: patch.operations.length,
      ceiling: state.limits.maxPatchOperations,
    });
  }
  if (patch.operations.length === 0) return chartOK(state);
  if (state.generation === Number.MAX_SAFE_INTEGER) {
    return chartFail('resource-rejection', 'chart-generation-exhausted', 'Chart generation is exhausted.');
  }

  const model = state.toModel();
  const layers = model.layers.map((layer) => ({ ...layer, data: [...layer.data] })) as MutableChartLayer<ID>[];
  const layerIndex = new Map(layers.map((layer, index) => [layer.id, index]));
  let changed = false;
  for (const operation of patch.operations) {
    if (operation === null || typeof operation !== 'object' || !('layerID' in operation)) {
      return chartFail('construction', 'chart-patch-invalid', 'Chart patch operation is invalid.');
    }
    const targetIndex = layerIndex.get(operation.layerID);
    if (targetIndex === undefined) {
      return chartFail('transition-rejection', 'chart-layer-missing', 'Chart patch layer does not exist.', {
        layerID: operation.layerID,
      });
    }
    const layer = layers[targetIndex] as MutableChartLayer<ID>;
    if (!Number.isSafeInteger(operation.index) || operation.index < 0 || operation.index > layer.data.length) {
      return chartFail('construction', 'chart-patch-invalid', 'Chart patch index is outside the target layer.', {
        index: operation.index,
        size: layer.data.length,
      });
    }
    if (operation.type === 'insert') {
      if (!Array.isArray(operation.data)) return chartFail('construction', 'chart-patch-invalid', 'Inserted chart data must be an array.');
      if (operation.data.length > 0) {
        layer.data.splice(operation.index, 0, ...operation.data);
        changed = true;
      }
    } else if (operation.type === 'remove') {
      if (!Number.isSafeInteger(operation.count) || operation.count < 0 || operation.index + operation.count > layer.data.length) {
        return chartFail('construction', 'chart-patch-invalid', 'Chart patch removal is outside the target layer.');
      }
      if (operation.count > 0) {
        layer.data.splice(operation.index, operation.count);
        changed = true;
      }
    } else if (operation.type === 'replace') {
      if (!Array.isArray(operation.data) || operation.index + operation.data.length > layer.data.length) {
        return chartFail('construction', 'chart-patch-invalid', 'Chart patch replacement is outside the target layer.');
      }
      if (!sameDatumSlice(layer.data, operation.index, operation.data)) {
        layer.data.splice(operation.index, operation.data.length, ...operation.data);
        changed = operation.data.length > 0 || changed;
      }
    } else {
      return chartFail('construction', 'chart-patch-invalid', 'Chart patch operation type is invalid.');
    }
  }
  if (!changed) return chartOK(state);
  return normalizeChartModel(
    { layers: layers as unknown as readonly ChartLayer<ID>[] },
    state.limits,
    state.generation + 1,
  );
}

type MutableChartLayer<ID extends StableID> = {
  id: ID;
  profile: ChartProfile;
  data: ChartDatum<ID>[];
};

function normalizeChartModel<ID extends StableID>(
  input: ChartModel<ID>,
  limitsInput: ChartLimits,
  generation: number,
): ChartResult<ChartModelState<ID>> {
  const limits = normalizeLimits(limitsInput);
  if (!limits.ok) return limits;
  if (input === null || typeof input !== 'object' || !Array.isArray(input.layers)) {
    return chartFail('construction', 'chart-model-invalid', 'Chart model layers must be an array.');
  }
  if (input.layers.length > limits.value.maxLayers) {
    return chartFail('resource-rejection', 'chart-layer-ceiling-exceeded', 'Chart layer count exceeds its ceiling.', {
      actual: input.layers.length,
      ceiling: limits.value.maxLayers,
    });
  }

  const identities: ID[] = [];
  const identityIndex = new Map<ID, number>();
  const layerIndex = new Map<ID, number>();
  const locations: number[] = [];
  const packedLayers: PackedChartLayer<ID>[] = [];
  const cartesianBounds: MutableCartesianBounds = {
    hasValues: false,
    minimumX: Number.POSITIVE_INFINITY,
    maximumX: Number.NEGATIVE_INFINITY,
    minimumY: Number.POSITIVE_INFINITY,
    maximumY: Number.NEGATIVE_INFINITY,
  };
  let datumCount = 0;
  for (let layerPosition = 0; layerPosition < input.layers.length; layerPosition += 1) {
    const layer = input.layers[layerPosition];
    if (layer === null || typeof layer !== 'object' || !Array.isArray(layer.data)) {
      return chartFail('construction', 'chart-model-invalid', 'Chart layer data must be an array.', { layer: layerPosition });
    }
    const layerIDError = validateStableID(layer.id, limits.value.maxIDCodeUnits);
    if (layerIDError !== null) return { ok: false, error: layerIDError };
    if (layerIndex.has(layer.id)) {
      return chartFail('construction', 'chart-layer-duplicate', 'Chart layer identities must be unique.', { id: layer.id });
    }
    if (!isChartProfile(layer.profile)) {
      return chartFail('construction', 'chart-profile-invalid', 'Chart layer profile is invalid.', { profile: layer.profile });
    }
    datumCount += layer.data.length;
    if (datumCount > limits.value.maxDatums) {
      return chartFail('resource-rejection', 'chart-datum-ceiling-exceeded', 'Chart datum count exceeds its ceiling.', {
        actual: datumCount,
        ceiling: limits.value.maxDatums,
      });
    }
    const normalized = normalizeLayer(
      layer as ChartLayer<ID>, layerPosition, identities, identityIndex, locations, limits.value, cartesianBounds,
    );
    if (!normalized.ok) return normalized;
    layerIndex.set(layer.id, layerPosition);
    packedLayers.push(normalized.value);
  }

  const data: ChartModelData<ID> = {
    limits: limits.value,
    identityIndex,
    layerIndex,
    locations: Uint32Array.from(locations),
    layers: Object.freeze(packedLayers),
    cartesianBounds: freezeCartesianBounds(cartesianBounds),
  };
  return chartOK(new ImmutableChartModel(generation, identities, data));
}

function normalizeLayer<ID extends StableID>(
  layer: ChartLayer<ID>,
  layerPosition: number,
  identities: ID[],
  identityIndex: Map<ID, number>,
  locations: number[],
  limits: Required<ChartLimits>,
  bounds: MutableCartesianBounds,
): ChartResult<PackedChartLayer<ID>> {
  const stride = strideFor(layer.profile);
  const values = new Float64Array(layer.data.length * stride);
  const identityIndices = new Uint32Array(layer.data.length);
  let previousX = -Infinity;
  for (let datumPosition = 0; datumPosition < layer.data.length; datumPosition += 1) {
    const datum = layer.data[datumPosition];
    if (datum === null || typeof datum !== 'object' || !('id' in datum)) {
      return invalidDatum(layerPosition, datumPosition);
    }
    const id = datum.id as ID;
    const idError = validateStableID(id, limits.maxIDCodeUnits);
    if (idError !== null) return { ok: false, error: idError };
    if (identityIndex.has(id)) {
      return chartFail('construction', 'chart-datum-duplicate', 'Chart datum identities must be globally unique.', { id });
    }
    const denseIndex = identities.length;
    identities.push(id);
    identityIndex.set(id, denseIndex);
    identityIndices[datumPosition] = denseIndex;
    locations.push(layerPosition, datumPosition);
    const offset = datumPosition * stride;
    const packed = packDatum(layer.profile, datum as ChartDatum<ID>, values, offset);
    if (!packed) return invalidDatum(layerPosition, datumPosition);
    includeDatumBounds(bounds, layer.profile, values, offset);
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
  return chartOK({ id: layer.id, profile: layer.profile, identityIndices, values, stride });
}

interface MutableCartesianBounds {
  hasValues: boolean;
  minimumX: number;
  maximumX: number;
  minimumY: number;
  maximumY: number;
}

function includeDatumBounds(
  bounds: MutableCartesianBounds,
  profile: ChartProfile,
  values: Float64Array,
  offset: number,
): void {
  if (profile === 'radial-segment') return;
  bounds.hasValues = true;
  if (profile === 'point' || profile === 'ordered-series') {
    includeXY(bounds, values[offset] as number, values[offset + 1] as number);
  } else if (profile === 'cartesian-segment') {
    includeXY(bounds, values[offset] as number, values[offset + 1] as number);
    includeXY(bounds, values[offset + 2] as number, values[offset + 3] as number);
  } else {
    const column = values[offset] as number;
    const row = values[offset + 1] as number;
    includeXY(bounds, column, row);
    includeXY(bounds, column + 1, row + 1);
  }
}

function includeXY(bounds: MutableCartesianBounds, x: number, y: number): void {
  if (x < bounds.minimumX) bounds.minimumX = x;
  if (x > bounds.maximumX) bounds.maximumX = x;
  if (y < bounds.minimumY) bounds.minimumY = y;
  if (y > bounds.maximumY) bounds.maximumY = y;
}

function freezeCartesianBounds(bounds: MutableCartesianBounds): ChartCartesianBounds {
  return Object.freeze({ ...bounds });
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
  state: ChartModelState<ID>,
  data: ChartModelData<ID>,
): ChartModel<ID> {
  const layers = data.layers.map((layer) => {
    const datums: ChartDatum<ID>[] = [];
    for (let index = 0; index < layer.identityIndices.length; index += 1) {
      const id = state.identities[layer.identityIndices[index] as number] as ID;
      const offset = index * layer.stride;
      datums.push(materializeDatum(layer.profile, id, layer.values, offset));
    }
    return Object.freeze({ id: layer.id, profile: layer.profile, data: Object.freeze(datums) }) as ChartLayer<ID>;
  });
  return Object.freeze({ layers: Object.freeze(layers) });
}

function materializeDatum<ID extends StableID>(
  profile: ChartProfile,
  id: ID,
  values: Float64Array,
  offset: number,
): ChartDatum<ID> {
  if (profile === 'point' || profile === 'ordered-series') {
    return Object.freeze({ id, x: values[offset] as number, y: values[offset + 1] as number });
  }
  if (profile === 'cartesian-segment') {
    return Object.freeze({
      id,
      x1: values[offset] as number,
      y1: values[offset + 1] as number,
      x2: values[offset + 2] as number,
      y2: values[offset + 3] as number,
    });
  }
  if (profile === 'grid-cell') {
    return Object.freeze({
      id,
      column: values[offset] as number,
      row: values[offset + 1] as number,
      value: values[offset + 2] as number,
    });
  }
  return Object.freeze({
    id,
    value: values[offset] as number,
    innerRadius: values[offset + 1] as number,
    outerRadius: values[offset + 2] as number,
  });
}

function normalizeLimits(input: ChartLimits): ChartResult<Required<ChartLimits>> {
  if (input === null || typeof input !== 'object') {
    return chartFail('construction', 'chart-model-invalid', 'Chart limits must be an object.');
  }
  const value = {
    maxAxes: input.maxAxes ?? DEFAULT_CHART_LIMITS.maxAxes,
    maxLayers: input.maxLayers ?? DEFAULT_CHART_LIMITS.maxLayers,
    maxDatums: input.maxDatums ?? DEFAULT_CHART_LIMITS.maxDatums,
    maxPatchOperations: input.maxPatchOperations ?? DEFAULT_CHART_LIMITS.maxPatchOperations,
    maxIDCodeUnits: input.maxIDCodeUnits ?? DEFAULT_CHART_LIMITS.maxIDCodeUnits,
  };
  for (const [name, limit] of Object.entries(value)) {
    if (!Number.isSafeInteger(limit) || limit < (name === 'maxIDCodeUnits' ? 1 : 0)) {
      return chartFail('construction', 'chart-model-invalid', 'Chart limits must be non-negative safe integers.', {
        name,
        value: limit,
      });
    }
  }
  return chartOK(Object.freeze(value));
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
  for (let index = 0; index < left.identities.length; index += 1) {
    if (left.identities[index] !== right.identities[index]) return false;
  }
  for (let index = 0; index < leftData.layers.length; index += 1) {
    const a = leftData.layers[index] as PackedChartLayer<ID>;
    const b = rightData.layers[index] as PackedChartLayer<ID>;
    if (a.id !== b.id || a.profile !== b.profile || a.values.length !== b.values.length) return false;
    for (let valueIndex = 0; valueIndex < a.values.length; valueIndex += 1) {
      if (!Object.is(a.values[valueIndex], b.values[valueIndex])) return false;
    }
  }
  return true;
}

function sameDatumSlice<ID extends StableID>(
  current: readonly ChartDatum<ID>[],
  index: number,
  replacement: readonly ChartDatum<ID>[],
): boolean {
  if (replacement.length === 0) return true;
  for (let offset = 0; offset < replacement.length; offset += 1) {
    const left = current[index + offset] as unknown as Record<string, unknown> | undefined;
    const right = replacement[offset] as unknown as Record<string, unknown>;
    if (left === undefined || left['id'] !== right['id']) return false;
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) if (!Object.is(left[key], right[key])) return false;
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

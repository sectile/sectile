import type { StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import type { ChartRepresentative, ChartViewState } from './contract.js';
import type { ChartDefinitionState, ResolvedChartLayer } from './definition.js';
import {
  readPackedLayerValue,
  selectPackedAggregateFrontier,
  selectPackedOrderedEnvelope,
  selectPackedVisibleIndices,
  type PackedSelectionBounds,
} from './internal/layer-owner.js';
import { getChartModelData, type ChartModelData, type PackedChartLayer } from './internal/model-store.js';
import { chartFail, chartOK } from './internal/result.js';
import { tryCreateChartPlotLayout, type ChartAxisLayout, type ChartPlotInsets, type ChartPlotLayout } from './layout.js';
import type { ChartModelState, ChartProfile } from './model.js';
import type { ChartResult } from './result.js';
import {
  createLinearScale,
  createContinuousColorScale,
  createOrdinalColorScale,
  IDENTITY_CHART_VIEW_TRANSFORM,
  tryCreateChartViewTransform,
  type ChartScale,
  type ChartViewTransform,
} from './scale.js';

export interface ChartViewport {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio?: number;
}

export interface ChartPointBatch {
  readonly type: 'point';
  readonly layerIndex: number;
  readonly positions: Float32Array;
  readonly identityIndices: Uint32Array;
  readonly colors?: Uint8Array;
  readonly representatives?: readonly ChartRepresentative[];
  readonly revision?: ChartBatchRevision;
}

export interface ChartPolylineBatch {
  readonly type: 'polyline';
  readonly layerIndex: number;
  readonly positions: Float32Array;
  readonly offsets: Uint32Array;
  readonly identityIndices: Uint32Array;
  readonly colors?: Uint8Array;
  readonly representatives?: readonly ChartRepresentative[];
  readonly revision?: ChartBatchRevision;
}

export interface ChartRectangleBatch {
  readonly type: 'rectangle';
  readonly layerIndex: number;
  readonly rectangles: Float32Array;
  readonly identityIndices: Uint32Array;
  readonly colors?: Uint8Array;
  readonly representatives?: readonly ChartRepresentative[];
  readonly revision?: ChartBatchRevision;
}

export interface ChartCellBatch {
  readonly type: 'cell';
  readonly layerIndex: number;
  readonly cells: Float32Array;
  readonly identityIndices: Uint32Array;
  readonly colors?: Uint8Array;
  readonly representatives?: readonly ChartRepresentative[];
  readonly reduction?: 'density' | 'sum' | 'mean' | 'minimum' | 'maximum';
  readonly revision?: ChartBatchRevision;
}

export interface ChartArcBatch {
  readonly type: 'arc';
  readonly layerIndex: number;
  readonly arcs: Float32Array;
  readonly identityIndices: Uint32Array;
  readonly colors?: Uint8Array;
  readonly representatives?: readonly ChartRepresentative[];
  readonly revision?: ChartBatchRevision;
}

export type ChartProjectionBatch =
  | ChartPointBatch
  | ChartPolylineBatch
  | ChartRectangleBatch
  | ChartCellBatch
  | ChartArcBatch;

export interface ChartDataPointGeometry {
  readonly type: 'point' | 'polyline';
  readonly positions: Float64Array;
  readonly offsets?: Uint32Array;
}

export interface ChartDataRectangleGeometry {
  readonly type: 'rectangle';
  readonly segments: Float64Array;
}

export interface ChartDataCellGeometry {
  readonly type: 'cell';
  readonly bounds: Float64Array;
}

export interface ChartDataArcGeometry {
  readonly type: 'arc';
  readonly arcs: Float64Array;
}

export type ChartDataGeometry = ChartDataPointGeometry | ChartDataRectangleGeometry | ChartDataCellGeometry | ChartDataArcGeometry;

export interface ChartDataBatch {
  readonly type: ChartProjectionBatch['type'];
  readonly layerIndex: number;
  readonly xAxisID?: StableID;
  readonly yAxisID?: StableID;
  readonly geometry: ChartDataGeometry;
  readonly values?: Float64Array;
  readonly identityIndices: Uint32Array;
  readonly representatives: readonly ChartRepresentative[];
  readonly revision: ChartBatchRevision;
  readonly colors?: Uint8Array;
}

export interface ChartProjectionDiagnostics {
  readonly sourceDatums: number;
  readonly representedDatums: number;
  readonly emittedPrimitives: number;
  readonly aggregateRepresentatives?: number;
  readonly visitedIndexNodes?: number;
  readonly fullSourceScans?: number;
  readonly reusedBatches?: number;
}

export interface ChartBatchRevision {
  readonly identity: number;
  readonly order: number;
  readonly value: number;
  readonly geometry: number;
  readonly aggregate: number;
  readonly style: number;
  readonly level: number;
}

export interface ChartProjectionLayerRevision<ID extends StableID = StableID> extends ChartBatchRevision {
  readonly layerID: ID;
}

export interface ChartProjectionDelta<ID extends StableID = StableID> {
  readonly enter: readonly ID[];
  readonly update: readonly ID[];
  readonly exit: readonly ID[];
}

/**
 * A structurally immutable projection whose typed arrays are borrowed from
 * Chart-owned caches. Consumers must not mutate, transfer, or detach those
 * buffers. Use cloneChartProjection when mutable binary storage is required.
 */
export interface ChartProjection<ID extends StableID = StableID> {
  readonly generation: number;
  readonly profile: ChartProfile | 'layered';
  readonly viewport: ChartViewport;
  readonly identities: readonly ID[];
  readonly batches: readonly ChartProjectionBatch[];
  readonly dataBatches?: readonly ChartDataBatch[];
  readonly diagnostics: ChartProjectionDiagnostics;
  readonly coordinate?: 'cartesian' | 'radial';
  readonly layout?: ChartPlotLayout<ID>;
  readonly layerRevisions?: readonly ChartProjectionLayerRevision<ID>[];
  readonly delta?: ChartProjectionDelta<ID>;
}

export interface ChartProjectionInput {
  readonly viewport: ChartViewport;
  readonly maximumRepresentatives?: number;
  readonly xScale?: ChartScale<number>;
  readonly yScale?: ChartScale<number>;
  readonly viewTransform?: ChartViewTransform;
  readonly view?: ChartViewState;
  readonly insets?: ChartPlotInsets;
  readonly previous?: ChartProjection;
}

export type ChartProjectionSource<ID extends StableID = StableID> = ChartModelState<ID> | ChartDefinitionState<ID>;

export const DEFAULT_MAXIMUM_CHART_REPRESENTATIVES = 100_000;
export const MAXIMUM_CHART_REPRESENTATIVES = 1_000_000;

/** Packed strides consumed directly by Canvas2D and WebGL2 adapters. */
export const CHART_POINT_STRIDE = 2;
export const CHART_RECTANGLE_STRIDE = 4;
export const CHART_CELL_STRIDE = 5;
export const CHART_ARC_STRIDE = 6;

/**
 * Copies every public typed-array backing buffer into consumer-owned storage.
 * Immutable metadata remains shared, while repeated source views and backing
 * buffers preserve their alias relationships within the returned projection.
 * The operation is O(B) in the distinct borrowed backing-buffer bytes.
 */
export function cloneChartProjection<ID extends StableID>(
  projection: ChartProjection<ID>,
): ChartProjection<ID> {
  const state: ChartProjectionCloneState = {
    buffers: new Map<ArrayBufferLike, ArrayBuffer>(),
    views: new Map<object, object>(),
  };
  const batches = Object.freeze(projection.batches.map((batch) => cloneProjectionBatch(batch, state)));
  const dataBatches = projection.dataBatches === undefined
    ? undefined
    : Object.freeze(projection.dataBatches.map((batch) => cloneDataBatch(batch, state)));
  return Object.freeze({
    ...projection,
    batches,
    ...(dataBatches === undefined ? {} : { dataBatches }),
  });
}

interface ChartProjectionCloneState {
  readonly buffers: Map<ArrayBufferLike, ArrayBuffer>;
  readonly views: Map<object, object>;
}

function cloneProjectionBatch(
  batch: ChartProjectionBatch,
  state: ChartProjectionCloneState,
): ChartProjectionBatch {
  if (batch.type === 'point') {
    return Object.freeze({
      ...batch,
      positions: cloneFloat32Array(batch.positions, state),
      identityIndices: cloneUint32Array(batch.identityIndices, state),
      ...(batch.colors === undefined ? {} : { colors: cloneUint8Array(batch.colors, state) }),
    });
  }
  if (batch.type === 'polyline') {
    return Object.freeze({
      ...batch,
      positions: cloneFloat32Array(batch.positions, state),
      offsets: cloneUint32Array(batch.offsets, state),
      identityIndices: cloneUint32Array(batch.identityIndices, state),
      ...(batch.colors === undefined ? {} : { colors: cloneUint8Array(batch.colors, state) }),
    });
  }
  if (batch.type === 'rectangle') {
    return Object.freeze({
      ...batch,
      rectangles: cloneFloat32Array(batch.rectangles, state),
      identityIndices: cloneUint32Array(batch.identityIndices, state),
      ...(batch.colors === undefined ? {} : { colors: cloneUint8Array(batch.colors, state) }),
    });
  }
  if (batch.type === 'cell') {
    return Object.freeze({
      ...batch,
      cells: cloneFloat32Array(batch.cells, state),
      identityIndices: cloneUint32Array(batch.identityIndices, state),
      ...(batch.colors === undefined ? {} : { colors: cloneUint8Array(batch.colors, state) }),
    });
  }
  return Object.freeze({
    ...batch,
    arcs: cloneFloat32Array(batch.arcs, state),
    identityIndices: cloneUint32Array(batch.identityIndices, state),
    ...(batch.colors === undefined ? {} : { colors: cloneUint8Array(batch.colors, state) }),
  });
}

function cloneDataBatch(
  batch: ChartDataBatch,
  state: ChartProjectionCloneState,
): ChartDataBatch {
  return Object.freeze({
    ...batch,
    geometry: cloneDataGeometry(batch.geometry, state),
    ...(batch.values === undefined ? {} : { values: cloneFloat64Array(batch.values, state) }),
    identityIndices: cloneUint32Array(batch.identityIndices, state),
    ...(batch.colors === undefined ? {} : { colors: cloneUint8Array(batch.colors, state) }),
  });
}

function cloneDataGeometry(
  geometry: ChartDataGeometry,
  state: ChartProjectionCloneState,
): ChartDataGeometry {
  if (geometry.type === 'point' || geometry.type === 'polyline') {
    return Object.freeze({
      ...geometry,
      positions: cloneFloat64Array(geometry.positions, state),
      ...(geometry.offsets === undefined ? {} : { offsets: cloneUint32Array(geometry.offsets, state) }),
    });
  }
  if (geometry.type === 'rectangle') {
    return Object.freeze({ ...geometry, segments: cloneFloat64Array(geometry.segments, state) });
  }
  if (geometry.type === 'cell') {
    return Object.freeze({ ...geometry, bounds: cloneFloat64Array(geometry.bounds, state) });
  }
  if (geometry.type === 'arc') {
    return Object.freeze({ ...geometry, arcs: cloneFloat64Array(geometry.arcs, state) });
  }
  throw new TypeError('Chart data geometry type is invalid.');
}

function cloneFloat32Array(value: Float32Array, state: ChartProjectionCloneState): Float32Array {
  const retained = state.views.get(value);
  if (retained !== undefined) return retained as Float32Array;
  const cloned = new Float32Array(cloneProjectionBuffer(value.buffer, state), value.byteOffset, value.length);
  state.views.set(value, cloned);
  return cloned;
}

function cloneFloat64Array(value: Float64Array, state: ChartProjectionCloneState): Float64Array {
  const retained = state.views.get(value);
  if (retained !== undefined) return retained as Float64Array;
  const cloned = new Float64Array(cloneProjectionBuffer(value.buffer, state), value.byteOffset, value.length);
  state.views.set(value, cloned);
  return cloned;
}

function cloneUint32Array(value: Uint32Array, state: ChartProjectionCloneState): Uint32Array {
  const retained = state.views.get(value);
  if (retained !== undefined) return retained as Uint32Array;
  const cloned = new Uint32Array(cloneProjectionBuffer(value.buffer, state), value.byteOffset, value.length);
  state.views.set(value, cloned);
  return cloned;
}

function cloneUint8Array(value: Uint8Array, state: ChartProjectionCloneState): Uint8Array {
  const retained = state.views.get(value);
  if (retained !== undefined) return retained as Uint8Array;
  const cloned = new Uint8Array(cloneProjectionBuffer(value.buffer, state), value.byteOffset, value.length);
  state.views.set(value, cloned);
  return cloned;
}

function cloneProjectionBuffer(value: ArrayBufferLike, state: ChartProjectionCloneState): ArrayBuffer {
  const retained = state.buffers.get(value);
  if (retained !== undefined) return retained;
  const cloned = new ArrayBuffer(value.byteLength);
  new Uint8Array(cloned).set(new Uint8Array(value));
  state.buffers.set(value, cloned);
  return cloned;
}

export function createChartProjection<ID extends StableID>(
  source: ChartProjectionSource<ID>,
  input: ChartProjectionInput,
): ChartProjection<ID> {
  return unwrap(tryCreateChartProjection(source, input));
}

export function tryCreateChartProjection<ID extends StableID>(
  source: ChartProjectionSource<ID>,
  input: ChartProjectionInput,
): ChartResult<ChartProjection<ID>> {
  if (isDefinitionState(source)) return tryCreateDefinitionProjection(source, input);
  const model = source;
  if (input === null || typeof input !== 'object' || !validViewport(input.viewport)) {
    return invalidProjection('Chart projection viewport must have finite positive dimensions and device pixel ratio.');
  }
  const maximum = input.maximumRepresentatives ?? Math.min(model.size, DEFAULT_MAXIMUM_CHART_REPRESENTATIVES);
  if (!Number.isSafeInteger(maximum) || maximum < 0 || maximum > MAXIMUM_CHART_REPRESENTATIVES) {
    return chartFail('resource-rejection', 'chart-projection-ceiling-exceeded', 'Chart representative maximum is invalid or exceeds its ceiling.', {
      maximum,
      ceiling: MAXIMUM_CHART_REPRESENTATIVES,
    });
  }
  const transformResult = tryCreateChartViewTransform(input.viewTransform ?? IDENTITY_CHART_VIEW_TRANSFORM);
  if (!transformResult.ok) return transformResult;
  const data = getChartModelData<ID>(model);
  const bounds = projectionBounds(data.cartesianBounds);
  const xScale = input.xScale ?? createLinearScale(bounds.x, { start: 0, end: input.viewport.width });
  const yScale = input.yScale ?? createLinearScale(bounds.y, { start: input.viewport.height, end: 0 });
  const quotas = representativeQuotas(data.layers, model.size, maximum);
  const batches: ChartProjectionBatch[] = [];
  let representedDatums = 0;
  let emittedPrimitives = 0;
  for (let layerIndex = 0; layerIndex < data.layers.length; layerIndex += 1) {
    const layer = data.layers[layerIndex] as PackedChartLayer<ID>;
    const quota = quotas[layerIndex] ?? 0;
    const selected = selectRepresentativeIndices(layer.identityIndices.length, quota);
    representedDatums += selected.length;
    emittedPrimitives += selected.length;
    const batch = projectLayer(layer, layerIndex, selected, xScale, yScale, transformResult.value, input.viewport);
    if (!batch.ok) return batch;
    if (selected.length > 0) batches.push(batch.value);
  }
  const profiles = new Set(data.layers.map((layer) => layer.profile));
  return chartOK(Object.freeze({
    generation: model.generation,
    profile: profiles.size === 1 ? (data.layers[0]?.profile ?? 'layered') : 'layered',
    viewport: Object.freeze({
      width: input.viewport.width,
      height: input.viewport.height,
      ...(input.viewport.devicePixelRatio === undefined ? {} : { devicePixelRatio: input.viewport.devicePixelRatio }),
    }),
    identities: model.identities,
    batches: Object.freeze(batches),
    diagnostics: Object.freeze({ sourceDatums: model.size, representedDatums, emittedPrimitives }),
  }));
}

function isDefinitionState<ID extends StableID>(source: ChartProjectionSource<ID>): source is ChartDefinitionState<ID> {
  return source !== null && typeof source === 'object' && 'model' in source && 'coordinate' in source && 'layers' in source;
}

function tryCreateDefinitionProjection<ID extends StableID>(
  source: ChartDefinitionState<ID>,
  input: ChartProjectionInput,
): ChartResult<ChartProjection<ID>> {
  if (input === null || typeof input !== 'object' || !validViewport(input.viewport)) {
    return invalidProjection('Chart projection viewport must have finite positive dimensions and device pixel ratio.');
  }
  const model = source.model;
  const maximum = input.maximumRepresentatives ?? Math.min(model.size, DEFAULT_MAXIMUM_CHART_REPRESENTATIVES);
  if (!Number.isSafeInteger(maximum) || maximum < 0 || maximum > MAXIMUM_CHART_REPRESENTATIVES) {
    return chartFail('resource-rejection', 'chart-projection-ceiling-exceeded', 'Chart representative maximum is invalid or exceeds its ceiling.', {
      maximum,
      ceiling: MAXIMUM_CHART_REPRESENTATIVES,
    });
  }
  if (input.viewTransform !== undefined && (input.viewTransform.xScale !== 1 || input.viewTransform.xOffset !== 0
    || input.viewTransform.yScale !== 1 || input.viewTransform.yOffset !== 0)) {
    return invalidProjection('Declarative chart projection accepts axis-domain view state instead of a renderer-pixel transform.');
  }
  if (source.coordinate.kind === 'radial' && (input.view?.axes.length ?? 0) > 0) {
    return invalidProjection('Radial chart projection does not accept Cartesian axis view state.');
  }
  const transform = IDENTITY_CHART_VIEW_TRANSFORM;
  const layoutResult = source.coordinate.kind === 'cartesian'
    ? tryCreateChartPlotLayout(source.axes, input.viewport, input.insets, input.view as ChartViewState<ID> | undefined)
    : chartOK(undefined);
  if (!layoutResult.ok) return layoutResult;
  const data = getChartModelData<ID>(model);
  const quotas = representativeQuotas(data.layers, model.size, maximum);
  for (let index = 0; index < source.layers.length; index += 1) {
    const semantics = source.layers[index] as ResolvedChartLayer<ID>;
    const layer = data.layers[index] as PackedChartLayer<ID>;
    const quota = quotas[index] as number;
    const radialEmpty = layer.index.kind === 'radial' && layer.index.total === 0;
    if ((semantics.kind === 'pie' || semantics.kind === 'donut') && !radialEmpty && quota < layer.owner.size) {
      return exactCeiling(semantics.id, layer.owner.size, quota);
    }
  }
  const axisLayouts = new Map<ID, ChartAxisLayout<ID>>();
  if (layoutResult.value !== undefined) for (const axis of layoutResult.value.axes) axisLayouts.set(axis.axis.id, axis);
  const batches: ChartProjectionBatch[] = [];
  const dataBatches: ChartDataBatch[] = [];
  const layerRevisions: ChartProjectionLayerRevision<ID>[] = [];
  let representedDatums = 0;
  let emittedPrimitives = 0;
  let aggregateRepresentatives = 0;
  let visitedIndexNodes = 0;
  for (let index = 0; index < source.layers.length; index += 1) {
    const semantics = source.layers[index] as ResolvedChartLayer<ID>;
    const layer = data.layers[index] as PackedChartLayer<ID>;
    const quota = quotas[index] as number;
    const projected = projectDefinitionLayer(
      model, layer, semantics, index, quota, axisLayouts, input.viewport, transform,
    );
    if (!projected.ok) return projected;
    if (projected.value.batch !== null) batches.push(projected.value.batch);
    if (projected.value.dataBatch !== null) dataBatches.push(projected.value.dataBatch);
    representedDatums += projected.value.representedDatums;
    emittedPrimitives += projected.value.emittedPrimitives;
    aggregateRepresentatives += projected.value.aggregateRepresentatives;
    visitedIndexNodes += projected.value.visitedIndexNodes;
    layerRevisions.push(Object.freeze({ layerID: semantics.id, ...projected.value.revision }));
  }
  const frozenBatches = Object.freeze(batches);
  const frozenRevisions = Object.freeze(layerRevisions);
  const previous = input.previous as ChartProjection<ID> | undefined;
  const previousGeometry = new Map(previous?.dataBatches?.map((batch) => [batch.layerIndex, batch.geometry]) ?? []);
  const reusedBatches = dataBatches.reduce((count, batch) => (
    previousGeometry.get(batch.layerIndex) === batch.geometry ? count + 1 : count
  ), 0);
  const projection: ChartProjection<ID> = Object.freeze({
    generation: model.generation,
    profile: source.layers.length === 1 ? (source.layers[0]?.profile ?? 'layered') : 'layered',
    viewport: Object.freeze({ ...input.viewport }),
    identities: model.identities,
    batches: frozenBatches,
    dataBatches: Object.freeze(dataBatches),
    coordinate: source.coordinate.kind,
    ...(layoutResult.value === undefined ? {} : { layout: layoutResult.value }),
    layerRevisions: frozenRevisions,
    delta: projectionDelta(frozenBatches, Object.freeze(dataBatches), frozenRevisions, previous),
    diagnostics: Object.freeze({
      sourceDatums: model.size,
      representedDatums,
      emittedPrimitives,
      aggregateRepresentatives,
      visitedIndexNodes,
      fullSourceScans: 0,
      reusedBatches,
    }),
  });
  return chartOK(projection);
}

interface DefinitionLayerProjection {
  readonly batch: ChartProjectionBatch | null;
  readonly dataBatch: ChartDataBatch | null;
  readonly representedDatums: number;
  readonly emittedPrimitives: number;
  readonly aggregateRepresentatives: number;
  readonly visitedIndexNodes: number;
  readonly revision: ChartBatchRevision;
}

function projectDefinitionLayer<ID extends StableID>(
  model: ChartModelState<ID>,
  layer: PackedChartLayer<ID>,
  semantics: ResolvedChartLayer<ID>,
  layerIndex: number,
  quota: number,
  axes: ReadonlyMap<ID, ChartAxisLayout<ID>>,
  viewport: ChartViewport,
  transform: ChartViewTransform,
): ChartResult<DefinitionLayerProjection> {
  const revision = batchRevision(layer, 0);
  if (semantics.kind === 'pie' || semantics.kind === 'donut') {
    if (layer.index.kind !== 'radial') return invalidProjection('Radial layer index is unavailable.');
    if (layer.index.total === 0) return chartOK({ batch: null, dataBatch: null, representedDatums: 0, emittedPrimitives: 0, aggregateRepresentatives: 0, visitedIndexNodes: 1, revision });
    const selected = Uint32Array.from({ length: layer.owner.size }, (_, index) => index);
    const batch = projectArcs(layer, layerIndex, selected, viewport, transform);
    if (!batch.ok) return batch;
    const decorated = decorateExactBatch(model, batch.value, revision);
    return chartOK({ batch: decorated, dataBatch: createDataBatch(layer, semantics, decorated, revision), representedDatums: selected.length, emittedPrimitives: selected.length, aggregateRepresentatives: 0, visitedIndexNodes: 1, revision });
  }
  const xAxis = semantics.xAxis === undefined ? undefined : axes.get(semantics.xAxis);
  const yAxis = semantics.yAxis === undefined ? undefined : axes.get(semantics.yAxis);
  if (xAxis === undefined || yAxis === undefined) return invalidProjection('Cartesian layer axes are unavailable in the plot layout.');
  const xScale = geometryScale(xAxis);
  const yScale = geometryScale(yAxis);
  const cartesianBounds: PackedSelectionBounds = Object.freeze({
    minimumX: xAxis.descriptor.geometryDomain.minimum,
    maximumX: xAxis.descriptor.geometryDomain.maximum,
    minimumY: yAxis.descriptor.geometryDomain.minimum,
    maximumY: yAxis.descriptor.geometryDomain.maximum,
  });
  if (semantics.kind === 'line') {
    const domain = geometryDomain(xAxis);
    const selected = selectPackedOrderedEnvelope(layer.owner, domain.minimum, domain.maximum, Math.max(1, Math.floor(xAxis.descriptor.range.end - xAxis.descriptor.range.start)), quota);
    if (selected.indices.length === 0 && layer.owner.size > 0) return exactCeiling(semantics.id, selected.visibleDatums, quota);
    const batch = projectPolyline(layer, layerIndex, selected.indices, xScale, yScale, transform);
    const lineRevision = batchRevision(layer, selected.aggregated ? selected.indices.length : 0);
    if (!batch.ok) return batch;
    const decorated = decorateExactBatch(model, batch.value, lineRevision);
    return chartOK({ batch: decorated, dataBatch: createDataBatch(layer, semantics, decorated, lineRevision), representedDatums: selected.indices.length, emittedPrimitives: selected.indices.length, aggregateRepresentatives: 0, visitedIndexNodes: selected.visitedNodes, revision: lineRevision });
  }
  if (semantics.kind === 'scatter' && semantics.projection === 'density') {
    const selected = selectPackedAggregateFrontier(layer.owner, quota, cartesianBounds);
    if (selected.overflow) return exactCeiling(semantics.id, selected.visibleDatums, quota);
    const batch = projectAggregateCells(layerIndex, selected.entries, xScale, yScale, transform, 'density');
    const aggregateRevision = batchRevision(layer, selected.entries.length);
    const decorated = Object.freeze({ ...batch, revision: aggregateRevision });
    return chartOK({ batch: decorated, dataBatch: createDataBatch(layer, semantics, decorated, aggregateRevision), representedDatums: selected.visibleDatums, emittedPrimitives: selected.entries.length, aggregateRepresentatives: selected.entries.length, visitedIndexNodes: selected.visitedNodes, revision: aggregateRevision });
  }
  if (semantics.kind === 'heatmap' && semantics.projection === 'heatmap-aggregate') {
    const heatBounds = heatmapSelectionBounds(semantics, cartesianBounds);
    const selected = selectPackedAggregateFrontier(layer.owner, quota, heatBounds);
    if (selected.overflow) return exactCeiling(semantics.id, selected.visibleDatums, quota);
    const reduction = semantics.reduction ?? 'sum';
    const entries = semantics.heatmap === undefined ? selected.entries : selected.entries.map((entry) => Object.freeze({
      ...entry,
      minimumX: semantics.heatmap?.xEdges[Math.max(0, Math.floor(entry.minimumX))] as number,
      maximumX: semantics.heatmap?.xEdges[Math.min(semantics.heatmap.xEdges.length - 1, Math.ceil(entry.maximumX))] as number,
      minimumY: semantics.heatmap?.yEdges[Math.max(0, Math.floor(entry.minimumY))] as number,
      maximumY: semantics.heatmap?.yEdges[Math.min(semantics.heatmap.yEdges.length - 1, Math.ceil(entry.maximumY))] as number,
    }));
    const batch = projectAggregateCells(layerIndex, entries, xScale, yScale, transform, reduction);
    const aggregateRevision = batchRevision(layer, selected.entries.length);
    const decorated = Object.freeze({ ...batch, revision: aggregateRevision });
    return chartOK({ batch: decorated, dataBatch: createDataBatch(layer, semantics, decorated, aggregateRevision), representedDatums: selected.visibleDatums, emittedPrimitives: selected.entries.length, aggregateRepresentatives: selected.entries.length, visitedIndexNodes: selected.visitedNodes, revision: aggregateRevision });
  }
  const selectionBounds = semantics.kind === 'heatmap' ? heatmapSelectionBounds(semantics, cartesianBounds) : cartesianBounds;
  const visible = selectPackedVisibleIndices(layer.owner, selectionBounds, quota);
  if (visible.overflow) return exactCeiling(semantics.id, visible.visibleDatums, quota);
  const selected = visible.indices;
  let batch: ChartResult<ChartProjectionBatch>;
  if (semantics.kind === 'scatter') batch = projectPoints(layer, layerIndex, selected, xScale, yScale, transform);
  else if (semantics.kind === 'bar') batch = projectRectangles(layer, layerIndex, selected, xScale, yScale, transform);
  else batch = projectDefinitionCells(layer, semantics, layerIndex, selected, xScale, yScale, transform);
  if (!batch.ok) return batch;
  const decorated = decorateExactBatch(model, batch.value, revision);
  return chartOK({ batch: decorated, dataBatch: createDataBatch(layer, semantics, decorated, revision), representedDatums: selected.length, emittedPrimitives: selected.length, aggregateRepresentatives: 0, visitedIndexNodes: visible.visitedNodes, revision });
}

function heatmapSelectionBounds<ID extends StableID>(
  semantics: ResolvedChartLayer<ID>,
  bounds: PackedSelectionBounds,
): PackedSelectionBounds {
  if (semantics.heatmap === undefined) return bounds;
  const x = edgeSlotRange(semantics.heatmap.xEdges, bounds.minimumX, bounds.maximumX);
  const y = edgeSlotRange(semantics.heatmap.yEdges, bounds.minimumY, bounds.maximumY);
  return Object.freeze({ minimumX: x.start, maximumX: x.end, minimumY: y.start, maximumY: y.end });
}

function edgeSlotRange(edges: Float64Array, minimum: number, maximum: number): { readonly start: number; readonly end: number } {
  let low = 0; let high = edges.length;
  while (low < high) { const middle = (low + high) >>> 1; if ((edges[middle] as number) <= minimum) low = middle + 1; else high = middle; }
  const start = Math.max(0, Math.min(edges.length - 1, low - 1));
  low = 0; high = edges.length;
  while (low < high) { const middle = (low + high) >>> 1; if ((edges[middle] as number) < maximum) low = middle + 1; else high = middle; }
  const end = Math.max(start, Math.min(edges.length - 1, low));
  return { start, end };
}

function projectDefinitionCells<ID extends StableID>(
  layer: PackedChartLayer<ID>,
  semantics: ResolvedChartLayer<ID>,
  layerIndex: number,
  selected: Uint32Array,
  xScale: ChartScale<number>,
  yScale: ChartScale<number>,
  transform: ChartViewTransform,
): ChartResult<ChartCellBatch> {
  if (semantics.heatmap === undefined) return projectCells(layer, layerIndex, selected, xScale, yScale, transform);
  const cells = new Float32Array(selected.length * CHART_CELL_STRIDE);
  const identities = new Uint32Array(selected.length);
  let minimumValue = Number.POSITIVE_INFINITY;
  let maximumValue = Number.NEGATIVE_INFINITY;
  for (let output = 0; output < selected.length; output += 1) {
    const source = selected[output] as number;
    const column = readPackedLayerValue(layer.owner, source, 0);
    const row = readPackedLayerValue(layer.owner, source, 1);
    const x1 = projectedAxis(semantics.heatmap.xEdges[column] as number, xScale, transform.xScale, transform.xOffset);
    const x2 = projectedAxis(semantics.heatmap.xEdges[column + 1] as number, xScale, transform.xScale, transform.xOffset);
    const y1 = projectedAxis(semantics.heatmap.yEdges[row] as number, yScale, transform.yScale, transform.yOffset);
    const y2 = projectedAxis(semantics.heatmap.yEdges[row + 1] as number, yScale, transform.yScale, transform.yOffset);
    if (x1 === null || x2 === null || y1 === null || y2 === null) return invalidProjection('Heatmap cell cannot be represented by its axes.');
    const value = readPackedLayerValue(layer.owner, source, 2);
    minimumValue = Math.min(minimumValue, value);
    maximumValue = Math.max(maximumValue, value);
    const target = output * CHART_CELL_STRIDE;
    cells[target] = Math.min(x1, x2); cells[target + 1] = Math.min(y1, y2);
    cells[target + 2] = Math.abs(x2 - x1); cells[target + 3] = Math.abs(y2 - y1); cells[target + 4] = value;
    identities[output] = layer.identityOffset + source;
  }
  const colors = heatmapColors(cells, minimumValue, maximumValue);
  return chartOK({ type: 'cell', layerIndex, cells, colors, identityIndices: identities });
}

function projectAggregateCells(
  layerIndex: number,
  entries: readonly import('./internal/layer-owner.js').PackedAggregateSelectionEntry[],
  xScale: ChartScale<number>,
  yScale: ChartScale<number>,
  transform: ChartViewTransform,
  reduction: 'density' | 'sum' | 'mean' | 'minimum' | 'maximum',
): ChartCellBatch {
  const cells = new Float32Array(entries.length * CHART_CELL_STRIDE);
  const identityIndices = new Uint32Array(entries.length);
  identityIndices.fill(0xffff_ffff);
  const representatives: ChartRepresentative[] = [];
  let minimumValue = Number.POSITIVE_INFINITY;
  let maximumValue = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] as import('./internal/layer-owner.js').PackedAggregateSelectionEntry;
    const x1 = projectedAxis(entry.minimumX, xScale, transform.xScale, transform.xOffset) as number;
    const x2 = projectedAxis(entry.maximumX, xScale, transform.xScale, transform.xOffset) as number;
    const y1 = projectedAxis(entry.minimumY, yScale, transform.yScale, transform.yOffset) as number;
    const y2 = projectedAxis(entry.maximumY, yScale, transform.yScale, transform.yOffset) as number;
    const value = reduction === 'density' ? entry.count
      : reduction === 'sum' ? entry.sum
        : reduction === 'mean' ? entry.sum / entry.count
          : reduction === 'minimum' ? entry.minimumValue : entry.maximumValue;
    minimumValue = Math.min(minimumValue, value); maximumValue = Math.max(maximumValue, value);
    const target = index * CHART_CELL_STRIDE;
    cells[target] = Math.min(x1, x2); cells[target + 1] = Math.min(y1, y2);
    cells[target + 2] = Math.max(1, Math.abs(x2 - x1)); cells[target + 3] = Math.max(1, Math.abs(y2 - y1)); cells[target + 4] = value;
    representatives.push(Object.freeze({
      kind: 'aggregate', reduction, count: entry.count,
      bounds: Object.freeze({ minimumX: entry.minimumX, maximumX: entry.maximumX, minimumY: entry.minimumY, maximumY: entry.maximumY }),
    }));
  }
  return {
    type: 'cell', layerIndex, cells, identityIndices, representatives: Object.freeze(representatives), reduction,
    colors: heatmapColors(cells, minimumValue, maximumValue),
  };
}

const dataGeometryCache = new WeakMap<object, Map<string, ChartDataGeometry>>();
const MAX_DATA_GEOMETRIES_PER_OWNER = 8;

function createDataBatch<ID extends StableID>(
  layer: PackedChartLayer<ID>,
  semantics: ResolvedChartLayer<ID>,
  batch: ChartProjectionBatch,
  revision: ChartBatchRevision,
): ChartDataBatch {
  const key = dataGeometryKey(batch, revision);
  let retained = dataGeometryCache.get(layer.owner.geometryToken);
  if (retained === undefined) { retained = new Map(); dataGeometryCache.set(layer.owner.geometryToken, retained); }
  let geometry = retained.get(key);
  if (geometry === undefined) {
    geometry = buildDataGeometry(layer, semantics, batch);
    if (retained.size >= MAX_DATA_GEOMETRIES_PER_OWNER) retained.delete(retained.keys().next().value as string);
    retained.set(key, geometry);
  }
  const representatives = batch.representatives ?? Object.freeze([]);
  const values = batch.type === 'cell'
    ? Float64Array.from({ length: batch.cells.length / CHART_CELL_STRIDE }, (_, index) => batch.cells[index * CHART_CELL_STRIDE + 4] as number)
    : undefined;
  return Object.freeze({
    type: batch.type,
    layerIndex: batch.layerIndex,
    ...(semantics.xAxis === undefined ? {} : { xAxisID: semantics.xAxis }),
    ...(semantics.yAxis === undefined ? {} : { yAxisID: semantics.yAxis }),
    geometry,
    ...(values === undefined ? {} : { values }),
    identityIndices: batch.identityIndices,
    representatives,
    revision,
    ...(batch.colors === undefined ? {} : { colors: batch.colors }),
  });
}

function buildDataGeometry<ID extends StableID>(
  layer: PackedChartLayer<ID>,
  semantics: ResolvedChartLayer<ID>,
  batch: ChartProjectionBatch,
): ChartDataGeometry {
  if (batch.type === 'point' || batch.type === 'polyline') {
    const positions = new Float64Array(batch.identityIndices.length * 2);
    for (let index = 0; index < batch.identityIndices.length; index += 1) {
      const source = (batch.identityIndices[index] as number) - layer.identityOffset;
      positions[index * 2] = readPackedLayerValue(layer.owner, source, 0);
      positions[index * 2 + 1] = readPackedLayerValue(layer.owner, source, 1);
    }
    return Object.freeze({
      type: batch.type,
      positions,
      ...(batch.type === 'polyline' ? { offsets: batch.offsets } : {}),
    });
  }
  if (batch.type === 'rectangle') {
    const segments = new Float64Array(batch.identityIndices.length * 4);
    for (let index = 0; index < batch.identityIndices.length; index += 1) {
      const source = (batch.identityIndices[index] as number) - layer.identityOffset;
      for (let component = 0; component < 4; component += 1) {
        segments[index * 4 + component] = readPackedLayerValue(layer.owner, source, component);
      }
    }
    return Object.freeze({ type: 'rectangle', segments });
  }
  if (batch.type === 'cell') {
    const bounds = new Float64Array(batch.identityIndices.length * 4);
    for (let index = 0; index < batch.identityIndices.length; index += 1) {
      const representative = batch.representatives?.[index];
      if (representative?.kind === 'aggregate') {
        bounds[index * 4] = representative.bounds.minimumX;
        bounds[index * 4 + 1] = representative.bounds.minimumY;
        bounds[index * 4 + 2] = representative.bounds.maximumX;
        bounds[index * 4 + 3] = representative.bounds.maximumY;
        continue;
      }
      const source = (batch.identityIndices[index] as number) - layer.identityOffset;
      const column = readPackedLayerValue(layer.owner, source, 0);
      const row = readPackedLayerValue(layer.owner, source, 1);
      const x1 = semantics.heatmap?.xEdges[column] ?? column;
      const x2 = semantics.heatmap?.xEdges[column + 1] ?? column + 1;
      const y1 = semantics.heatmap?.yEdges[row] ?? row;
      const y2 = semantics.heatmap?.yEdges[row + 1] ?? row + 1;
      bounds[index * 4] = Math.min(x1, x2);
      bounds[index * 4 + 1] = Math.min(y1, y2);
      bounds[index * 4 + 2] = Math.max(x1, x2);
      bounds[index * 4 + 3] = Math.max(y1, y2);
    }
    return Object.freeze({ type: 'cell', bounds });
  }
  const arcs = new Float64Array(batch.identityIndices.length * 4);
  const total = layer.index.kind === 'radial' ? layer.index.total : 0;
  let cumulative = 0;
  let output = 0;
  for (let source = 0; source < layer.owner.size && output < batch.identityIndices.length; source += 1) {
    const value = readPackedLayerValue(layer.owner, source, 0);
    const start = total === 0 ? 0 : cumulative / total * Math.PI * 2;
    cumulative += value;
    if ((batch.identityIndices[output] as number) !== layer.identityOffset + source) continue;
    arcs[output * 4] = readPackedLayerValue(layer.owner, source, 1);
    arcs[output * 4 + 1] = readPackedLayerValue(layer.owner, source, 2);
    arcs[output * 4 + 2] = start;
    arcs[output * 4 + 3] = total === 0 ? 0 : cumulative / total * Math.PI * 2;
    output += 1;
  }
  return Object.freeze({ type: 'arc', arcs });
}

function dataGeometryKey(batch: ChartProjectionBatch, revision: ChartBatchRevision): string {
  let hash = 2_166_136_261;
  for (const index of batch.identityIndices) { hash ^= index; hash = Math.imul(hash, 16_777_619); }
  for (const representative of batch.representatives ?? []) {
    if (representative.kind !== 'aggregate') continue;
    for (const value of [representative.bounds.minimumX, representative.bounds.maximumX, representative.bounds.minimumY, representative.bounds.maximumY]) {
      const text = String(value);
      for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16_777_619); }
    }
  }
  return `${batch.type}:${revision.level}:${batch.identityIndices.length}:${hash >>> 0}`;
}

function decorateExactBatch<ID extends StableID>(
  model: ChartModelState<ID>,
  batch: ChartProjectionBatch,
  revision: ChartBatchRevision,
): ChartProjectionBatch {
  const representatives = Object.freeze([...batch.identityIndices].map((index) => Object.freeze({
    kind: 'datum' as const,
    id: model.identityAt(index) as ID,
  })));
  return Object.freeze({
    ...batch,
    representatives,
    revision,
    ...(batch.colors === undefined ? { colors: ordinalBatchColors(model, batch, representatives) } : {}),
  });
}

function ordinalBatchColors<ID extends StableID>(
  model: ChartModelState<ID>,
  batch: ChartProjectionBatch,
  representatives: readonly ChartRepresentative<ID>[],
): Uint8Array {
  const scale = createOrdinalColorScale<ID>([
    [0.12, 0.31, 0.69, 1],
    [0.82, 0.25, 0.28, 1],
    [0.16, 0.58, 0.38, 1],
    [0.55, 0.32, 0.76, 1],
    [0.91, 0.55, 0.15, 1],
    [0.10, 0.62, 0.70, 1],
  ]);
  const layerID = model.layerAt(batch.layerIndex)?.id;
  const colors = new Uint8Array(representatives.length * 4);
  for (let index = 0; index < representatives.length; index += 1) {
    const representative = representatives[index] as ChartRepresentative<ID>;
    const key = batch.type === 'arc' && representative.kind === 'datum' ? representative.id : layerID as ID;
    const color = scale.color(key);
    for (let channel = 0; channel < 4; channel += 1) colors[index * 4 + channel] = Math.round((color[channel] as number) * 255);
  }
  return colors;
}

function geometryScale<ID extends StableID>(axis: ChartAxisLayout<ID>): ChartScale<number> {
  return axis.geometryScale;
}

function geometryDomain<ID extends StableID>(axis: ChartAxisLayout<ID>): { readonly minimum: number; readonly maximum: number } {
  return axis.descriptor.geometryDomain;
}

function heatmapColors(cells: Float32Array, minimumInput: number, maximumInput: number): Uint8Array {
  let minimum = minimumInput;
  let maximum = maximumInput;
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) { minimum = 0; maximum = 1; }
  else if (minimum === maximum) { minimum -= 0.5; maximum += 0.5; }
  const scale = createContinuousColorScale({ minimum, maximum }, [
    { offset: 0, color: [0.12, 0.31, 0.69, 1] },
    { offset: 0.5, color: [0.22, 0.72, 0.68, 1] },
    { offset: 1, color: [0.96, 0.76, 0.19, 1] },
  ]);
  const colors = new Uint8Array(cells.length / CHART_CELL_STRIDE * 4);
  for (let index = 0; index < cells.length / CHART_CELL_STRIDE; index += 1) {
    const color = scale.color(cells[index * CHART_CELL_STRIDE + 4] as number) as readonly number[];
    for (let channel = 0; channel < 4; channel += 1) colors[index * 4 + channel] = Math.round((color[channel] as number) * 255);
  }
  return colors;
}

function batchRevision(layer: PackedChartLayer, level: number): ChartBatchRevision {
  return Object.freeze({ ...layer.owner.revisions, level });
}

function projectionDelta<ID extends StableID>(
  batches: readonly ChartProjectionBatch[],
  dataBatches: readonly ChartDataBatch[],
  revisions: readonly ChartProjectionLayerRevision<ID>[],
  previous: ChartProjection<ID> | undefined,
): ChartProjectionDelta<ID> {
  const current = representativeLayers<ID>(batches, dataBatches, revisions);
  if (previous === undefined) return Object.freeze({ enter: Object.freeze([...current.keys()]), update: Object.freeze([]), exit: Object.freeze([]) });
  const before = representativeLayers(previous.batches, previous.dataBatches ?? [], previous.layerRevisions ?? []);
  const enter: ID[] = [];
  const update: ID[] = [];
  const exit: ID[] = [];
  for (const [id, state] of current) {
    const previousState = before.get(id);
    if (previousState === undefined) enter.push(id);
    else if (state.fingerprint !== previousState.fingerprint
      || state.revision.style !== previousState.revision.style) update.push(id);
  }
  for (const id of before.keys()) if (!current.has(id)) exit.push(id);
  return Object.freeze({ enter: Object.freeze(enter), update: Object.freeze(update), exit: Object.freeze(exit) });
}

function representativeLayers<ID extends StableID>(
  batches: readonly ChartProjectionBatch[],
  dataBatches: readonly ChartDataBatch[],
  revisions: readonly ChartProjectionLayerRevision<ID>[],
): Map<ID, { readonly revision: ChartBatchRevision; readonly fingerprint: string }> {
  const output = new Map<ID, { readonly revision: ChartBatchRevision; readonly fingerprint: string }>();
  const dataByLayer = new Map(dataBatches.map((batch) => [batch.layerIndex, batch]));
  for (const batch of batches) {
    const revision = revisions[batch.layerIndex];
    if (revision === undefined) continue;
    const dataBatch = dataByLayer.get(batch.layerIndex);
    for (let index = 0; index < (batch.representatives?.length ?? 0); index += 1) {
      const representative = batch.representatives?.[index];
      if (representative?.kind !== 'datum') continue;
      output.set(representative.id as ID, { revision, fingerprint: dataFingerprint(dataBatch, batch, index) });
    }
  }
  return output;
}

function dataFingerprint(dataBatch: ChartDataBatch | undefined, batch: ChartProjectionBatch, index: number): string {
  if (dataBatch === undefined) return `${batch.type}:${index}:${batch.identityIndices[index]}`;
  const color = batch.colors === undefined ? '' : `:${[...batch.colors.subarray(index * 4, index * 4 + 4)].join(',')}`;
  const geometry = dataBatch.geometry;
  if (geometry.type === 'point' || geometry.type === 'polyline') {
    return `${geometry.type}:${geometry.positions[index * 2]},${geometry.positions[index * 2 + 1]}${color}`;
  }
  if (geometry.type === 'rectangle') {
    const offset = index * 4;
    return `rectangle:${geometry.segments[offset]},${geometry.segments[offset + 1]},${geometry.segments[offset + 2]},${geometry.segments[offset + 3]}${color}`;
  }
  if (geometry.type === 'cell') {
    const offset = index * 4;
    return `cell:${geometry.bounds[offset]},${geometry.bounds[offset + 1]},${geometry.bounds[offset + 2]},${geometry.bounds[offset + 3]}:${dataBatch.values?.[index] ?? ''}${color}`;
  }
  const offset = index * 4;
  const arcs = (geometry as ChartDataArcGeometry).arcs;
  return `arc:${arcs[offset]},${arcs[offset + 1]},${arcs[offset + 2]},${arcs[offset + 3]}${color}`;
}

function exactCeiling<ID extends StableID, T>(layerID: ID, actual: number, ceiling: number): ChartResult<T> {
  return chartFail('resource-rejection', 'chart-projection-ceiling-exceeded', 'Exact chart projection exceeds its representative ceiling.', {
    layerID, actual, ceiling,
  });
}

interface Bounds { readonly x: { minimum: number; maximum: number }; readonly y: { minimum: number; maximum: number } }

function projectionBounds(bounds: ChartModelData['cartesianBounds']): Bounds {
  if (!bounds.hasValues) return { x: { minimum: 0, maximum: 1 }, y: { minimum: 0, maximum: 1 } };
  let minimumX = bounds.minimumX;
  let maximumX = bounds.maximumX;
  let minimumY = bounds.minimumY;
  let maximumY = bounds.maximumY;
  if (minimumX === maximumX) { minimumX -= 0.5; maximumX += 0.5; }
  if (minimumY === maximumY) { minimumY -= 0.5; maximumY += 0.5; }
  return { x: { minimum: minimumX, maximum: maximumX }, y: { minimum: minimumY, maximum: maximumY } };
}

function representativeQuotas(
  layers: readonly PackedChartLayer[],
  total: number,
  maximum: number,
): Uint32Array {
  const quotas = new Uint32Array(layers.length);
  if (total === 0 || maximum === 0) return quotas;
  if (maximum >= total) {
    for (let index = 0; index < layers.length; index += 1) quotas[index] = layers[index]?.identityIndices.length ?? 0;
    return quotas;
  }
  let assigned = 0;
  for (let index = 0; index < layers.length; index += 1) {
    const size = layers[index]?.identityIndices.length ?? 0;
    const quota = Math.min(size, Math.floor(maximum * size / total));
    quotas[index] = quota;
    assigned += quota;
  }
  for (let index = 0; assigned < maximum && index < layers.length; index += 1) {
    const size = layers[index]?.identityIndices.length ?? 0;
    if ((quotas[index] as number) < size) { quotas[index] = (quotas[index] as number) + 1; assigned += 1; }
  }
  return quotas;
}

function selectRepresentativeIndices(size: number, maximum: number): Uint32Array {
  if (maximum <= 0 || size === 0) return new Uint32Array(0);
  if (maximum >= size) return Uint32Array.from({ length: size }, (_, index) => index);
  if (maximum === 1) return Uint32Array.of(0);
  const selected = new Uint32Array(maximum);
  const denominator = maximum - 1;
  for (let index = 0; index < maximum; index += 1) {
    selected[index] = Math.floor(index * (size - 1) / denominator);
  }
  return selected;
}

function projectLayer<ID extends StableID>(
  layer: PackedChartLayer<ID>,
  layerIndex: number,
  selected: Uint32Array,
  xScale: ChartScale<number>,
  yScale: ChartScale<number>,
  transform: ChartViewTransform,
  viewport: ChartViewport,
): ChartResult<ChartProjectionBatch> {
  if (layer.profile === 'point') return projectPoints(layer, layerIndex, selected, xScale, yScale, transform);
  if (layer.profile === 'ordered-series') return projectPolyline(layer, layerIndex, selected, xScale, yScale, transform);
  if (layer.profile === 'cartesian-segment') return projectRectangles(layer, layerIndex, selected, xScale, yScale, transform);
  if (layer.profile === 'grid-cell') return projectCells(layer, layerIndex, selected, xScale, yScale, transform);
  return projectArcs(layer, layerIndex, selected, viewport, transform);
}

function projectPoints<ID extends StableID>(
  layer: PackedChartLayer<ID>, layerIndex: number, selected: Uint32Array,
  xScale: ChartScale<number>, yScale: ChartScale<number>, transform: ChartViewTransform,
): ChartResult<ChartPointBatch> {
  const positions = new Float32Array(selected.length * CHART_POINT_STRIDE);
  const identities = new Uint32Array(selected.length);
  for (let output = 0; output < selected.length; output += 1) {
    const source = selected[output] as number;
    const x = projectedAxis(readPackedLayerValue(layer.owner, source, 0), xScale, transform.xScale, transform.xOffset);
    const y = projectedAxis(readPackedLayerValue(layer.owner, source, 1), yScale, transform.yScale, transform.yOffset);
    if (x === null || y === null) return invalidProjection('Point cannot be represented by the selected scales.');
    positions[output * 2] = x; positions[output * 2 + 1] = y;
    identities[output] = layer.identityOffset + (layer.identityIndices[source] as number);
  }
  return chartOK({ type: 'point', layerIndex, positions, identityIndices: identities });
}

function projectPolyline<ID extends StableID>(
  layer: PackedChartLayer<ID>, layerIndex: number, selected: Uint32Array,
  xScale: ChartScale<number>, yScale: ChartScale<number>, transform: ChartViewTransform,
): ChartResult<ChartPolylineBatch> {
  const point = projectPoints(layer, layerIndex, selected, xScale, yScale, transform);
  return point.ok ? chartOK({
    type: 'polyline', layerIndex, positions: point.value.positions,
    offsets: Uint32Array.of(0, selected.length), identityIndices: point.value.identityIndices,
  }) : point;
}

function projectRectangles<ID extends StableID>(
  layer: PackedChartLayer<ID>, layerIndex: number, selected: Uint32Array,
  xScale: ChartScale<number>, yScale: ChartScale<number>, transform: ChartViewTransform,
): ChartResult<ChartRectangleBatch> {
  const rectangles = new Float32Array(selected.length * CHART_RECTANGLE_STRIDE);
  const identities = new Uint32Array(selected.length);
  for (let output = 0; output < selected.length; output += 1) {
    const source = selected[output] as number;
    const x1 = projectedAxis(readPackedLayerValue(layer.owner, source, 0), xScale, transform.xScale, transform.xOffset);
    const y1 = projectedAxis(readPackedLayerValue(layer.owner, source, 1), yScale, transform.yScale, transform.yOffset);
    const x2 = projectedAxis(readPackedLayerValue(layer.owner, source, 2), xScale, transform.xScale, transform.xOffset);
    const y2 = projectedAxis(readPackedLayerValue(layer.owner, source, 3), yScale, transform.yScale, transform.yOffset);
    if (x1 === null || y1 === null || x2 === null || y2 === null) return invalidProjection('Rectangle cannot be represented by the selected scales.');
    const target = output * 4;
    rectangles[target] = Math.min(x1, x2); rectangles[target + 1] = Math.min(y1, y2);
    rectangles[target + 2] = Math.abs(x2 - x1); rectangles[target + 3] = Math.abs(y2 - y1);
    identities[output] = layer.identityOffset + (layer.identityIndices[source] as number);
  }
  return chartOK({ type: 'rectangle', layerIndex, rectangles, identityIndices: identities });
}

function projectCells<ID extends StableID>(
  layer: PackedChartLayer<ID>, layerIndex: number, selected: Uint32Array,
  xScale: ChartScale<number>, yScale: ChartScale<number>, transform: ChartViewTransform,
): ChartResult<ChartCellBatch> {
  const cells = new Float32Array(selected.length * CHART_CELL_STRIDE);
  const identities = new Uint32Array(selected.length);
  for (let output = 0; output < selected.length; output += 1) {
    const source = selected[output] as number;
    const column = readPackedLayerValue(layer.owner, source, 0);
    const row = readPackedLayerValue(layer.owner, source, 1);
    const x1 = projectedAxis(column, xScale, transform.xScale, transform.xOffset);
    const y1 = projectedAxis(row, yScale, transform.yScale, transform.yOffset);
    const x2 = projectedAxis(column + 1, xScale, transform.xScale, transform.xOffset);
    const y2 = projectedAxis(row + 1, yScale, transform.yScale, transform.yOffset);
    if (x1 === null || y1 === null || x2 === null || y2 === null) return invalidProjection('Cell cannot be represented by the selected scales.');
    const target = output * 5;
    cells[target] = Math.min(x1, x2); cells[target + 1] = Math.min(y1, y2);
    cells[target + 2] = Math.abs(x2 - x1); cells[target + 3] = Math.abs(y2 - y1);
    cells[target + 4] = readPackedLayerValue(layer.owner, source, 2);
    identities[output] = layer.identityOffset + (layer.identityIndices[source] as number);
  }
  return chartOK({ type: 'cell', layerIndex, cells, identityIndices: identities });
}

function projectArcs<ID extends StableID>(
  layer: PackedChartLayer<ID>, layerIndex: number, selected: Uint32Array,
  viewport: ChartViewport, transform: ChartViewTransform,
): ChartResult<ChartArcBatch> {
  const arcs = new Float32Array(selected.length * CHART_ARC_STRIDE);
  const identities = new Uint32Array(selected.length);
  const total = layer.index.kind === 'radial' ? layer.index.total : 0;
  const radius = Math.min(viewport.width, viewport.height) / 2;
  let cumulative = 0;
  let selectedCursor = 0;
  for (let source = 0; source < layer.identityIndices.length && selectedCursor < selected.length; source += 1) {
    const value = readPackedLayerValue(layer.owner, source, 0);
    const start = total === 0 ? 0 : cumulative / total * Math.PI * 2;
    cumulative += value;
    if (source !== selected[selectedCursor]) continue;
    const target = selectedCursor * 6;
    arcs[target] = viewport.width / 2 * transform.xScale + transform.xOffset;
    arcs[target + 1] = viewport.height / 2 * transform.yScale + transform.yOffset;
    arcs[target + 2] = readPackedLayerValue(layer.owner, source, 1) * radius * Math.min(transform.xScale, transform.yScale);
    arcs[target + 3] = readPackedLayerValue(layer.owner, source, 2) * radius * Math.min(transform.xScale, transform.yScale);
    arcs[target + 4] = start;
    arcs[target + 5] = total === 0 ? 0 : cumulative / total * Math.PI * 2;
    identities[selectedCursor] = layer.identityOffset + (layer.identityIndices[source] as number);
    selectedCursor += 1;
  }
  return chartOK({ type: 'arc', layerIndex, arcs, identityIndices: identities });
}

function projectedAxis(value: number, scale: ChartScale<number>, factor: number, offset: number): number | null {
  const projected = scale.normalize(value);
  if (projected === null) return null;
  const transformed = projected * factor + offset;
  return Number.isFinite(transformed) ? transformed : null;
}

function validViewport(value: ChartViewport): boolean {
  return value !== null && typeof value === 'object'
    && finitePositive(value.width) && finitePositive(value.height)
    && (value.devicePixelRatio === undefined || finitePositive(value.devicePixelRatio));
}

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function invalidProjection<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-projection-invalid', message);
}

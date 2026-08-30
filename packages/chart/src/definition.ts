import type { StableID } from '@sectile/core';
import { DEFAULT_MAX_ID_CODE_UNITS } from '@sectile/core/identity';
import { unwrap } from '@sectile/core/result';
import {
  tryResolveChartIdentity,
  tryResolveChartValue,
  tryNormalizeChartCoordinate,
  tryValidateChartLayerCoordinate,
  type ChartAxisValue,
  type ChartCoordinateDefinition,
  type ChartHeatmapReduction,
  type ChartLayerDefinition,
  type NormalizedChartAxisDefinition,
  type NormalizedChartCoordinateDefinition,
} from './contract.js';
import { chartFail, chartOK } from './internal/result.js';
import { tryResolveChartAxes, type ChartAxisObservations, type ResolvedChartAxis } from './layout.js';
import {
  tryCreateChartModel,
  tryReplaceChartModel,
  type ChartLayer,
  type ChartLimits,
  type ChartModelState,
  type ChartProfile,
} from './model.js';
import type { ChartResult } from './result.js';

export interface ChartDefinition<Datum = unknown, ID extends StableID = StableID> {
  readonly coordinate: ChartCoordinateDefinition<Datum, ID>;
  readonly layers: readonly ChartLayerDefinition<Datum, ID>[];
}

export interface ChartHeatmapGeometry {
  readonly xEdges: Float64Array;
  readonly yEdges: Float64Array;
}

export interface ResolvedChartLayer<ID extends StableID = StableID> {
  readonly id: ID;
  readonly kind: ChartLayerDefinition['kind'];
  readonly profile: ChartProfile;
  readonly label?: string;
  readonly xAxis?: ID;
  readonly yAxis?: ID;
  readonly projection: 'exact' | 'density' | 'heatmap-aggregate';
  readonly reduction?: ChartHeatmapReduction;
  readonly heatmap?: ChartHeatmapGeometry;
}

export interface ChartDefinitionDiagnostics {
  readonly resolvedAxes: number;
  readonly resolvedLayers: number;
  readonly resolvedDatums: number;
}

export interface ChartDefinitionState<ID extends StableID = StableID> {
  readonly coordinate: NormalizedChartCoordinateDefinition<unknown, ID>;
  readonly axes: readonly ResolvedChartAxis<ID>[];
  readonly layers: readonly ResolvedChartLayer<ID>[];
  readonly model: ChartModelState<ID>;
  readonly diagnostics: ChartDefinitionDiagnostics;
}

interface PendingDatum<ID extends StableID> {
  readonly id: ID;
  readonly x?: ChartAxisValue;
  readonly y?: ChartAxisValue;
  readonly value?: number;
  readonly innerRadius?: number;
  readonly outerRadius?: number;
}

interface PendingLayer<ID extends StableID> {
  readonly definition: ChartLayerDefinition<unknown, ID>;
  readonly datums: readonly PendingDatum<ID>[];
}

export function createChartDefinition<Datum, ID extends StableID>(
  input: ChartDefinition<Datum, ID>,
  limits: ChartLimits = {},
): ChartDefinitionState<ID> {
  return unwrap(tryCreateChartDefinition(input, limits));
}

export function tryCreateChartDefinition<Datum, ID extends StableID>(
  input: ChartDefinition<Datum, ID>,
  limits: ChartLimits = {},
): ChartResult<ChartDefinitionState<ID>> {
  if (input === null || typeof input !== 'object' || !Array.isArray(input.layers)) {
    return invalidDefinition('Chart definition requires one coordinate and a layer array.');
  }
  const normalizedCoordinate = tryNormalizeChartCoordinate(input.coordinate, limits);
  if (!normalizedCoordinate.ok) return normalizedCoordinate;
  const coordinate = normalizedCoordinate.value as NormalizedChartCoordinateDefinition<unknown, ID>;
  const observations = new Map<ID, ChartAxisValue[]>();
  if (coordinate.kind === 'cartesian') for (const axis of coordinate.axes) observations.set(axis.id, []);
  const pending: PendingLayer<ID>[] = [];
  let datumCount = 0;
  for (const sourceLayer of input.layers) {
    const layer = sourceLayer as unknown as ChartLayerDefinition<unknown, ID>;
    const compatible = tryValidateChartLayerCoordinate(coordinate, layer);
    if (!compatible.ok) return compatible;
    const collected = collectLayer(coordinate, layer, observations, limits.maxIDCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS);
    if (!collected.ok) return collected;
    pending.push(Object.freeze({ definition: layer, datums: collected.value }));
    datumCount += collected.value.length;
  }
  const axesResult = coordinate.kind === 'cartesian'
    ? tryResolveChartAxes(
      coordinate,
      [...observations].map(([axisID, values]): ChartAxisObservations<ID> => ({ axisID, values })),
    )
    : chartOK(Object.freeze([]) as readonly ResolvedChartAxis<ID>[]);
  if (!axesResult.ok) return axesResult;
  const axes = coordinate.kind === 'cartesian'
    ? expandHeatmapAutoDomains(coordinate, pending, axesResult.value)
    : axesResult.value;
  const axisMap = new Map(axes.map((axis) => [axis.id, axis]));
  const modelLayers: ChartLayer<ID>[] = [];
  const layers: ResolvedChartLayer<ID>[] = [];
  for (const layer of pending) {
    const compiled = compileLayer(layer, axisMap);
    if (!compiled.ok) return compiled;
    modelLayers.push(compiled.value.model);
    layers.push(compiled.value.layer);
  }
  const modelResult = tryCreateChartModel({ layers: Object.freeze(modelLayers) }, limits);
  if (!modelResult.ok) return modelResult;
  const model = modelResult.value;
  return chartOK(Object.freeze({
    coordinate,
    axes,
    layers: Object.freeze(layers),
    model,
    diagnostics: Object.freeze({ resolvedAxes: axes.length, resolvedLayers: layers.length, resolvedDatums: datumCount }),
  }));
}

export function replaceChartDefinition<Datum, ID extends StableID>(
  previous: ChartDefinitionState<ID>,
  input: ChartDefinition<Datum, ID>,
  limits: ChartLimits = previous.model.limits,
): ChartDefinitionState<ID> {
  return unwrap(tryReplaceChartDefinition(previous, input, limits));
}

export function tryReplaceChartDefinition<Datum, ID extends StableID>(
  previous: ChartDefinitionState<ID>,
  input: ChartDefinition<Datum, ID>,
  limits: ChartLimits = previous.model.limits,
): ChartResult<ChartDefinitionState<ID>> {
  const next = tryCreateChartDefinition(input, limits);
  if (!next.ok) return next;
  const model = tryReplaceChartModel(previous.model, next.value.model.toModel());
  if (!model.ok) return model;
  if (model.value === previous.model && sameDefinitionMetadata(previous, next.value)) return chartOK(previous);
  return chartOK(Object.freeze({ ...next.value, model: model.value }));
}

function collectLayer<ID extends StableID>(
  coordinate: NormalizedChartCoordinateDefinition<unknown, ID>,
  layer: ChartLayerDefinition<unknown, ID>,
  observations: Map<ID, ChartAxisValue[]>,
  maxIDCodeUnits: number,
): ChartResult<readonly PendingDatum<ID>[]> {
  if (!Array.isArray(layer.data)) return invalidDefinition('Chart layer data must be an array.');
  const output: PendingDatum<ID>[] = [];
  if (coordinate.kind === 'radial') {
    if (layer.kind !== 'pie' && layer.kind !== 'donut') return invalidDefinition('Radial coordinates accept only pie and donut layers.');
    const innerRadius = layer.kind === 'pie' ? 0 : layer.innerRadius ?? 0.5;
    const outerRadius = layer.kind === 'pie' ? 1 : layer.outerRadius ?? 1;
    if (!finiteNonNegative(innerRadius) || !finitePositive(outerRadius) || innerRadius >= outerRadius || outerRadius > 1) {
      return invalidDefinition('Pie and donut radii must be finite, normalized, and increasing.');
    }
    for (const datum of layer.data) {
      const id = tryResolveChartIdentity(datum, layer.getId, maxIDCodeUnits);
      if (!id.ok) return id;
      const value = tryResolveChartValue(datum, {
        ...(layer.getValue === undefined ? {} : { getValue: layer.getValue }),
        ...(layer.valueField === undefined ? {} : { field: layer.valueField }),
        canonicalField: 'value', kind: 'numeric',
      });
      if (!value.ok) return value;
      if (typeof value.value !== 'number' || value.value < 0) return invalidDefinition('Pie and donut values must be finite and non-negative.');
      output.push(Object.freeze({ id: id.value, value: value.value, innerRadius, outerRadius }));
    }
    return chartOK(Object.freeze(output));
  }
  if (layer.kind === 'pie' || layer.kind === 'donut') return invalidDefinition('Cartesian coordinates do not accept radial layers.');
  const xAxis = coordinate.axes.find((axis) => axis.id === layer.xAxis);
  const yAxis = coordinate.axes.find((axis) => axis.id === layer.yAxis);
  if (xAxis === undefined || yAxis === undefined) return invalidDefinition('Chart layer axes must resolve before data access.');
  if (layer.kind === 'bar') {
    const vertical = (layer.orientation ?? 'vertical') === 'vertical';
    observations.get(vertical ? yAxis.id : xAxis.id)?.push(0);
  }
  for (const datum of layer.data) {
    const id = tryResolveChartIdentity(datum, layer.getId, maxIDCodeUnits);
    if (!id.ok) return id;
    const x = resolveAxisValue(datum, layer.getX, xAxis, 'x');
    if (!x.ok) return x;
    const y = resolveAxisValue(datum, layer.getY, yAxis, 'y');
    if (!y.ok) return y;
    observations.get(xAxis.id)?.push(x.value);
    observations.get(yAxis.id)?.push(y.value);
    if (layer.kind === 'heatmap') {
      const value = tryResolveChartValue(datum, {
        ...(layer.getValue === undefined ? {} : { getValue: layer.getValue }),
        ...(layer.valueField === undefined ? {} : { field: layer.valueField }),
        canonicalField: 'value', kind: 'numeric',
      });
      if (!value.ok) return value;
      output.push(Object.freeze({ id: id.value, x: x.value, y: y.value, value: value.value as number }));
    } else output.push(Object.freeze({ id: id.value, x: x.value, y: y.value }));
  }
  return chartOK(Object.freeze(output));
}

function resolveAxisValue<ID extends StableID>(
  datum: unknown,
  layerAccessor: ((datum: unknown) => unknown) | undefined,
  axis: NormalizedChartAxisDefinition<unknown, ID>,
  canonicalField: 'x' | 'y',
): ChartResult<ChartAxisValue> {
  const getValue = layerAccessor ?? axis.getValue;
  return tryResolveChartValue(datum, {
    ...(getValue === undefined ? {} : { getValue: getValue as (datum: unknown) => ChartAxisValue }),
    ...(getValue !== undefined || axis.field === undefined ? {} : { field: axis.field }),
    canonicalField,
    kind: axis.scale === 'temporal' ? 'temporal' : axis.scale === 'categorical' ? 'categorical' : 'numeric',
  });
}

function compileLayer<ID extends StableID>(
  pending: PendingLayer<ID>,
  axes: ReadonlyMap<ID, ResolvedChartAxis<ID>>,
): ChartResult<{ readonly model: ChartLayer<ID>; readonly layer: ResolvedChartLayer<ID> }> {
  const definition = pending.definition;
  if (definition.kind === 'pie' || definition.kind === 'donut') {
    const data = pending.datums.map((datum) => Object.freeze({
      id: datum.id,
      value: datum.value as number,
      innerRadius: datum.innerRadius as number,
      outerRadius: datum.outerRadius as number,
    }));
    return chartOK({
      model: Object.freeze({ id: definition.id, profile: 'radial-segment', data: Object.freeze(data) }),
      layer: resolvedLayer(definition, 'radial-segment', 'exact'),
    });
  }
  const xAxis = axes.get(definition.xAxis);
  const yAxis = axes.get(definition.yAxis);
  if (xAxis === undefined || yAxis === undefined) return invalidDefinition('Resolved Chart axes are missing.');
  if (definition.kind === 'bar') return compileBar(pending, xAxis, yAxis);
  if (definition.kind === 'heatmap') return compileHeatmap(pending, xAxis, yAxis);
  const data = pending.datums.map((datum) => Object.freeze({
    id: datum.id,
    x: geometryValue(datum.x as ChartAxisValue, xAxis),
    y: geometryValue(datum.y as ChartAxisValue, yAxis),
  }));
  if (data.some((datum) => datum.x === null || datum.y === null)) return invalidDefinition('Chart values fall outside a declared categorical domain.');
  const profile = definition.kind === 'line' ? 'ordered-series' as const : 'point' as const;
  return chartOK({
    model: Object.freeze({ id: definition.id, profile, data: Object.freeze(data) }) as ChartLayer<ID>,
    layer: resolvedLayer(definition, profile, definition.kind === 'scatter' && definition.projection === 'density' ? 'density' : 'exact'),
  });
}

function compileBar<ID extends StableID>(
  pending: PendingLayer<ID>,
  xAxis: ResolvedChartAxis<ID>,
  yAxis: ResolvedChartAxis<ID>,
): ChartResult<{ readonly model: ChartLayer<ID>; readonly layer: ResolvedChartLayer<ID> }> {
  const definition = pending.definition;
  if (definition.kind !== 'bar') return invalidDefinition('Bar compilation requires a bar layer.');
  const vertical = (definition.orientation ?? 'vertical') === 'vertical';
  const categoryAxis = vertical ? xAxis : yAxis;
  const valueAxis = vertical ? yAxis : xAxis;
  if (categoryAxis.scale !== 'categorical' || valueAxis.scale !== 'linear') {
    return invalidDefinition('Vertical bars require categorical X and linear Y axes; horizontal bars require linear X and categorical Y axes.');
  }
  const data = pending.datums.map((datum) => {
    const category = vertical ? datum.x as ChartAxisValue : datum.y as ChartAxisValue;
    const value = vertical ? datum.y as number : datum.x as number;
    const slot = categorySlot(category, categoryAxis);
    return vertical
      ? Object.freeze({ id: datum.id, x1: slot, y1: 0, x2: slot === null ? null : slot + 1, y2: value })
      : Object.freeze({ id: datum.id, x1: 0, y1: slot, x2: value, y2: slot === null ? null : slot + 1 });
  });
  if (data.some((datum) => datum.x1 === null || datum.y1 === null || datum.x2 === null || datum.y2 === null)) {
    return invalidDefinition('Bar categories fall outside their declared domain.');
  }
  return chartOK({
    model: Object.freeze({ id: definition.id, profile: 'cartesian-segment', data: Object.freeze(data) }) as ChartLayer<ID>,
    layer: resolvedLayer(definition, 'cartesian-segment', 'exact'),
  });
}

function compileHeatmap<ID extends StableID>(
  pending: PendingLayer<ID>,
  xAxis: ResolvedChartAxis<ID>,
  yAxis: ResolvedChartAxis<ID>,
): ChartResult<{ readonly model: ChartLayer<ID>; readonly layer: ResolvedChartLayer<ID> }> {
  const definition = pending.definition;
  if (definition.kind !== 'heatmap') return invalidDefinition('Heatmap compilation requires a heatmap layer.');
  const xValues = heatmapSlots(pending.datums.map((datum) => datum.x as ChartAxisValue), xAxis);
  const yValues = heatmapSlots(pending.datums.map((datum) => datum.y as ChartAxisValue), yAxis);
  const xSlots = new Map<ChartAxisValue, number>(xValues.values.map((value, index) => [value, index]));
  const ySlots = new Map<ChartAxisValue, number>(yValues.values.map((value, index) => [value, index]));
  const data = pending.datums.map((datum) => Object.freeze({
    id: datum.id,
    column: xSlots.get(datum.x as ChartAxisValue) as number,
    row: ySlots.get(datum.y as ChartAxisValue) as number,
    value: datum.value as number,
  }));
  const aggregate = typeof definition.projection === 'object' && definition.projection.kind === 'aggregate';
  return chartOK({
    model: Object.freeze({ id: definition.id, profile: 'grid-cell', data: Object.freeze(data) }),
    layer: Object.freeze({
      ...resolvedLayer(definition, 'grid-cell', aggregate ? 'heatmap-aggregate' : 'exact'),
      ...(aggregate ? { reduction: definition.projection.reduction } : {}),
      heatmap: Object.freeze({ xEdges: xValues.edges, yEdges: yValues.edges }),
    }),
  });
}

function heatmapSlots<ID extends StableID>(
  observed: readonly ChartAxisValue[],
  axis: ResolvedChartAxis<ID>,
): { readonly values: readonly ChartAxisValue[]; readonly edges: Float64Array } {
  const values = axis.domain.kind === 'categorical'
    ? axis.domain.values
    : [...new Set(observed as readonly number[])].sort((left, right) => left - right);
  if (axis.domain.kind === 'categorical') {
    return { values, edges: Float64Array.from({ length: values.length + 1 }, (_, index) => index) };
  }
  const numeric = values as readonly number[];
  return { values, edges: numericEdges(numeric) };
}

function expandHeatmapAutoDomains<ID extends StableID>(
  coordinate: Extract<NormalizedChartCoordinateDefinition<unknown, ID>, { readonly kind: 'cartesian' }>,
  pending: readonly PendingLayer<ID>[],
  axes: readonly ResolvedChartAxis<ID>[],
): readonly ResolvedChartAxis<ID>[] {
  return Object.freeze(axes.map((axis) => {
    const definition = coordinate.axes.find((candidate) => candidate.id === axis.id);
    if (definition?.domain !== 'auto' || axis.domain.kind === 'categorical' || axis.scale === 'logarithmic') return axis;
    const values: number[] = [];
    for (const layer of pending) {
      if (layer.definition.kind !== 'heatmap') continue;
      const useX = layer.definition.xAxis === axis.id;
      const useY = layer.definition.yAxis === axis.id;
      if (!useX && !useY) continue;
      for (const datum of layer.datums) {
        const value = useX ? datum.x : datum.y;
        if (typeof value === 'number') values.push(value);
      }
    }
    if (values.length === 0) return axis;
    const unique = [...new Set(values)].sort((left, right) => left - right);
    const edges = numericEdges(unique);
    return Object.freeze({
      ...axis,
      domain: Object.freeze({
        kind: axis.scale === 'temporal' ? 'temporal' as const : 'numeric' as const,
        minimum: Math.min(axis.domain.minimum, edges[0] as number),
        maximum: Math.max(axis.domain.maximum, edges[edges.length - 1] as number),
      }),
    });
  }));
}

function numericEdges(values: readonly number[]): Float64Array {
  const edges = new Float64Array(values.length + 1);
  if (values.length === 1) { edges[0] = (values[0] as number) - 0.5; edges[1] = (values[0] as number) + 0.5; }
  else if (values.length > 1) {
    edges[0] = (values[0] as number) - ((values[1] as number) - (values[0] as number)) / 2;
    for (let index = 1; index < values.length; index += 1) edges[index] = ((values[index - 1] as number) + (values[index] as number)) / 2;
    edges[values.length] = (values.at(-1) as number) + ((values.at(-1) as number) - (values.at(-2) as number)) / 2;
  }
  return edges;
}

function resolvedLayer<ID extends StableID>(
  definition: ChartLayerDefinition<unknown, ID>,
  profile: ChartProfile,
  projection: ResolvedChartLayer<ID>['projection'],
): ResolvedChartLayer<ID> {
  const cartesian = definition.kind !== 'pie' && definition.kind !== 'donut';
  return Object.freeze({
    id: definition.id,
    kind: definition.kind,
    profile,
    ...(definition.label === undefined ? {} : { label: definition.label }),
    ...(cartesian ? { xAxis: definition.xAxis, yAxis: definition.yAxis } : {}),
    projection,
  });
}

function geometryValue<ID extends StableID>(value: ChartAxisValue, axis: ResolvedChartAxis<ID>): number | null {
  if (axis.domain.kind !== 'categorical') return typeof value === 'number' ? value : null;
  const slot = categorySlot(value, axis);
  return slot === null ? null : slot + 0.5;
}

function categorySlot<ID extends StableID>(value: ChartAxisValue, axis: ResolvedChartAxis<ID>): number | null {
  if (axis.domain.kind !== 'categorical') return null;
  let slots = categoricalSlots.get(axis);
  if (slots === undefined) {
    slots = new Map(axis.domain.values.map((category, index) => [category, index]));
    categoricalSlots.set(axis, slots);
  }
  return slots.get(value) ?? null;
}

const categoricalSlots = new WeakMap<object, ReadonlyMap<ChartAxisValue, number>>();

function invalidDefinition<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-definition-invalid', message);
}

function sameDefinitionMetadata<ID extends StableID>(
  left: ChartDefinitionState<ID>,
  right: ChartDefinitionState<ID>,
): boolean {
  if (left.coordinate.kind !== right.coordinate.kind || left.axes.length !== right.axes.length || left.layers.length !== right.layers.length) return false;
  for (let index = 0; index < left.axes.length; index += 1) {
    const a = left.axes[index] as ResolvedChartAxis<ID>;
    const b = right.axes[index] as ResolvedChartAxis<ID>;
    if (a.id !== b.id || a.orientation !== b.orientation || a.scale !== b.scale || a.ticks !== b.ticks
      || a.label !== b.label || a.unit !== b.unit || !sameAxisDomain(a.domain, b.domain)) return false;
  }
  for (let index = 0; index < left.layers.length; index += 1) {
    const a = left.layers[index] as ResolvedChartLayer<ID>;
    const b = right.layers[index] as ResolvedChartLayer<ID>;
    if (a.id !== b.id || a.kind !== b.kind || a.profile !== b.profile || a.label !== b.label
      || a.xAxis !== b.xAxis || a.yAxis !== b.yAxis || a.projection !== b.projection || a.reduction !== b.reduction
      || !sameNumbers(a.heatmap?.xEdges, b.heatmap?.xEdges) || !sameNumbers(a.heatmap?.yEdges, b.heatmap?.yEdges)) return false;
  }
  return true;
}

function sameAxisDomain(left: ResolvedChartAxis['domain'], right: ResolvedChartAxis['domain']): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'categorical' && right.kind === 'categorical') {
    return left.values.length === right.values.length && left.values.every((value, index) => value === right.values[index]);
  }
  return left.kind !== 'categorical' && right.kind !== 'categorical'
    && left.minimum === right.minimum && left.maximum === right.maximum;
}

function sameNumbers(left: Float64Array | undefined, right: Float64Array | undefined): boolean {
  if (left === right) return true;
  if (left === undefined || right === undefined || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) if (!Object.is(left[index], right[index])) return false;
  return true;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

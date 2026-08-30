import type { StableID } from '@sectile/core';
import { DEFAULT_MAX_ID_CODE_UNITS, validateStableID } from '@sectile/core/identity';
import { unwrap } from '@sectile/core/result';
import type { UnitID } from '@sectile/core/units';
import { chartFail, chartOK } from './internal/result.js';
import type { ChartLimits } from './model.js';
import type { ChartResult } from './result.js';
import type { ChartScaleKind } from './scale.js';

export type ChartCoordinateKind = 'cartesian' | 'radial';
export type ChartAxisOrientation = 'x' | 'y';
export type ChartLayerKind = 'line' | 'scatter' | 'bar' | 'heatmap' | 'pie' | 'donut';
export type ChartCategory = string | number;
export type ChartTemporalValue = number | Date;
export type ChartAxisInputValue = number | string | Date;
export type ChartAxisValue = number | string;
export type ChartAccessor<Datum, Value> = (datum: Datum) => Value;
export type ChartInferredIdentity<Datum> = Datum extends { readonly id: infer ID extends StableID } ? ID : StableID;

export interface ChartNumericDomainInput {
  readonly kind: 'numeric';
  readonly minimum: number;
  readonly maximum: number;
}

export interface ChartTemporalDomainInput {
  readonly kind: 'temporal';
  readonly minimum: ChartTemporalValue;
  readonly maximum: ChartTemporalValue;
}

export interface ChartCategoricalDomainInput {
  readonly kind: 'categorical';
  readonly values: readonly ChartCategory[];
}

export type ChartAxisDomainInput =
  | 'auto'
  | ChartNumericDomainInput
  | ChartTemporalDomainInput
  | ChartCategoricalDomainInput;

export interface ChartAxisNumericDomain {
  readonly kind: 'numeric';
  readonly minimum: number;
  readonly maximum: number;
}

export interface ChartAxisTemporalDomain {
  readonly kind: 'temporal';
  readonly minimum: number;
  readonly maximum: number;
}

export interface ChartAxisCategoricalDomain {
  readonly kind: 'categorical';
  readonly values: readonly ChartCategory[];
}

export type ChartAxisDomain =
  | 'auto'
  | ChartAxisNumericDomain
  | ChartAxisTemporalDomain
  | ChartAxisCategoricalDomain;

export interface ChartAxisDefinition<Datum = unknown, ID extends StableID = StableID> {
  readonly id: ID;
  readonly orientation: ChartAxisOrientation;
  readonly scale: ChartScaleKind;
  readonly domain?: ChartAxisDomainInput;
  readonly field?: string;
  readonly getValue?: ChartAccessor<Datum, ChartAxisInputValue>;
  readonly ticks?: number;
  readonly label?: string;
  readonly unit?: UnitID;
}

export interface NormalizedChartAxisDefinition<Datum = unknown, ID extends StableID = StableID>
  extends Omit<ChartAxisDefinition<Datum, ID>, 'domain'> {
  readonly domain: ChartAxisDomain;
}

export interface ChartCartesianCoordinateDefinition<Datum = unknown, ID extends StableID = StableID> {
  readonly kind: 'cartesian';
  readonly axes: readonly ChartAxisDefinition<Datum, ID>[];
}

export interface ChartRadialCoordinateDefinition {
  readonly kind: 'radial';
}

export type ChartCoordinateDefinition<Datum = unknown, ID extends StableID = StableID> =
  | ChartCartesianCoordinateDefinition<Datum, ID>
  | ChartRadialCoordinateDefinition;

export interface NormalizedChartCartesianCoordinateDefinition<Datum = unknown, ID extends StableID = StableID> {
  readonly kind: 'cartesian';
  readonly axes: readonly NormalizedChartAxisDefinition<Datum, ID>[];
}

export type NormalizedChartCoordinateDefinition<Datum = unknown, ID extends StableID = StableID> =
  | NormalizedChartCartesianCoordinateDefinition<Datum, ID>
  | ChartRadialCoordinateDefinition;

interface ChartLayerDefinitionBase<Datum, ID extends StableID> {
  readonly id: ID;
  readonly data: readonly Datum[];
  readonly getId?: ChartAccessor<Datum, ID>;
  readonly label?: string;
}

interface ChartCartesianLayerDefinitionBase<Datum, ID extends StableID>
  extends ChartLayerDefinitionBase<Datum, ID> {
  readonly xAxis: ID;
  readonly yAxis: ID;
  readonly getX?: ChartAccessor<Datum, ChartAxisInputValue>;
  readonly getY?: ChartAccessor<Datum, ChartAxisInputValue>;
}

export interface ChartLineLayerDefinition<Datum = unknown, ID extends StableID = StableID>
  extends ChartCartesianLayerDefinitionBase<Datum, ID> {
  readonly kind: 'line';
}

export interface ChartScatterLayerDefinition<Datum = unknown, ID extends StableID = StableID>
  extends ChartCartesianLayerDefinitionBase<Datum, ID> {
  readonly kind: 'scatter';
  readonly projection?: 'raw' | 'density';
}

export interface ChartBarLayerDefinition<Datum = unknown, ID extends StableID = StableID>
  extends ChartCartesianLayerDefinitionBase<Datum, ID> {
  readonly kind: 'bar';
  readonly orientation?: 'vertical' | 'horizontal';
}

export type ChartHeatmapReduction = 'sum' | 'mean' | 'minimum' | 'maximum';

export interface ChartHeatmapLayerDefinition<Datum = unknown, ID extends StableID = StableID>
  extends ChartCartesianLayerDefinitionBase<Datum, ID> {
  readonly kind: 'heatmap';
  readonly getValue?: ChartAccessor<Datum, number>;
  readonly valueField?: string;
  readonly projection?: 'raw' | { readonly kind: 'aggregate'; readonly reduction: ChartHeatmapReduction };
}

interface ChartRadialLayerDefinitionBase<Datum, ID extends StableID>
  extends ChartLayerDefinitionBase<Datum, ID> {
  readonly getValue?: ChartAccessor<Datum, number>;
  readonly valueField?: string;
  readonly getLabel?: ChartAccessor<Datum, string>;
  readonly labelField?: string;
}

export interface ChartPieLayerDefinition<Datum = unknown, ID extends StableID = StableID>
  extends ChartRadialLayerDefinitionBase<Datum, ID> {
  readonly kind: 'pie';
}

export interface ChartDonutLayerDefinition<Datum = unknown, ID extends StableID = StableID>
  extends ChartRadialLayerDefinitionBase<Datum, ID> {
  readonly kind: 'donut';
  readonly innerRadius?: number;
  readonly outerRadius?: number;
}

export type ChartCartesianLayerDefinition<Datum = unknown, ID extends StableID = StableID> =
  | ChartLineLayerDefinition<Datum, ID>
  | ChartScatterLayerDefinition<Datum, ID>
  | ChartBarLayerDefinition<Datum, ID>
  | ChartHeatmapLayerDefinition<Datum, ID>;

export type ChartRadialLayerDefinition<Datum = unknown, ID extends StableID = StableID> =
  | ChartPieLayerDefinition<Datum, ID>
  | ChartDonutLayerDefinition<Datum, ID>;

export type ChartLayerDefinition<Datum = unknown, ID extends StableID = StableID> =
  | ChartCartesianLayerDefinition<Datum, ID>
  | ChartRadialLayerDefinition<Datum, ID>;

export interface ChartValueResolution<Datum, Value extends ChartAxisInputValue = ChartAxisInputValue> {
  readonly getValue?: ChartAccessor<Datum, Value>;
  readonly field?: string;
  readonly canonicalField: 'x' | 'y' | 'value' | 'label';
  readonly kind: 'numeric' | 'temporal' | 'categorical';
}

export type ChartAggregateReduction = 'density' | ChartHeatmapReduction;

export interface ChartAggregateBounds {
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumY: number;
  readonly maximumY: number;
}

export interface ChartDatumRepresentative<ID extends StableID = StableID> {
  readonly kind: 'datum';
  readonly id: ID;
}

export interface ChartAggregateRepresentative {
  readonly kind: 'aggregate';
  readonly reduction: ChartAggregateReduction;
  readonly count: number;
  readonly bounds: ChartAggregateBounds;
}

export type ChartRepresentative<ID extends StableID = StableID> =
  | ChartDatumRepresentative<ID>
  | ChartAggregateRepresentative;

export interface ChartContinuousViewWindow {
  readonly kind: 'continuous';
  readonly minimum: number;
  readonly maximum: number;
}

export interface ChartCategoricalViewWindow {
  readonly kind: 'categorical';
  readonly start: number;
  readonly end: number;
}

export type ChartAxisViewWindow = ChartContinuousViewWindow | ChartCategoricalViewWindow;

export type ChartAxisViewUpdateMode = 'preserve' | 'reset' | 'follow-end';

export interface ChartAxisView<ID extends StableID = StableID> {
  readonly axisID: ID;
  readonly orientation?: ChartAxisOrientation;
  readonly scale: ChartScaleKind;
  readonly base: ChartAxisViewWindow;
  readonly initial?: ChartAxisViewWindow;
  readonly visible: ChartAxisViewWindow;
  readonly minimumSpan?: number;
  readonly maximumSpan?: number;
  readonly update?: ChartAxisViewUpdateMode;
  readonly followingEnd?: boolean;
  readonly categories?: readonly ChartCategory[];
  readonly revision: number;
}

export interface ChartViewState<ID extends StableID = StableID> {
  readonly revision: number;
  readonly axes: readonly ChartAxisView<ID>[];
}

export const DEFAULT_MAXIMUM_CHART_AXES = 16;
export const MAXIMUM_CHART_AXES = 64;

export function normalizeChartTemporalValue(value: ChartTemporalValue): number {
  return unwrap(tryNormalizeChartTemporalValue(value));
}

export function tryNormalizeChartTemporalValue(value: unknown): ChartResult<number> {
  const normalized = value instanceof Date ? value.getTime() : value;
  return typeof normalized === 'number' && Number.isFinite(normalized)
    ? chartOK(normalized)
    : chartFail('construction', 'chart-temporal-invalid', 'Temporal chart values must be valid Date objects or finite epoch-millisecond numbers.');
}

export function resolveChartIdentity<Datum, ID extends StableID = ChartInferredIdentity<Datum>>(
  datum: Datum,
  getId?: ChartAccessor<Datum, ID>,
  maxIDCodeUnits: number = DEFAULT_MAX_ID_CODE_UNITS,
): ID {
  return unwrap(tryResolveChartIdentity(datum, getId, maxIDCodeUnits));
}

export function tryResolveChartIdentity<Datum, ID extends StableID = ChartInferredIdentity<Datum>>(
  datum: Datum,
  getId?: ChartAccessor<Datum, ID>,
  maxIDCodeUnits: number = DEFAULT_MAX_ID_CODE_UNITS,
): ChartResult<ID> {
  const resolved = getId === undefined
    ? readField(datum, 'id')
    : callAccessor(datum, getId, 'Chart identity accessor failed.');
  if (!resolved.ok) return resolved;
  if (resolved.value === undefined) {
    return chartFail('construction', 'chart-identity-missing', 'Chart data requires an explicit identity accessor or canonical id field.');
  }
  const error = validateStableID(resolved.value, maxIDCodeUnits);
  return error === null ? chartOK(resolved.value as ID) : { ok: false, error };
}

export function resolveChartValue<Datum>(
  datum: Datum,
  resolution: ChartValueResolution<Datum>,
): ChartAxisValue {
  return unwrap(tryResolveChartValue(datum, resolution));
}

export function tryResolveChartValue<Datum>(
  datum: Datum,
  resolution: ChartValueResolution<Datum>,
): ChartResult<ChartAxisValue> {
  if (resolution === null || typeof resolution !== 'object') return invalidAccessor('Chart value resolution must be an object.');
  let resolved: ChartResult<unknown>;
  if (resolution.getValue !== undefined) {
    if (typeof resolution.getValue !== 'function') return invalidAccessor('Chart value accessor must be a function.');
    resolved = callAccessor(datum, resolution.getValue, 'Chart value accessor failed.');
  } else if (resolution.field !== undefined) {
    if (!nonEmptyString(resolution.field)) return invalidAccessor('Chart value field must be a non-empty string.');
    resolved = readField(datum, resolution.field);
  } else {
    resolved = readField(datum, resolution.canonicalField);
  }
  if (!resolved.ok) return resolved;
  if (resolution.kind === 'temporal') return tryNormalizeChartTemporalValue(resolved.value);
  if (resolution.kind === 'numeric') {
    return typeof resolved.value === 'number' && Number.isFinite(resolved.value)
      ? chartOK(resolved.value)
      : invalidAccessor('Numeric chart values must be finite numbers.');
  }
  if (resolution.kind === 'categorical') {
    return validCategory(resolved.value)
      ? chartOK(resolved.value)
      : invalidAccessor('Categorical chart values must be finite numbers or non-empty strings.');
  }
  return invalidAccessor('Chart value resolution kind is invalid.');
}

export function normalizeChartRepresentative<ID extends StableID>(
  representative: ChartRepresentative<ID>,
): ChartRepresentative<ID> {
  return unwrap(tryNormalizeChartRepresentative(representative));
}

export function tryNormalizeChartRepresentative<ID extends StableID>(
  representative: ChartRepresentative<ID>,
): ChartResult<ChartRepresentative<ID>> {
  if (representative === null || typeof representative !== 'object') {
    return invalidAggregate('Chart representative must be an object.');
  }
  if (representative.kind === 'datum') {
    const error = validateStableID(representative.id);
    return error === null
      ? chartOK(Object.freeze({ kind: 'datum', id: representative.id }))
      : { ok: false, error };
  }
  if (representative.kind !== 'aggregate' || 'id' in representative
    || !validAggregateReduction(representative.reduction)
    || !Number.isSafeInteger(representative.count) || representative.count < 1
    || !validAggregateBounds(representative.bounds)) {
    return invalidAggregate('Aggregate chart representatives require a reduction, positive count, finite bounds, and no datum identity.');
  }
  return chartOK(Object.freeze({
    kind: 'aggregate',
    reduction: representative.reduction,
    count: representative.count,
    bounds: Object.freeze({ ...representative.bounds }),
  }));
}

export function normalizeChartCoordinate<Datum, ID extends StableID>(
  input: ChartCoordinateDefinition<Datum, ID>,
  limits: Pick<ChartLimits, 'maxAxes' | 'maxIDCodeUnits'> = {},
): NormalizedChartCoordinateDefinition<Datum, ID> {
  return unwrap(tryNormalizeChartCoordinate(input, limits));
}

export function tryNormalizeChartCoordinate<Datum, ID extends StableID>(
  input: ChartCoordinateDefinition<Datum, ID>,
  limits: Pick<ChartLimits, 'maxAxes' | 'maxIDCodeUnits'> = {},
): ChartResult<NormalizedChartCoordinateDefinition<Datum, ID>> {
  if (input === null || typeof input !== 'object') return invalidCoordinate('Chart coordinate definition must be an object.');
  if (input.kind === 'radial') {
    return 'axes' in input
      ? chartFail('construction', 'chart-coordinate-mismatch', 'Radial coordinates do not accept Cartesian axes.')
      : chartOK(Object.freeze({ kind: 'radial' }));
  }
  if (input.kind !== 'cartesian' || !Array.isArray(input.axes)) {
    return invalidCoordinate('Chart coordinate kind must be cartesian or radial.');
  }
  const maxAxes = limits.maxAxes ?? DEFAULT_MAXIMUM_CHART_AXES;
  const maxIDCodeUnits = limits.maxIDCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  if (!Number.isSafeInteger(maxAxes) || maxAxes < 2 || maxAxes > MAXIMUM_CHART_AXES) {
    return invalidCoordinate('Chart maxAxes must be a safe integer between 2 and the hard ceiling.');
  }
  if (input.axes.length > maxAxes) {
    return chartFail('resource-rejection', 'chart-axis-ceiling-exceeded', 'Chart axis count exceeds its ceiling.', {
      actual: input.axes.length,
      ceiling: maxAxes,
    });
  }
  const axes: NormalizedChartAxisDefinition<Datum, ID>[] = [];
  const identities = new Set<ID>();
  let xAxes = 0;
  let yAxes = 0;
  for (const axis of input.axes) {
    const normalized = tryNormalizeChartAxis<Datum, ID>(axis, maxIDCodeUnits);
    if (!normalized.ok) return normalized;
    if (identities.has(normalized.value.id)) {
      return chartFail('construction', 'chart-axis-duplicate', 'Chart axis identities must be unique.', { id: normalized.value.id });
    }
    identities.add(normalized.value.id);
    axes.push(normalized.value);
    if (normalized.value.orientation === 'x') xAxes += 1;
    else yAxes += 1;
  }
  if (xAxes === 0 || yAxes === 0) {
    return chartFail('construction', 'chart-axis-missing', 'Cartesian coordinates require at least one X axis and one Y axis.');
  }
  return chartOK(Object.freeze({ kind: 'cartesian', axes: Object.freeze(axes) }));
}

export function validateChartLayerCoordinate<Datum, ID extends StableID>(
  coordinate: NormalizedChartCoordinateDefinition<Datum, ID>,
  layer: ChartLayerDefinition<Datum, ID>,
): void {
  unwrap(tryValidateChartLayerCoordinate(coordinate, layer));
}

export function tryValidateChartLayerCoordinate<Datum, ID extends StableID>(
  coordinate: NormalizedChartCoordinateDefinition<Datum, ID>,
  layer: ChartLayerDefinition<Datum, ID>,
): ChartResult<void> {
  if (coordinate === null || typeof coordinate !== 'object' || layer === null || typeof layer !== 'object') {
    return chartFail('construction', 'chart-coordinate-mismatch', 'Chart coordinate and layer definitions must be objects.');
  }
  const radialLayer = layer.kind === 'pie' || layer.kind === 'donut';
  if ((coordinate.kind === 'radial') !== radialLayer) {
    return chartFail('construction', 'chart-coordinate-mismatch', 'Chart layer kind is incompatible with its coordinate system.', {
      coordinate: coordinate.kind,
      layer: layer.kind,
    });
  }
  if (coordinate.kind === 'radial' || radialLayer) return chartOK(undefined);
  const xAxis = coordinate.axes.find((axis) => axis.id === layer.xAxis);
  const yAxis = coordinate.axes.find((axis) => axis.id === layer.yAxis);
  if (xAxis === undefined || yAxis === undefined) {
    return chartFail('construction', 'chart-axis-missing', 'Cartesian layer axis references must resolve within the same coordinate system.');
  }
  if (xAxis.orientation !== 'x' || yAxis.orientation !== 'y') {
    return chartFail('construction', 'chart-coordinate-mismatch', 'Cartesian layer axes must match their X and Y orientations.');
  }
  return chartOK(undefined);
}

export function createChartViewState<ID extends StableID>(
  axes: readonly ChartAxisView<ID>[],
  revision = 0,
  limits: Pick<ChartLimits, 'maxAxes' | 'maxIDCodeUnits'> = {},
): ChartViewState<ID> {
  return unwrap(tryCreateChartViewState(axes, revision, limits));
}

export function tryCreateChartViewState<ID extends StableID>(
  axes: readonly ChartAxisView<ID>[],
  revision = 0,
  limits: Pick<ChartLimits, 'maxAxes' | 'maxIDCodeUnits'> = {},
): ChartResult<ChartViewState<ID>> {
  if (!Array.isArray(axes) || !nonNegativeSafeInteger(revision)) return invalidView('Chart view state is invalid.');
  const maxAxes = limits.maxAxes ?? DEFAULT_MAXIMUM_CHART_AXES;
  const maxIDCodeUnits = limits.maxIDCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  if (!Number.isSafeInteger(maxAxes) || maxAxes < 0 || maxAxes > MAXIMUM_CHART_AXES) {
    return invalidView('Chart view maxAxes must be a non-negative safe integer within the hard ceiling.');
  }
  if (axes.length > maxAxes) {
    return chartFail('resource-rejection', 'chart-axis-ceiling-exceeded', 'Chart view axis count exceeds its ceiling.', {
      actual: axes.length,
      ceiling: maxAxes,
    });
  }
  const identities = new Set<ID>();
  const normalized: ChartAxisView<ID>[] = [];
  for (const axis of axes) {
    if (axis === null || typeof axis !== 'object') return invalidView('Chart axis view must be an object.');
    const idError = validateStableID(axis.axisID, maxIDCodeUnits);
    if (idError !== null) return { ok: false, error: idError };
    if (identities.has(axis.axisID)) return chartFail('construction', 'chart-axis-duplicate', 'Chart view axis identities must be unique.', { id: axis.axisID });
    identities.add(axis.axisID);
    const checked = normalizeAxisView<ID>(axis);
    if (!checked.ok) return checked;
    normalized.push(checked.value);
  }
  return chartOK(Object.freeze({ revision, axes: Object.freeze(normalized) }));
}

function tryNormalizeChartAxis<Datum, ID extends StableID>(
  axis: ChartAxisDefinition<Datum, ID>,
  maxIDCodeUnits: number,
): ChartResult<NormalizedChartAxisDefinition<Datum, ID>> {
  if (axis === null || typeof axis !== 'object') return invalidAxis('Chart axis definition must be an object.');
  const idError = validateStableID(axis.id, maxIDCodeUnits);
  if (idError !== null) return { ok: false, error: idError };
  if (axis.orientation !== 'x' && axis.orientation !== 'y') return invalidAxis('Chart axis orientation must be x or y.');
  if (!validScaleKind(axis.scale)) return invalidAxis('Chart axis scale kind is invalid.');
  if (axis.field !== undefined && !nonEmptyString(axis.field)) return invalidAxis('Chart axis field must be a non-empty string.');
  if (axis.getValue !== undefined && typeof axis.getValue !== 'function') return invalidAxis('Chart axis accessor must be a function.');
  if (axis.ticks !== undefined && (!nonNegativeSafeInteger(axis.ticks) || axis.ticks > 10_000)) {
    return chartFail('resource-rejection', 'chart-tick-ceiling-exceeded', 'Chart axis tick count exceeds its valid range.', { ticks: axis.ticks });
  }
  if (axis.label !== undefined && typeof axis.label !== 'string') return invalidAxis('Chart axis label must be a string.');
  if (axis.unit !== undefined && !nonEmptyString(axis.unit)) return invalidAxis('Chart axis unit must be a non-empty UnitID.');
  const domain = normalizeAxisDomain(axis.scale, axis.domain ?? 'auto');
  if (!domain.ok) return domain;
  return chartOK(Object.freeze({ ...axis, domain: domain.value }));
}

function normalizeAxisDomain(scale: ChartScaleKind, domain: ChartAxisDomainInput): ChartResult<ChartAxisDomain> {
  if (domain === 'auto') return chartOK('auto');
  if (domain === null || typeof domain !== 'object') return invalidDomain('Chart axis domain is invalid.');
  if (scale === 'temporal') {
    if (domain.kind !== 'temporal') return invalidDomain('Temporal axes require a temporal domain.');
    const minimum = tryNormalizeChartTemporalValue(domain.minimum);
    if (!minimum.ok) return minimum;
    const maximum = tryNormalizeChartTemporalValue(domain.maximum);
    if (!maximum.ok) return maximum;
    return minimum.value < maximum.value
      ? chartOK(Object.freeze({ kind: 'temporal', minimum: minimum.value, maximum: maximum.value }))
      : invalidDomain('Temporal chart domains must be increasing.');
  }
  if (scale === 'categorical') {
    if (domain.kind !== 'categorical' || !Array.isArray(domain.values) || domain.values.length === 0) {
      return invalidDomain('Categorical axes require at least one category.');
    }
    const values: ChartCategory[] = [];
    const seen = new Set<ChartCategory>();
    for (const value of domain.values) {
      if (!validCategory(value) || seen.has(value)) return invalidDomain('Categorical axis values must be unique finite numbers or non-empty strings.');
      seen.add(value);
      values.push(value);
    }
    return chartOK(Object.freeze({ kind: 'categorical', values: Object.freeze(values) }));
  }
  if (domain.kind !== 'numeric' || !finiteIncreasing(domain.minimum, domain.maximum)) {
    return invalidDomain('Linear and logarithmic axes require an increasing numeric domain.');
  }
  if (scale === 'logarithmic' && domain.minimum <= 0) return invalidDomain('Logarithmic chart domains must be positive.');
  return chartOK(Object.freeze({ kind: 'numeric', minimum: domain.minimum, maximum: domain.maximum }));
}

function normalizeAxisView<ID extends StableID>(axis: ChartAxisView<ID>): ChartResult<ChartAxisView<ID>> {
  if (!validScaleKind(axis.scale) || !nonNegativeSafeInteger(axis.revision)) return invalidView('Chart axis view scale or revision is invalid.');
  if (axis.orientation !== undefined && axis.orientation !== 'x' && axis.orientation !== 'y') return invalidView('Chart axis view orientation is invalid.');
  const categorical = axis.scale === 'categorical';
  if (categorical !== (axis.base.kind === 'categorical') || categorical !== (axis.visible.kind === 'categorical')) {
    return invalidView('Chart axis view windows must match the scale kind.');
  }
  const initial = axis.initial ?? axis.visible;
  if (!validViewWindow(axis.base) || !validViewWindow(initial) || !validViewWindow(axis.visible)) return invalidView('Chart axis view windows are invalid.');
  const baseStart = windowStart(axis.base);
  const baseEnd = windowEnd(axis.base);
  const initialStart = windowStart(initial);
  const initialEnd = windowEnd(initial);
  const visibleStart = windowStart(axis.visible);
  const visibleEnd = windowEnd(axis.visible);
  if (initialStart < baseStart || initialEnd > baseEnd || visibleStart < baseStart || visibleEnd > baseEnd) {
    return invalidView('Initial and visible chart axis views must remain inside their base window.');
  }
  if (axis.scale === 'logarithmic' && baseStart <= 0) return invalidView('Logarithmic chart axis views must be positive.');
  const baseSpan = axis.scale === 'logarithmic' ? Math.log(baseEnd) - Math.log(baseStart) : baseEnd - baseStart;
  const minimumSpan = axis.minimumSpan ?? (categorical ? 1 : 0);
  const maximumSpan = axis.maximumSpan ?? baseSpan;
  const visibleSpan = axis.scale === 'logarithmic'
    ? Math.log(visibleEnd) - Math.log(visibleStart)
    : visibleEnd - visibleStart;
  if (!Number.isFinite(minimumSpan) || minimumSpan < 0 || !Number.isFinite(maximumSpan)
    || maximumSpan < minimumSpan || visibleSpan < minimumSpan || visibleSpan > maximumSpan) {
    return invalidView('Chart axis view span limits are invalid.');
  }
  const update = axis.update ?? 'preserve';
  if (update !== 'preserve' && update !== 'reset' && update !== 'follow-end') return invalidView('Chart axis view update mode is invalid.');
  if (axis.followingEnd !== undefined && typeof axis.followingEnd !== 'boolean') return invalidView('Chart follow-end state must be boolean.');
  if (categorical && axis.categories !== undefined) {
    if (!Array.isArray(axis.categories) || axis.categories.length !== baseEnd - baseStart) {
      return invalidView('Categorical chart axis view categories must match its base slot count.');
    }
    const categories = new Set<ChartCategory>();
    for (const category of axis.categories) {
      if (!validCategory(category) || categories.has(category)) return invalidView('Categorical chart axis view categories must be unique.');
      categories.add(category);
    }
  } else if (!categorical && axis.categories !== undefined) return invalidView('Continuous chart axis views do not accept categories.');
  return chartOK(Object.freeze({
    axisID: axis.axisID,
    ...(axis.orientation === undefined ? {} : { orientation: axis.orientation }),
    scale: axis.scale,
    base: freezeViewWindow(axis.base),
    initial: freezeViewWindow(initial),
    visible: freezeViewWindow(axis.visible),
    minimumSpan,
    maximumSpan,
    update,
    followingEnd: axis.followingEnd ?? (update === 'follow-end' && visibleEnd === baseEnd),
    ...(axis.categories === undefined ? {} : { categories: Object.freeze([...axis.categories]) }),
    revision: axis.revision,
  }));
}

function validViewWindow(window: ChartAxisViewWindow): boolean {
  return window !== null && typeof window === 'object' && (
    window.kind === 'continuous'
      ? finiteIncreasing(window.minimum, window.maximum)
      : window.kind === 'categorical'
        && nonNegativeSafeInteger(window.start)
        && Number.isSafeInteger(window.end)
        && window.end > window.start
  );
}

function freezeViewWindow(window: ChartAxisViewWindow): ChartAxisViewWindow {
  return window.kind === 'continuous'
    ? Object.freeze({ kind: 'continuous', minimum: window.minimum, maximum: window.maximum })
    : Object.freeze({ kind: 'categorical', start: window.start, end: window.end });
}

function windowStart(window: ChartAxisViewWindow): number {
  return window.kind === 'continuous' ? window.minimum : window.start;
}

function windowEnd(window: ChartAxisViewWindow): number {
  return window.kind === 'continuous' ? window.maximum : window.end;
}

function readField(value: unknown, field: string): ChartResult<unknown> {
  return value !== null && typeof value === 'object'
    ? chartOK((value as Record<string, unknown>)[field])
    : invalidAccessor('Chart accessors require object data when resolving a field.');
}

function callAccessor<Datum, Value>(
  datum: Datum,
  accessor: ChartAccessor<Datum, Value>,
  message: string,
): ChartResult<Value> {
  try {
    return chartOK(accessor(datum));
  } catch {
    return invalidAccessor(message);
  }
}

function validScaleKind(value: unknown): value is ChartScaleKind {
  return value === 'linear' || value === 'logarithmic' || value === 'temporal' || value === 'categorical';
}

function validCategory(value: unknown): value is ChartCategory {
  return typeof value === 'string' ? value.length > 0 : typeof value === 'number' && Number.isFinite(value);
}

function validAggregateReduction(value: unknown): value is ChartAggregateReduction {
  return value === 'density' || value === 'sum' || value === 'mean' || value === 'minimum' || value === 'maximum';
}

function validAggregateBounds(value: unknown): value is ChartAggregateBounds {
  if (value === null || typeof value !== 'object') return false;
  const bounds = value as Partial<ChartAggregateBounds>;
  return typeof bounds.minimumX === 'number' && Number.isFinite(bounds.minimumX)
    && typeof bounds.maximumX === 'number' && Number.isFinite(bounds.maximumX)
    && typeof bounds.minimumY === 'number' && Number.isFinite(bounds.minimumY)
    && typeof bounds.maximumY === 'number' && Number.isFinite(bounds.maximumY)
    && bounds.minimumX <= bounds.maximumX
    && bounds.minimumY <= bounds.maximumY;
}

function finiteIncreasing(minimum: unknown, maximum: unknown): minimum is number {
  return typeof minimum === 'number' && Number.isFinite(minimum)
    && typeof maximum === 'number' && Number.isFinite(maximum)
    && minimum < maximum;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function invalidAccessor<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-accessor-invalid', message);
}

function invalidAxis<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-axis-invalid', message);
}

function invalidAggregate<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-aggregate-invalid', message);
}

function invalidCoordinate<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-coordinate-invalid', message);
}

function invalidDomain<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-domain-invalid', message);
}

function invalidView<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-view-invalid', message);
}

import type { StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import type { UnitID } from '@sectile/core/units';
import type {
  ChartAxisDomain,
  ChartAxisOrientation,
  ChartAxisView,
  ChartAxisValue,
  ChartCategory,
  ChartViewState,
  NormalizedChartAxisDefinition,
  NormalizedChartCartesianCoordinateDefinition,
} from './contract.js';
import { chartFail, chartOK } from './internal/result.js';
import type { ChartViewport } from './projection.js';
import type { ChartResult } from './result.js';
import {
  createCategoricalScale,
  createLinearScale,
  createLogarithmicScale,
  createTemporalScale,
  type ChartRange,
  type ChartScale,
  type ChartScaleKind,
  type ChartTick,
} from './scale.js';

export type ResolvedChartAxisDomain = Exclude<ChartAxisDomain, 'auto'>;

export interface ChartAxisObservations<ID extends StableID = StableID> {
  readonly axisID: ID;
  readonly values: readonly ChartAxisValue[];
}

export interface ResolvedChartAxis<ID extends StableID = StableID> {
  readonly id: ID;
  readonly orientation: ChartAxisOrientation;
  readonly scale: ChartScaleKind;
  readonly domain: ResolvedChartAxisDomain;
  readonly ticks: number;
  readonly label?: string;
  readonly unit?: UnitID;
}

export interface ChartPlotInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface ChartPlotRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ChartScaleDescriptor<ID extends StableID = StableID> {
  readonly axisID: ID;
  readonly orientation: ChartAxisOrientation;
  readonly kind: ChartScaleKind;
  readonly domain: ResolvedChartAxisDomain;
  readonly geometryDomain: Readonly<{ minimum: number; maximum: number }>;
  readonly range: ChartRange;
}

export interface ChartAxisLayout<ID extends StableID = StableID> {
  readonly axis: ResolvedChartAxis<ID>;
  readonly descriptor: ChartScaleDescriptor<ID>;
  readonly scale: ChartScale;
  readonly ticks: readonly ChartTick[];
}

export interface ChartPlotLayout<ID extends StableID = StableID> {
  readonly viewport: ChartViewport;
  readonly insets: ChartPlotInsets;
  readonly plot: ChartPlotRect;
  readonly axes: readonly ChartAxisLayout<ID>[];
}

export const DEFAULT_CHART_PLOT_INSETS: ChartPlotInsets = Object.freeze({
  top: 16,
  right: 16,
  bottom: 40,
  left: 48,
});

export function resolveChartAxes<Datum, ID extends StableID>(
  coordinate: NormalizedChartCartesianCoordinateDefinition<Datum, ID>,
  observations: readonly ChartAxisObservations<ID>[],
): readonly ResolvedChartAxis<ID>[] {
  return unwrap(tryResolveChartAxes(coordinate, observations));
}

export function tryResolveChartAxes<Datum, ID extends StableID>(
  coordinate: NormalizedChartCartesianCoordinateDefinition<Datum, ID>,
  observations: readonly ChartAxisObservations<ID>[],
): ChartResult<readonly ResolvedChartAxis<ID>[]> {
  if (coordinate === null || coordinate.kind !== 'cartesian' || !Array.isArray(observations)) {
    return invalidLayout('Cartesian axis resolution requires a normalized Cartesian coordinate and observations.');
  }
  const valuesByAxis = new Map<ID, readonly ChartAxisValue[]>();
  for (const observation of observations) {
    if (observation === null || typeof observation !== 'object' || !Array.isArray(observation.values)
      || valuesByAxis.has(observation.axisID)) {
      return invalidLayout('Chart axis observations must be unique arrays keyed by axis identity.');
    }
    valuesByAxis.set(observation.axisID, observation.values);
  }
  const resolved: ResolvedChartAxis<ID>[] = [];
  for (const axis of coordinate.axes) {
    const domain = resolveAxisDomain(axis, valuesByAxis.get(axis.id) ?? []);
    if (!domain.ok) return domain;
    resolved.push(Object.freeze({
      id: axis.id,
      orientation: axis.orientation,
      scale: axis.scale,
      domain: domain.value,
      ticks: axis.ticks ?? 0,
      ...(axis.label === undefined ? {} : { label: axis.label }),
      ...(axis.unit === undefined ? {} : { unit: axis.unit }),
    }));
  }
  return chartOK(Object.freeze(resolved));
}

export function createChartPlotLayout<ID extends StableID>(
  axes: readonly ResolvedChartAxis<ID>[],
  viewport: ChartViewport,
  insets: ChartPlotInsets = DEFAULT_CHART_PLOT_INSETS,
  view?: ChartViewState<ID>,
): ChartPlotLayout<ID> {
  return unwrap(tryCreateChartPlotLayout(axes, viewport, insets, view));
}

export function tryCreateChartPlotLayout<ID extends StableID>(
  axes: readonly ResolvedChartAxis<ID>[],
  viewport: ChartViewport,
  insets: ChartPlotInsets = DEFAULT_CHART_PLOT_INSETS,
  view?: ChartViewState<ID>,
): ChartResult<ChartPlotLayout<ID>> {
  if (!validViewport(viewport) || !validInsets(insets)) return invalidLayout('Chart layout viewport and insets must be finite and non-negative.');
  const width = viewport.width - insets.left - insets.right;
  const height = viewport.height - insets.top - insets.bottom;
  if (!(width > 0) || !(height > 0)) return invalidLayout('Chart plot insets must leave a positive plot rectangle.');
  const plot = Object.freeze({ x: insets.left, y: insets.top, width, height });
  const views = new Map(view?.axes.map((axis) => [axis.axisID, axis]) ?? []);
  const layouts: ChartAxisLayout<ID>[] = [];
  for (const baseAxis of axes) {
    const viewAxis = views.get(baseAxis.id);
    views.delete(baseAxis.id);
    const resolved = resolveVisibleAxis(baseAxis, viewAxis);
    if (!resolved.ok) return resolved;
    const axis = resolved.value;
    const range = axis.orientation === 'x'
      ? Object.freeze({ start: plot.x, end: plot.x + plot.width })
      : Object.freeze({ start: plot.y + plot.height, end: plot.y });
    const scale = scaleFor(axis, range);
    if (!scale.ok) return scale;
    const maximumTicks = axis.ticks === 0
      ? Math.max(2, Math.min(12, Math.floor((axis.orientation === 'x' ? width : height) / 72)))
      : axis.ticks;
    const ticks = scale.value.tryTicks(maximumTicks);
    if (!ticks.ok) return ticks;
    layouts.push(Object.freeze({
      axis,
      descriptor: Object.freeze({
        axisID: axis.id,
        orientation: axis.orientation,
        kind: axis.scale,
        domain: axis.domain,
        geometryDomain: geometryDomain(baseAxis, viewAxis),
        range,
      }),
      scale: scale.value,
      ticks: ticks.value,
    }));
  }
  if (views.size > 0) return invalidLayout('Chart view contains an axis outside the resolved plot.');
  return chartOK(Object.freeze({
    viewport: Object.freeze({ ...viewport }),
    insets: Object.freeze({ ...insets }),
    plot,
    axes: Object.freeze(layouts),
  }));
}

function resolveVisibleAxis<ID extends StableID>(
  axis: ResolvedChartAxis<ID>,
  view: ChartAxisView<ID> | undefined,
): ChartResult<ResolvedChartAxis<ID>> {
  if (view === undefined) return chartOK(axis);
  if (view.scale !== axis.scale || (view.orientation !== undefined && view.orientation !== axis.orientation)) {
    return invalidLayout('Chart axis view scale or orientation does not match its resolved axis.');
  }
  if (axis.domain.kind === 'categorical') {
    if (view.visible.kind !== 'categorical' || view.base.kind !== 'categorical'
      || view.base.start !== 0 || view.base.end !== axis.domain.values.length) {
      return invalidLayout('Categorical chart axis view does not match its resolved base domain.');
    }
    return chartOK(Object.freeze({
      ...axis,
      domain: Object.freeze({ kind: 'categorical' as const, values: Object.freeze(axis.domain.values.slice(view.visible.start, view.visible.end)) }),
    }));
  }
  if (view.visible.kind !== 'continuous' || view.base.kind !== 'continuous'
    || view.base.minimum !== axis.domain.minimum || view.base.maximum !== axis.domain.maximum) {
    return invalidLayout('Continuous chart axis view does not match its resolved base domain.');
  }
  return chartOK(Object.freeze({
    ...axis,
    domain: Object.freeze({ kind: axis.domain.kind, minimum: view.visible.minimum, maximum: view.visible.maximum }),
  }));
}

function geometryDomain<ID extends StableID>(
  axis: ResolvedChartAxis<ID>,
  view: ChartAxisView<ID> | undefined,
): Readonly<{ minimum: number; maximum: number }> {
  if (view !== undefined) return view.visible.kind === 'categorical'
    ? Object.freeze({ minimum: view.visible.start, maximum: view.visible.end })
    : Object.freeze({ minimum: view.visible.minimum, maximum: view.visible.maximum });
  return axis.domain.kind === 'categorical'
    ? Object.freeze({ minimum: 0, maximum: axis.domain.values.length })
    : Object.freeze({ minimum: axis.domain.minimum, maximum: axis.domain.maximum });
}

function resolveAxisDomain<Datum, ID extends StableID>(
  axis: NormalizedChartAxisDefinition<Datum, ID>,
  values: readonly ChartAxisValue[],
): ChartResult<ResolvedChartAxisDomain> {
  if (axis.domain !== 'auto') {
    if (axis.domain.kind === 'categorical') {
      const declared = new Set<ChartCategory>(axis.domain.values);
      for (const value of values) if (!declared.has(value as ChartCategory)) {
        return invalidDomain(axis.id, 'Observed category is outside the declared axis domain.');
      }
    } else {
      for (const value of values) if (typeof value !== 'number' || !Number.isFinite(value)
        || (axis.scale === 'logarithmic' && value <= 0)) {
        return invalidDomain(axis.id, 'Observed value is incompatible with the declared continuous axis domain.');
      }
    }
    return chartOK(axis.domain);
  }
  if (axis.scale === 'categorical') {
    const categories: ChartCategory[] = [];
    const seen = new Set<ChartCategory>();
    for (const value of values) {
      if (!validCategory(value)) return invalidDomain(axis.id, 'Categorical axis observations must be finite numbers or non-empty strings.');
      if (!seen.has(value)) { seen.add(value); categories.push(value); }
    }
    return categories.length === 0
      ? invalidDomain(axis.id, 'Automatic categorical domains require at least one observed category.')
      : chartOK(Object.freeze({ kind: 'categorical', values: Object.freeze(categories) }));
  }
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value) || (axis.scale === 'logarithmic' && value <= 0)) {
      return invalidDomain(axis.id, 'Continuous axis observations must be finite and compatible with their scale.');
    }
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  if (minimum === Number.POSITIVE_INFINITY) {
    minimum = axis.scale === 'logarithmic' ? 1 : 0;
    maximum = axis.scale === 'logarithmic' ? 10 : 1;
  } else if (minimum === maximum) {
    if (axis.scale === 'logarithmic') { minimum /= 10; maximum *= 10; }
    else { minimum -= 0.5; maximum += 0.5; }
  }
  return chartOK(Object.freeze({
    kind: axis.scale === 'temporal' ? 'temporal' as const : 'numeric' as const,
    minimum,
    maximum,
  }));
}

function scaleFor<ID extends StableID>(
  axis: ResolvedChartAxis<ID>,
  range: ChartRange,
): ChartResult<ChartScale> {
  if (axis.domain.kind === 'categorical') return chartOK(createCategoricalScale({ values: axis.domain.values }, range));
  const domain = { minimum: axis.domain.minimum, maximum: axis.domain.maximum };
  if (axis.scale === 'logarithmic') return chartOK(createLogarithmicScale(domain, range));
  if (axis.scale === 'temporal') return chartOK(createTemporalScale(domain, range));
  return chartOK(createLinearScale(domain, range));
}

function invalidDomain<ID extends StableID, T>(axisID: ID, message: string): ChartResult<T> {
  return chartFail('construction', 'chart-domain-invalid', message, { axisID });
}

function invalidLayout<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-layout-invalid', message);
}

function validViewport(value: ChartViewport): boolean {
  return value !== null && typeof value === 'object'
    && finitePositive(value.width) && finitePositive(value.height)
    && (value.devicePixelRatio === undefined || finitePositive(value.devicePixelRatio));
}

function validInsets(value: ChartPlotInsets): boolean {
  return value !== null && typeof value === 'object'
    && finiteNonNegative(value.top) && finiteNonNegative(value.right)
    && finiteNonNegative(value.bottom) && finiteNonNegative(value.left);
}

function validCategory(value: unknown): value is ChartCategory {
  return typeof value === 'string' ? value.length > 0 : typeof value === 'number' && Number.isFinite(value);
}

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

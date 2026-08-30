import { unwrap } from '@sectile/core/result';
import { chartFail, chartOK } from './internal/result.js';
import type { ChartResult } from './result.js';

export type ChartScaleKind = 'linear' | 'logarithmic' | 'temporal' | 'categorical';

export interface ChartNumericDomain {
  readonly minimum: number;
  readonly maximum: number;
}

export interface ChartCategoricalDomain {
  readonly values: readonly string[];
}

export interface ChartRange {
  readonly start: number;
  readonly end: number;
}

export interface ChartViewTransform {
  readonly xScale: number;
  readonly xOffset: number;
  readonly yScale: number;
  readonly yOffset: number;
}

export interface ChartCoordinate {
  readonly x: number;
  readonly y: number;
}

export interface ChartTick<Value extends number | string = number | string> {
  readonly value: Value;
  readonly position: number;
}

export interface ChartScale<Value extends number | string = number | string> {
  readonly kind: ChartScaleKind;
  readonly range: ChartRange;
  normalize(value: Value): number | null;
  invert(position: number): Value | null;
  ticks(maximum: number): readonly ChartTick<Value>[];
  tryTicks(maximum: number): ChartResult<readonly ChartTick<Value>[]>;
}

export const MAX_CHART_TICKS = 10_000;
export const IDENTITY_CHART_VIEW_TRANSFORM: ChartViewTransform = Object.freeze({
  xScale: 1,
  xOffset: 0,
  yScale: 1,
  yOffset: 0,
});

export function createLinearScale(domain: ChartNumericDomain, range: ChartRange): ChartScale<number> {
  return unwrap(tryCreateLinearScale(domain, range));
}

export function tryCreateLinearScale(domain: ChartNumericDomain, range: ChartRange): ChartResult<ChartScale<number>> {
  return createNumericScale('linear', domain, range, identity, identity);
}

export function createTemporalScale(domain: ChartNumericDomain, range: ChartRange): ChartScale<number> {
  return unwrap(tryCreateTemporalScale(domain, range));
}

export function tryCreateTemporalScale(domain: ChartNumericDomain, range: ChartRange): ChartResult<ChartScale<number>> {
  return createNumericScale('temporal', domain, range, identity, identity);
}

export function createLogarithmicScale(
  domain: ChartNumericDomain,
  range: ChartRange,
  base = 10,
): ChartScale<number> {
  return unwrap(tryCreateLogarithmicScale(domain, range, base));
}

export function tryCreateLogarithmicScale(
  domain: ChartNumericDomain,
  range: ChartRange,
  base = 10,
): ChartResult<ChartScale<number>> {
  if (!finite(base) || base <= 0 || base === 1) return invalidScale('Logarithmic scale base must be finite, positive, and not one.');
  if (!validNumericDomain(domain) || domain.minimum <= 0) return invalidScale('Logarithmic scale domain must be finite, increasing, and positive.');
  const denominator = Math.log(base);
  return createNumericScale(
    'logarithmic',
    domain,
    range,
    (value) => value > 0 ? Math.log(value) / denominator : Number.NaN,
    (value) => base ** value,
    base,
  );
}

export function createCategoricalScale(domain: ChartCategoricalDomain, range: ChartRange): ChartScale<string> {
  return unwrap(tryCreateCategoricalScale(domain, range));
}

export function tryCreateCategoricalScale(
  domain: ChartCategoricalDomain,
  range: ChartRange,
): ChartResult<ChartScale<string>> {
  if (!validRange(range)) return invalidScale('Chart scale range must contain finite distinct endpoints.');
  if (domain === null || typeof domain !== 'object' || !Array.isArray(domain.values) || domain.values.length === 0) {
    return invalidScale('Categorical scale domain must contain at least one value.');
  }
  const values: string[] = [];
  const indices = new Map<string, number>();
  for (const value of domain.values) {
    if (typeof value !== 'string' || value.length === 0 || indices.has(value)) {
      return invalidScale('Categorical scale values must be unique non-empty strings.');
    }
    indices.set(value, values.length);
    values.push(value);
  }
  const frozenRange = freezeRange(range);
  const frozenValues = Object.freeze(values);
  const span = frozenRange.end - frozenRange.start;
  const scale: ChartScale<string> = {
    kind: 'categorical',
    range: frozenRange,
    normalize(value: string): number | null {
      const index = indices.get(value);
      return index === undefined ? null : frozenRange.start + ((index + 0.5) / frozenValues.length) * span;
    },
    invert(position: number): string | null {
      if (!finite(position)) return null;
      const ratio = (position - frozenRange.start) / span;
      if (ratio < 0 || ratio > 1) return null;
      const index = Math.min(frozenValues.length - 1, Math.floor(ratio * frozenValues.length));
      return frozenValues[index] ?? null;
    },
    ticks(maximum: number): readonly ChartTick<string>[] {
      return unwrap(this.tryTicks(maximum));
    },
    tryTicks(maximum: number): ChartResult<readonly ChartTick<string>[]> {
      const checked = validateTickMaximum(maximum);
      if (!checked.ok) return checked;
      if (maximum === 0) return chartOK(Object.freeze([]));
      const step = Math.max(1, Math.ceil(frozenValues.length / maximum));
      const ticks: ChartTick<string>[] = [];
      for (let index = 0; index < frozenValues.length && ticks.length < maximum; index += step) {
        const value = frozenValues[index] as string;
        ticks.push(Object.freeze({ value, position: frozenRange.start + ((index + 0.5) / frozenValues.length) * span }));
      }
      return chartOK(Object.freeze(ticks));
    },
  };
  return chartOK(Object.freeze(scale));
}

export function createChartViewTransform(input: Partial<ChartViewTransform> = {}): ChartViewTransform {
  return unwrap(tryCreateChartViewTransform(input));
}

export function tryCreateChartViewTransform(input: Partial<ChartViewTransform> = {}): ChartResult<ChartViewTransform> {
  if (input === null || typeof input !== 'object') return invalidTransform('Chart view transform must be an object.');
  const value = {
    xScale: input.xScale ?? 1,
    xOffset: input.xOffset ?? 0,
    yScale: input.yScale ?? 1,
    yOffset: input.yOffset ?? 0,
  };
  if (!finite(value.xScale) || value.xScale <= 0 || !finite(value.yScale) || value.yScale <= 0
    || !finite(value.xOffset) || !finite(value.yOffset)) {
    return invalidTransform('Chart view scales must be positive finite numbers and offsets must be finite.');
  }
  return chartOK(Object.freeze(value));
}

export function transformChartCoordinate(coordinate: ChartCoordinate, transform: ChartViewTransform): ChartCoordinate {
  return Object.freeze({
    x: coordinate.x * transform.xScale + transform.xOffset,
    y: coordinate.y * transform.yScale + transform.yOffset,
  });
}

export function invertChartCoordinate(coordinate: ChartCoordinate, transform: ChartViewTransform): ChartCoordinate {
  return Object.freeze({
    x: (coordinate.x - transform.xOffset) / transform.xScale,
    y: (coordinate.y - transform.yOffset) / transform.yScale,
  });
}

export function composeChartViewTransforms(
  first: ChartViewTransform,
  second: ChartViewTransform,
): ChartViewTransform {
  return createChartViewTransform({
    xScale: first.xScale * second.xScale,
    xOffset: first.xOffset * second.xScale + second.xOffset,
    yScale: first.yScale * second.yScale,
    yOffset: first.yOffset * second.yScale + second.yOffset,
  });
}

type NumericTransform = (value: number) => number;

function createNumericScale(
  kind: 'linear' | 'logarithmic' | 'temporal',
  domain: ChartNumericDomain,
  range: ChartRange,
  forward: NumericTransform,
  backward: NumericTransform,
  logBase?: number,
): ChartResult<ChartScale<number>> {
  if (!validNumericDomain(domain)) return invalidScale('Numeric scale domain must contain finite increasing bounds.');
  if (!validRange(range)) return invalidScale('Chart scale range must contain finite distinct endpoints.');
  const transformedMinimum = forward(domain.minimum);
  const transformedMaximum = forward(domain.maximum);
  if (!finite(transformedMinimum) || !finite(transformedMaximum) || transformedMinimum === transformedMaximum) {
    return invalidScale('Chart scale domain cannot be transformed into finite distinct bounds.');
  }
  const frozenRange = freezeRange(range);
  const domainSpan = transformedMaximum - transformedMinimum;
  const rangeSpan = frozenRange.end - frozenRange.start;
  const scale: ChartScale<number> = {
    kind,
    range: frozenRange,
    normalize(value: number): number | null {
      if (!finite(value)) return null;
      const transformed = forward(value);
      return finite(transformed) ? frozenRange.start + ((transformed - transformedMinimum) / domainSpan) * rangeSpan : null;
    },
    invert(position: number): number | null {
      if (!finite(position)) return null;
      const transformed = transformedMinimum + ((position - frozenRange.start) / rangeSpan) * domainSpan;
      const value = backward(transformed);
      return finite(value) ? value : null;
    },
    ticks(maximum: number): readonly ChartTick<number>[] {
      return unwrap(this.tryTicks(maximum));
    },
    tryTicks(maximum: number): ChartResult<readonly ChartTick<number>[]> {
      const checked = validateTickMaximum(maximum);
      if (!checked.ok) return checked;
      if (maximum === 0) return chartOK(Object.freeze([]));
      return chartOK(kind === 'logarithmic'
        ? logarithmicTicks(domain, frozenRange, maximum, logBase as number)
        : uniformTicks(domain, frozenRange, maximum));
    },
  };
  return chartOK(Object.freeze(scale));
}

function uniformTicks(domain: ChartNumericDomain, range: ChartRange, maximum: number): readonly ChartTick<number>[] {
  if (maximum === 1) return Object.freeze([Object.freeze({ value: domain.minimum, position: range.start })]);
  const ticks: ChartTick<number>[] = [];
  for (let index = 0; index < maximum; index += 1) {
    const ratio = index / (maximum - 1);
    ticks.push(Object.freeze({
      value: domain.minimum + (domain.maximum - domain.minimum) * ratio,
      position: range.start + (range.end - range.start) * ratio,
    }));
  }
  return Object.freeze(ticks);
}

function logarithmicTicks(
  domain: ChartNumericDomain,
  range: ChartRange,
  maximum: number,
  base: number,
): readonly ChartTick<number>[] {
  const logarithm = (value: number): number => Math.log(value) / Math.log(base);
  const startExponent = Math.ceil(logarithm(domain.minimum) - 1e-12);
  const endExponent = Math.floor(logarithm(domain.maximum) + 1e-12);
  const candidateCount = Math.max(0, endExponent - startExponent + 1);
  if (candidateCount === 0 || candidateCount > maximum) return uniformLogTicks(domain, range, maximum, base);
  const ticks: ChartTick<number>[] = [];
  const domainStart = logarithm(domain.minimum);
  const domainSpan = logarithm(domain.maximum) - domainStart;
  for (let exponent = startExponent; exponent <= endExponent; exponent += 1) {
    const value = base ** exponent;
    const ratio = (exponent - domainStart) / domainSpan;
    ticks.push(Object.freeze({ value, position: range.start + (range.end - range.start) * ratio }));
  }
  return Object.freeze(ticks);
}

function uniformLogTicks(
  domain: ChartNumericDomain,
  range: ChartRange,
  maximum: number,
  base: number,
): readonly ChartTick<number>[] {
  if (maximum === 1) return Object.freeze([Object.freeze({ value: domain.minimum, position: range.start })]);
  const minimum = Math.log(domain.minimum) / Math.log(base);
  const span = Math.log(domain.maximum) / Math.log(base) - minimum;
  const ticks: ChartTick<number>[] = [];
  for (let index = 0; index < maximum; index += 1) {
    const ratio = index / (maximum - 1);
    ticks.push(Object.freeze({
      value: base ** (minimum + span * ratio),
      position: range.start + (range.end - range.start) * ratio,
    }));
  }
  return Object.freeze(ticks);
}

function validateTickMaximum(maximum: number): ChartResult<true> {
  return Number.isSafeInteger(maximum) && maximum >= 0 && maximum <= MAX_CHART_TICKS
    ? chartOK(true)
    : chartFail('resource-rejection', 'chart-tick-ceiling-exceeded', 'Chart tick maximum is invalid or exceeds its ceiling.', {
      maximum,
      ceiling: MAX_CHART_TICKS,
    });
}

function validNumericDomain(value: ChartNumericDomain): boolean {
  return value !== null && typeof value === 'object'
    && finite(value.minimum) && finite(value.maximum) && value.minimum < value.maximum;
}

function validRange(value: ChartRange): boolean {
  return value !== null && typeof value === 'object'
    && finite(value.start) && finite(value.end) && value.start !== value.end;
}

function freezeRange(range: ChartRange): ChartRange {
  return Object.freeze({ start: range.start, end: range.end });
}

function invalidScale<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-scale-invalid', message);
}

function invalidTransform<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-view-transform-invalid', message);
}

function identity(value: number): number { return value; }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }

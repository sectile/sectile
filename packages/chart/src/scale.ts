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
}

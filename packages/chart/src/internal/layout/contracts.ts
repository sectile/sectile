import type { ChartAxisDomain, ChartAxisOrientation, ChartAxisValue } from '../../contract.js';
import type { ChartRange, ChartScale, ChartScaleKind, ChartTick } from '../../scale.js';
import type { StableID } from '@sectile/core';
import type { UnitID } from '@sectile/core/units';

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
  readonly geometryScale: ChartScale<number>;
  readonly ticks: readonly ChartTick[];
}

export interface ChartPlotLayout<ID extends StableID = StableID> {
  readonly viewport: ChartViewport;
  readonly insets: ChartPlotInsets;
  readonly plot: ChartPlotRect;
  readonly axes: readonly ChartAxisLayout<ID>[];
}

export interface ChartViewport {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio?: number;
}

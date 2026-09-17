import type { StableID } from '@sectile/core';

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

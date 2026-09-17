import type {
  ChartCoordinateDefinition,
  ChartHeatmapReduction,
  ChartLayerDefinition,
  NormalizedChartCoordinateDefinition,
} from '../../contract.js';
import type { ResolvedChartAxis } from '../layout/contracts.js';
import type { ChartModelState, ChartProfile } from '../model/contracts.js';
import type { StableID } from '@sectile/core';

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

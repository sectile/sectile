import type { StableID } from '@sectile/core';
import type { ChartProfile } from './model.js';

export interface ChartViewport {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio?: number;
}

export interface ChartPointBatch {
  readonly type: 'point';
  readonly positions: Float32Array;
  readonly identityIndices: Uint32Array;
}

export interface ChartPolylineBatch {
  readonly type: 'polyline';
  readonly positions: Float32Array;
  readonly offsets: Uint32Array;
  readonly identityIndices: Uint32Array;
}

export interface ChartRectangleBatch {
  readonly type: 'rectangle';
  readonly rectangles: Float32Array;
  readonly identityIndices: Uint32Array;
}

export interface ChartCellBatch {
  readonly type: 'cell';
  readonly cells: Float32Array;
  readonly identityIndices: Uint32Array;
}

export interface ChartArcBatch {
  readonly type: 'arc';
  readonly arcs: Float32Array;
  readonly identityIndices: Uint32Array;
}

export type ChartProjectionBatch =
  | ChartPointBatch
  | ChartPolylineBatch
  | ChartRectangleBatch
  | ChartCellBatch
  | ChartArcBatch;

export interface ChartProjectionDiagnostics {
  readonly sourceDatums: number;
  readonly representedDatums: number;
  readonly emittedPrimitives: number;
}

export interface ChartProjection<ID extends StableID = StableID> {
  readonly generation: number;
  readonly profile: ChartProfile | 'layered';
  readonly viewport: ChartViewport;
  readonly identities: readonly ID[];
  readonly batches: readonly ChartProjectionBatch[];
  readonly diagnostics: ChartProjectionDiagnostics;
}

export interface ChartProjectionInput {
  readonly viewport: ChartViewport;
  readonly maximumRepresentatives?: number;
}

import type { StableID } from '@sectile/core';
import type { ChartLimits, ChartProfile } from '../model.js';

export interface PackedChartLayer<ID extends StableID = StableID> {
  readonly id: ID;
  readonly profile: ChartProfile;
  readonly identityIndices: Uint32Array;
  readonly values: Float64Array;
  readonly stride: number;
}

export interface ChartCartesianBounds {
  readonly hasValues: boolean;
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumY: number;
  readonly maximumY: number;
}

export interface ChartModelData<ID extends StableID = StableID> {
  readonly limits: Required<ChartLimits>;
  readonly identityIndex: ReadonlyMap<ID, number>;
  readonly layerIndex: ReadonlyMap<ID, number>;
  readonly locations: Uint32Array;
  readonly layers: readonly PackedChartLayer<ID>[];
  readonly cartesianBounds: ChartCartesianBounds;
}

const modelData = new WeakMap<object, ChartModelData>();

export function bindChartModelData<ID extends StableID>(owner: object, data: ChartModelData<ID>): void {
  modelData.set(owner, data);
}

export function getChartModelData<ID extends StableID>(owner: object): ChartModelData<ID> {
  const data = modelData.get(owner);
  if (data === undefined) throw new Error('Chart model data is unavailable.');
  return data as ChartModelData<ID>;
}

import type { StableID } from '@sectile/core';
import type { Sequence } from '@sectile/core/sequence';
import {
  materializePackedLayerValues,
  type ChartLayerBounds,
  type ChartProfileIndex,
  type PackedChartLayerOwner,
} from './layer-owner.js';
import type { ChartLimits, ChartProfile } from '../model.js';

export interface PackedChartLayer<ID extends StableID = StableID> {
  readonly id: ID;
  readonly profile: ChartProfile;
  readonly identityIndices: Uint32Array;
  readonly identityOffset: number;
  readonly values: Float64Array;
  readonly stride: number;
  readonly owner: PackedChartLayerOwner<ID>;
  readonly index: ChartProfileIndex;
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
  readonly identities: Sequence<ID>;
  readonly layerIndex: ReadonlyMap<ID, number>;
  readonly layers: readonly PackedChartLayer<ID>[];
  readonly cartesianBounds: ChartCartesianBounds;
}

const modelData = new WeakMap<object, ChartModelData>();
const localIdentityIndices = new WeakMap<object, Uint32Array>();
const materializedValues = new WeakMap<object, Float64Array>();

export function createPackedChartLayerView<ID extends StableID>(
  owner: PackedChartLayerOwner<ID>,
  identityOffset: number,
): PackedChartLayer<ID> {
  let identityIndices = localIdentityIndices.get(owner);
  if (identityIndices === undefined) {
    identityIndices = Uint32Array.from({ length: owner.size }, (_, index) => index);
    localIdentityIndices.set(owner, identityIndices);
  }
  const view = {
    id: owner.id,
    profile: owner.profile,
    identityIndices,
    identityOffset,
    get values(): Float64Array {
      const retained = materializedValues.get(owner);
      if (retained !== undefined) return retained;
      const values = materializePackedLayerValues(owner);
      materializedValues.set(owner, values);
      return values;
    },
    stride: owner.stride,
    owner,
    index: owner.index,
  };
  return Object.freeze(view);
}

export function chartCartesianBounds(layers: readonly PackedChartLayer[]): ChartCartesianBounds {
  let hasValues = false;
  let minimumX = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;
  for (const layer of layers) {
    const bounds: ChartLayerBounds = layer.owner.bounds;
    if (!bounds.hasValues) continue;
    hasValues = true;
    minimumX = Math.min(minimumX, bounds.minimumX);
    maximumX = Math.max(maximumX, bounds.maximumX);
    minimumY = Math.min(minimumY, bounds.minimumY);
    maximumY = Math.max(maximumY, bounds.maximumY);
  }
  return Object.freeze({ hasValues, minimumX, maximumX, minimumY, maximumY });
}

export function bindChartModelData<ID extends StableID>(owner: object, data: ChartModelData<ID>): void {
  modelData.set(owner, data);
}

export function getChartModelData<ID extends StableID>(owner: object): ChartModelData<ID> {
  const data = modelData.get(owner);
  if (data === undefined) throw new Error('Chart model data is unavailable.');
  return data as ChartModelData<ID>;
}

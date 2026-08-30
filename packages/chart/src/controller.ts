import type { Result, StableID } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { ChartLimits, ChartModel, ChartPatch } from './model.js';
import type { ChartProjection, ChartProjectionInput } from './projection.js';
import type { ChartCommand, ChartControlledValues, ChartEvent, ChartState } from './interaction.js';

export interface ChartControllerOptions<ID extends StableID = StableID> {
  readonly model: ChartModel<ID>;
  readonly limits?: ChartLimits;
  readonly controlled?: ChartControlledValues<ID>;
}

export interface ChartUpdate<ID extends StableID = StableID> {
  readonly snapshot: RevisionSnapshot<ChartState<ID>>;
  readonly commands: readonly ChartCommand<ID>[];
}

export interface ChartController<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<ChartState<ID>>;
  replaceModel(model: ChartModel<ID>, expectedRevision?: number): Result<RevisionSnapshot<ChartState<ID>>>;
  applyPatch(patch: ChartPatch<ID>, expectedRevision?: number): Result<RevisionSnapshot<ChartState<ID>>>;
  syncControlledValues(values: ChartControlledValues<ID>): Result<RevisionSnapshot<ChartState<ID>>>;
  dispatch(event: ChartEvent<ID>, expectedRevision?: number): Result<ChartUpdate<ID>>;
  project(input: ChartProjectionInput): Result<ChartProjection<ID>>;
}

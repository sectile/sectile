import type { StableID } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { ChartController, ChartControllerOptions } from '@sectile/chart/controller';
import type { ChartControlledValues, ChartSelection, ChartState } from '@sectile/chart/interaction';
import type { ChartPatch } from '@sectile/chart/model';
import type { ChartProjection } from '@sectile/chart/projection';
import type { ChartViewTransform } from '@sectile/chart/scale';
import type { DOMChartConnection, DOMChartOptions } from '@sectile/dom/chart';
import type { ShallowRef } from 'vue';

export interface UseChartOptions<ID extends StableID = StableID> extends ChartControllerOptions<ID> {
  readonly controlled?: ChartControlledValues<ID>;
}

export interface UseChartResult<ID extends StableID = StableID> {
  readonly controller: ChartController<ID>;
  readonly snapshot: ShallowRef<RevisionSnapshot<ChartState<ID>>>;
  readonly projection: ShallowRef<ChartProjection<ID> | null>;
  replaceModel: ChartController<ID>['replaceModel'];
  applyPatch(patch: ChartPatch<ID>): ReturnType<ChartController<ID>['applyPatch']>;
}

export interface ChartContext<ID extends StableID = StableID> extends UseChartResult<ID> {
  readonly connection: ShallowRef<DOMChartConnection<ID> | null>;
}

export interface ChartRootProps<ID extends StableID = StableID> {
  readonly controller?: ChartController<ID>;
  readonly options?: UseChartOptions<ID>;
  readonly value?: ChartSelection<ID>;
  readonly cursor?: ID | null;
  readonly viewTransform?: ChartViewTransform;
  readonly dom?: Omit<DOMChartOptions<ID>, 'root' | 'canvas' | 'controller'>;
}

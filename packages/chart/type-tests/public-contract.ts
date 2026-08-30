import type { StableID } from '@sectile/core';
import type { UnitID, UnitSystemDefinition } from '@sectile/core/units';
import type { ChartController } from '@sectile/chart/controller';
import {
  createChartViewState,
  normalizeChartCoordinate,
  normalizeChartRepresentative,
  normalizeChartTemporalValue,
  resolveChartIdentity,
  resolveChartValue,
  type ChartLineLayerDefinition,
} from '@sectile/chart/contract';
import type { ChartModel } from '@sectile/chart/model';

const stringID: StableID = 'datum';
const numericID: StableID = 1;
void stringID;
void numericID;

// @ts-expect-error StableID excludes bigint identities.
const bigintID: StableID = 1n;
void bigintID;

const unitID: UnitID = 'meter';
const unitSystem: UnitSystemDefinition = { id: 'metric', preferences: [] };
void unitID;
void unitSystem;

// @ts-expect-error UnitID remains textual.
const numericUnitID: UnitID = 1;
void numericUnitID;

// @ts-expect-error Unit-system identifiers remain textual.
const numericUnitSystem: UnitSystemDefinition = { id: 1, preferences: [] };
void numericUnitSystem;

const mixedModel: ChartModel<1 | '1'> = {
  layers: [{ id: 1, profile: 'point', data: [{ id: '1', x: 0, y: 0 }] }],
};
declare const controller: ChartController<1 | '1'>;
controller.replaceModel(mixedModel);
controller.dispatch({ type: 'set-cursor', id: 1 });
controller.dispatch({ type: 'set-cursor', id: '1' });

interface RevenueDatum {
  readonly id: number;
  readonly observedAt: Date;
  readonly metrics: { readonly revenue: number };
}

const revenue: readonly RevenueDatum[] = [{
  id: 1,
  observedAt: new Date(0),
  metrics: { revenue: 10 },
}];
const line: ChartLineLayerDefinition<RevenueDatum, number | string> = {
  id: 'revenue',
  kind: 'line',
  data: revenue,
  xAxis: 'time',
  yAxis: 2,
  getX: (datum) => datum.observedAt,
  getY: (datum) => datum.metrics.revenue,
};
void line;

const coordinate = normalizeChartCoordinate<RevenueDatum, number | string>({
  kind: 'cartesian',
  axes: [
    { id: 'time', orientation: 'x', scale: 'temporal', field: 'observedAt' },
    { id: 2, orientation: 'y', scale: 'linear', getValue: (datum) => datum.metrics.revenue },
  ],
});
void coordinate;

const temporalFromDate: number = normalizeChartTemporalValue(new Date(1));
const temporalFromEpoch: number = normalizeChartTemporalValue(1);
const inferredID: number = resolveChartIdentity(revenue[0]);
const nestedValue = resolveChartValue(revenue[0], {
  kind: 'numeric',
  canonicalField: 'y',
  getValue: (datum) => datum.metrics.revenue,
});
void temporalFromDate;
void temporalFromEpoch;
void inferredID;
void nestedValue;

const aggregate = normalizeChartRepresentative({
  kind: 'aggregate',
  reduction: 'density',
  count: 10,
  bounds: { minimumX: 0, maximumX: 1, minimumY: 0, maximumY: 1 },
});
void aggregate;

const view = createChartViewState<number | string>([
  {
    axisID: 'time',
    scale: 'temporal',
    base: { kind: 'continuous', minimum: 0, maximum: 10 },
    visible: { kind: 'continuous', minimum: 2, maximum: 8 },
    revision: 0,
  },
  {
    axisID: 2,
    scale: 'linear',
    base: { kind: 'continuous', minimum: 0, maximum: 100 },
    visible: { kind: 'continuous', minimum: 0, maximum: 100 },
    revision: 0,
  },
]);
void view;

// @ts-expect-error Temporal strings are intentionally outside the public temporal input contract.
normalizeChartTemporalValue('2026-01-01');

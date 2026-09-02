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
import { replaceChartLayer, type ChartModel } from '@sectile/chart/model';
import { createChartDefinition, replaceChartDefinition } from '@sectile/chart/definition';
import { cloneChartProjection, createChartProjection } from '@sectile/chart/projection';
import { hitTestChartProjection, inspectChartProjectionHitTest } from '@sectile/chart/query';
import { createContinuousColorScale, createOrdinalColorScale } from '@sectile/chart/scale';
import { createChartAxisViewState, reduceChartViewAction } from '@sectile/chart/view';

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
controller.subscribeSnapshots((snapshot) => {
  snapshot.state.cursor satisfies 1 | '1' | null;
});
declare const modelState: ReturnType<typeof controller.getModel>;
replaceChartLayer(modelState, mixedModel.layers[0]!);

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
const inferredID: number = resolveChartIdentity(revenue[0]!);
const nestedValue = resolveChartValue(revenue[0]!, {
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

const semantic = createChartDefinition<RevenueDatum, StableID>({
  coordinate: { kind: 'cartesian', axes: [
    { id: 'time', orientation: 'x', scale: 'temporal', field: 'observedAt' },
    { id: 2, orientation: 'y', scale: 'linear', getValue: (datum: RevenueDatum) => datum.metrics.revenue },
  ] },
  layers: [{ id: 'revenue', kind: 'line', xAxis: 'time', yAxis: 2, data: revenue }],
});
const semanticNext = replaceChartDefinition<RevenueDatum, StableID>(semantic, {
  coordinate: { kind: 'cartesian', axes: [
    { id: 'time', orientation: 'x', scale: 'temporal', field: 'observedAt' },
    { id: 2, orientation: 'y', scale: 'linear', getValue: (datum: RevenueDatum) => datum.metrics.revenue },
  ] },
  layers: [{ id: 'revenue', kind: 'line', xAxis: 'time', yAxis: 2, data: revenue }],
});
const temporalAxis = semantic.axes[0]!;
const semanticView = createChartAxisViewState<StableID>(semantic.axes, [{
  axisID: 'time',
  initial: { kind: 'continuous', minimum: temporalAxis.domain.kind === 'temporal' ? temporalAxis.domain.minimum : 0, maximum: temporalAxis.domain.kind === 'temporal' ? temporalAxis.domain.maximum : 1 },
  update: 'follow-end',
}]);
const zoomed = reduceChartViewAction(semanticView, {
  type: 'zoom-axis-view', axisID: 'time', factor: 2, anchor: 0.5,
});
if (!zoomed.ok) throw new TypeError(zoomed.error.message);
const zoomedView = zoomed.value.state;
const semanticProjection = createChartProjection(semanticNext, { viewport: { width: 640, height: 320 }, view: zoomedView });
const mutableProjection = cloneChartProjection(semanticProjection);
mutableProjection.batches[0]!.positions[0] = 0;
void semanticProjection.dataBatches;
void mutableProjection;
const semanticHits = hitTestChartProjection(semanticProjection, { x: 100, y: 100, radius: 40, maximumHits: 1 });
semanticHits[0]?.kind satisfies 'datum' | 'aggregate' | undefined;
const inspectedHits = inspectChartProjectionHitTest(semanticProjection, { x: 100, y: 100 });
inspectedHits.diagnostics.visitedIndexNodes satisfies number;

const continuousColor = createContinuousColorScale({ minimum: 0, maximum: 1 }, [
  { offset: 0, color: [0, 0, 0, 1] }, { offset: 1, color: [1, 1, 1, 1] },
]);
const ordinalColor = createOrdinalColorScale<number | string>([[1, 0, 0, 1], [0, 0, 1, 1]]);
void continuousColor.color(0.5);
void ordinalColor.color(1);
void ordinalColor.color('1');

// @ts-expect-error Temporal strings are intentionally outside the public temporal input contract.
normalizeChartTemporalValue('2026-01-01');

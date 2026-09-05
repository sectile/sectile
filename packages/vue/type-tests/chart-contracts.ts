import type { ChartDefinition } from '@sectile/chart/definition';
import type { ChartSelection } from '@sectile/chart/interaction';
import type { ChartError } from '@sectile/chart/result';
import type { ChartViewState } from '@sectile/chart/contract';
import {
  createChartComponents,
  useChartAxisSelector,
  useChartLayerSelector,
  useChartSelector,
} from '../.verification-dist/chart.js';
import type {
  ChartAxisProps,
  ChartCartesianLayerProps,
  ChartComponents,
  ChartDonutProps,
  ChartProviderProps,
  ChartRootProps,
  UseChartOptions,
  UseChartResult,
} from '../.verification-dist/chart.js';
import type { VirtualListIDResolver } from '../.verification-dist/virtual-list.js';

type ID = 1 | 2 | 'time' | 'value' | 'series';
type Datum = { readonly id: 1 | 2; readonly recordedAt: Date | number; readonly amount: number };

declare const options: UseChartOptions<ID>;
declare const result: UseChartResult<ID>;
declare const props: ChartRootProps<ID>;
declare const provider: ChartProviderProps<ID>;
declare const projectionError: ChartError;

options.cursor?.value satisfies ID | null | undefined;
result.controller.dispatch({ type: 'set-cursor', id: 1 });
props.cursor satisfies ID | null | undefined;
props.view satisfies ChartViewState<ID> | null | undefined;
props.dom?.onProjectionError?.(projectionError);
provider.controller satisfies UseChartResult<ID>['controller'];
const components: ChartComponents<ID> = createChartComponents(result.controller);
components.Root satisfies ChartComponents<ID>['Root'];
void useChartSelector<ID, ID | null>((state) => state?.cursor ?? null);
void useChartLayerSelector<ID, string | null>('series', (layer) => layer?.kind ?? null);
void useChartAxisSelector<ID, string | null>('time', (value) => value?.scale ?? null);

const axis: ChartAxisProps<'time'> = { id: 'time', scale: 'temporal', field: 'recordedAt' };
const line: ChartCartesianLayerProps<Datum, ID> = {
  id: 'series', data: [{ id: 1, recordedAt: new Date(0), amount: 4 }], xAxis: 'time', yAxis: 'value',
};
const donut: ChartDonutProps<{ readonly id: number; readonly value: number }, number> = {
  id: 1, data: [{ id: 2, value: 4 }], innerRadius: 0.5,
};
void axis; void line; void donut;

const definition = {
  coordinate: { kind: 'cartesian', axes: [
    { id: 'time', orientation: 'x', scale: 'temporal', field: 'recordedAt' },
    { id: 'value', orientation: 'y', scale: 'linear', field: 'amount' },
  ] },
  layers: [{ kind: 'line', id: 'series', data: line.data, xAxis: 'time', yAxis: 'value' }],
} satisfies ChartDefinition<Datum, ID>;
const headless: UseChartOptions<ID> = { definition, defaultSelection: { type: 'points', ids: [] } };
void headless;

declare const selection: ChartSelection<ID>;
selection satisfies ChartSelection<ID>;
const temporalAccessor: NonNullable<ChartCartesianLayerProps<Datum, ID>['getX']> = (datum) => datum.recordedAt;
void temporalAccessor;

const stringID: VirtualListIDResolver<{ readonly id: number }, string> = (value) => String(value.id);
const numericID: VirtualListIDResolver<{ readonly id: number }, number> = (value) => value.id;
void stringID;
void numericID;

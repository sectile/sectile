import { createChartController } from '@sectile/chart/controller';
import { createChartDefinition } from '@sectile/chart/definition';
import { hitTestChartProjection } from '@sectile/chart/query';

const definition = {
  coordinate: { kind: 'cartesian' as const, axes: [
    { id: 'time', orientation: 'x' as const, scale: 'temporal' as const, field: 'time' },
    { id: 2, orientation: 'y' as const, scale: 'linear' as const, field: 'value' },
  ] },
  layers: [{
    id: 'revenue', kind: 'line' as const, xAxis: 'time', yAxis: 2,
    data: [{ id: 1, time: new Date(0), value: 4 }, { id: '2', time: 1_000, value: 8 }],
  }],
};

const normalized = createChartDefinition(definition);
const controller = createChartController({ definition, viewCapabilities: [{ axisID: 'time' }] });
controller.applyPatch({ operations: [] });
controller.dispatch({ type: 'zoom-axis-view', axisID: 'time', factor: 2 });
const projection = controller.project({ viewport: { width: 640, height: 320 } });
if (projection.ok) hitTestChartProjection(projection.value, { x: 10, y: 10 });
normalized.model.size satisfies number;
controller.dispose();

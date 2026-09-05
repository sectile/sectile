import {
  createDOMChart,
  normalizeDOMChartNavigation,
  tryCreateDOMChart,
  tryNormalizeDOMChartNavigation,
} from '@sectile/dom/chart';
import type { ChartError, ChartErrorCode } from '@sectile/chart/result';
import type { DOMChartConnection, DOMChartNavigation, DOMChartOptions } from '@sectile/dom/chart';

declare const options: DOMChartOptions<1 | '1'>;
declare const connection: DOMChartConnection<1 | '1'>;
declare const projectionError: ChartError;

options.controller.dispatch({ type: 'set-cursor', id: 1 });
options.controller.dispatch({ type: 'set-cursor', id: '1' });
connection.controller.dispatch({ type: 'set-active', id: 1 });
options.onProjectionError?.(projectionError);
createDOMChart(options).refresh();
const created = tryCreateDOMChart(options);
if (!created.ok) created.error.code satisfies ChartErrorCode;
const navigation: DOMChartNavigation<1 | '1'> = {
  axes: [1, '1'], drag: 'zoom-region', wheel: 'zoom', wheelModifier: 'control', pinch: true, keyboard: true,
  controlAlternative: 'external',
};
normalizeDOMChartNavigation(navigation);
tryNormalizeDOMChartNavigation(navigation);
connection.setNavigation(navigation);

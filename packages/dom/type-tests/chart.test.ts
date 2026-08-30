import { createDOMChart, tryCreateDOMChart } from '@sectile/dom/chart';
import type { DOMChartConnection, DOMChartOptions } from '@sectile/dom/chart';

declare const options: DOMChartOptions<1 | '1'>;
declare const connection: DOMChartConnection<1 | '1'>;

options.controller.dispatch({ type: 'set-cursor', id: 1 });
options.controller.dispatch({ type: 'set-cursor', id: '1' });
connection.controller.dispatch({ type: 'set-active', id: 1 });
createDOMChart(options).refresh();
tryCreateDOMChart(options);

import {
  createDOMChart,
  normalizeDOMChartNavigation,
  tryCreateDOMChart,
  tryNormalizeDOMChartNavigation,
} from '@sectile/dom/chart';
import type { DOMChartConnection, DOMChartNavigation, DOMChartOptions } from '@sectile/dom/chart';

declare const options: DOMChartOptions<1 | '1'>;
declare const connection: DOMChartConnection<1 | '1'>;

options.controller.dispatch({ type: 'set-cursor', id: 1 });
options.controller.dispatch({ type: 'set-cursor', id: '1' });
connection.controller.dispatch({ type: 'set-active', id: 1 });
createDOMChart(options).refresh();
tryCreateDOMChart(options);
const navigation: DOMChartNavigation<1 | '1'> = {
  axes: [1, '1'], drag: 'zoom-region', wheel: 'zoom', wheelModifier: 'control', pinch: true, keyboard: true,
  controlAlternative: 'external',
};
normalizeDOMChartNavigation(navigation);
tryNormalizeDOMChartNavigation(navigation);
connection.setNavigation(navigation);

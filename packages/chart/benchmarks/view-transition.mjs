import { performance } from 'node:perf_hooks';
import { createChartAxisViewState, reduceChartViewAction } from '@sectile/chart/view';

const axes = Array.from({ length: 16 }, (_, index) => ({
  id: index,
  orientation: index % 2 === 0 ? 'x' : 'y',
  scale: index % 4 === 0 ? 'logarithmic' : 'linear',
  domain: { kind: 'numeric', minimum: index % 4 === 0 ? 1 : 0, maximum: 1_000 },
  ticks: 0,
}));
const view = createChartAxisViewState(axes, axes.map((axis) => ({
  axisID: axis.id,
  initial: { kind: 'continuous', minimum: axis.scale === 'logarithmic' ? 10 : 100, maximum: 900 },
})));

let state = view;
let work = 0;
const iterations = 1_000_000;
const startedAt = performance.now();
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const transition = reduceChartViewAction(state, {
    type: 'zoom-axis-view', axisID: iteration & 15, factor: iteration % 2 === 0 ? 1.0001 : 0.9999, anchor: 0.5,
  }).value;
  state = transition.state;
  work += transition.work.axisLookups + transition.work.mathOperations;
}
const elapsed = performance.now() - startedAt;
process.stdout.write(`${JSON.stringify({
  benchmark: 'chart-view-transition', iterations, axes: axes.length,
  nanosecondsPerTransition: Number((elapsed * 1_000_000 / iterations).toFixed(1)), work,
})}\n`);
